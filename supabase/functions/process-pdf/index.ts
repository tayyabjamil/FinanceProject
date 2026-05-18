/**
 * process-pdf — Supabase Edge Function
 *
 * Flow:
 *   1. Mobile calls this function with { upload_id, storage_path } after uploading a PDF
 *   2. Function authenticates the user via their JWT
 *   3. Downloads the PDF from Supabase Storage (bank-statements bucket)
 *   4. Sends the PDF to Claude API as a base64 document
 *   5. Claude extracts all transactions + AI enrichment fields as a JSON array
 *   6. Transactions are bulk-inserted into the transactions table
 *   7. pdf_uploads row is updated to done/failed with transaction count
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const EXTRACTION_PROMPT = `Extract every transaction from this bank statement PDF.

Return ONLY a valid JSON array — no markdown, no explanation, no extra text.
Each object must have exactly these fields:
- date: string, format YYYY-MM-DD
- merchant: string, raw payee name from the statement (max 60 characters)
- merchant_clean: string, human-readable merchant name e.g. "ChatGPT" not "OPENAI *CHATGPT SU", "Tesco" not "TESCO STORES 3849" (max 40 characters)
- amount: number, always positive
- type: "income" or "expense"
- category: one of exactly: food, transport, shopping, bills, rent, salary, other
- category_ai: same enum as category — your best judgement based on the merchant, may differ from category
- is_subscription: boolean, true if this looks like a recurring subscription (e.g. Netflix, Spotify, SaaS tools, gym)
- balance_after: number or null, the running account balance shown after this transaction line (null if not present in the statement)

If you are unsure of a category, use "other".
If a line is a balance, fee waiver, or non-transaction entry, skip it.

Example output:
[
  {"date":"2024-01-15","merchant":"TESCO STORES 3849","merchant_clean":"Tesco","amount":32.50,"type":"expense","category":"food","category_ai":"food","is_subscription":false,"balance_after":1204.50},
  {"date":"2024-01-16","merchant":"OPENAI *CHATGPT SUB","merchant_clean":"ChatGPT","amount":20.00,"type":"expense","category":"other","category_ai":"bills","is_subscription":true,"balance_after":null}
]`;

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Authenticate user via their JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // Service role client — bypasses RLS for DB writes
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let upload_id: string;
  let storage_path: string;

  try {
    const body = await req.json();
    upload_id = body.upload_id;
    storage_path = body.storage_path;
    if (!upload_id || !storage_path) throw new Error('missing fields');
  } catch {
    return json({ error: 'Request body must contain upload_id and storage_path' }, 400);
  }

  // Mark as processing
  await admin
    .from('pdf_uploads')
    .update({ status: 'processing' })
    .eq('id', upload_id)
    .eq('user_id', user.id);

  // --- Step 1: Download PDF from Storage ---
  const { data: fileBlob, error: downloadError } = await admin.storage
    .from('bank-statements')
    .download(storage_path);

  if (downloadError || !fileBlob) {
    await fail(admin, upload_id, 'Failed to download PDF from storage');
    return json({ error: 'Storage download failed' }, 500);
  }

  // Convert to base64
  const arrayBuffer = await fileBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Pdf = btoa(binary);

  // --- Step 2: Call Claude API ---
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Pdf,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  if (!claudeRes.ok) {
    const errText = await claudeRes.text();
    await fail(admin, upload_id, `Claude API error: ${claudeRes.status} ${errText}`);
    return json({ error: 'Claude API failed' }, 502);
  }

  const claudeData = await claudeRes.json();
  const rawText: string = claudeData.content?.[0]?.text?.trim() ?? '';

  // --- Step 3: Parse extracted transactions ---
  let transactions: Array<{
    date: string;
    merchant: string;
    merchant_clean: string;
    amount: number;
    type: string;
    category: string;
    category_ai: string;
    is_subscription: boolean;
    balance_after: number | null;
  }>;

  try {
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    transactions = JSON.parse(cleaned);
    if (!Array.isArray(transactions)) throw new Error('Not an array');
  } catch {
    await fail(admin, upload_id, `Could not parse Claude response: ${rawText.slice(0, 200)}`);
    return json({ error: 'Failed to parse Claude response' }, 500);
  }

  if (transactions.length === 0) {
    await admin
      .from('pdf_uploads')
      .update({ status: 'done', transaction_count: 0 })
      .eq('id', upload_id);
    return json({ success: true, transaction_count: 0 });
  }

  // --- Step 4: Insert into transactions table ---
  const rows = transactions.map((t) => ({
    user_id: user.id,
    type: t.type,
    amount: t.amount,
    merchant: t.merchant.slice(0, 60),  // kept as-is for backwards compat
    category: t.category,
    date: t.date,
    notes: 'Imported from PDF',
    // Provenance
    source: 'pdf_upload',
    upload_id,
    // Raw bank description — original string before any cleaning
    raw_description: t.merchant.slice(0, 60),
    // AI enrichment fields populated at extract time
    merchant_clean: t.merchant_clean?.slice(0, 40) ?? null,
    category_ai: t.category_ai ?? null,
    is_subscription: t.is_subscription ?? false,
    balance_after: t.balance_after ?? null,
    enriched_at: new Date().toISOString(),
    // Will be set to true once a dedicated enrichment pass runs (e.g. category_id lookup)
    ai_processed: false,
  }));

  const { error: insertError } = await admin
    .from('transactions')
    .upsert(rows, { onConflict: 'user_id,date,amount,raw_description', ignoreDuplicates: true });

  if (insertError) {
    await fail(admin, upload_id, `DB insert error: ${insertError.message}`);
    return json({ error: 'Failed to save transactions' }, 500);
  }

  // --- Step 5: Mark upload as done ---
  await admin
    .from('pdf_uploads')
    .update({ status: 'done', transaction_count: rows.length })
    .eq('id', upload_id);

  // --- Step 6: Enrich the inserted transactions ---
  // Calls enrich-transactions to resolve category_id, clean_merchant, subcategory,
  // is_subscription, and ai_confidence, then sets ai_processed = true on each row.
  // Non-blocking — a failure here does not affect the PDF upload success response.
  const enrichRes = await fetch(
    `${SUPABASE_URL}/functions/v1/enrich-transactions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ upload_id }),
    },
  ).catch(() => null);

  const enriched = enrichRes?.ok ? await enrichRes.json().catch(() => null) : null;

  return json({
    success: true,
    transaction_count: rows.length,
    enrichment: enriched ?? { skipped: true },
  });
});

// --- Helpers ---

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function fail(
  admin: ReturnType<typeof createClient>,
  upload_id: string,
  error_message: string,
): Promise<void> {
  await admin
    .from('pdf_uploads')
    .update({ status: 'failed', error_message })
    .eq('id', upload_id);
}
