/**
 * enrich-transactions — Supabase Edge Function
 *
 * Flow:
 *   1. Mobile/backend calls with { user_id } or { upload_id }
 *   2. Function authenticates the caller via JWT
 *   3. Fetches all transactions where ai_processed = false for that user/upload
 *   4. Fetches the full categories list (Claude must only pick from these — no new ones)
 *   5. Sends transaction descriptions + category list to Claude in batches of 50
 *   6. Claude returns JSON: category_name, clean_merchant, is_subscription, subcategory, confidence
 *   7. Each transaction is updated: category_id resolved from category_name, ai_processed = true
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category = { id: string; name: string; label: string };

type RawTransaction = {
  id: string;
  raw_description: string | null;
  merchant: string;
  amount: number;
  type: string;
};

type EnrichmentResult = {
  transaction_id: string;
  category_name: string;   // must exactly match a name in the categories table
  clean_merchant: string;
  is_subscription: boolean;
  subcategory: string | null;
  confidence: number;      // 0.0 – 1.0
};

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(transactions: RawTransaction[], categories: Category[]): string {
  const categoryList = categories
    .map((c) => `  - "${c.name}" (${c.label})`)
    .join('\n');

  const txList = transactions
    .map((t) =>
      `  {"id":"${t.id}","description":"${(t.raw_description ?? t.merchant).replace(/"/g, "'")}","amount":${t.amount},"type":"${t.type}"}`
    )
    .join(',\n');

  return `You are a financial data enrichment engine.

You will be given a list of bank transactions and a fixed list of categories.
Your job is to enrich each transaction.

RULES — read carefully:
1. You MUST choose category_name from the exact list below. Do NOT invent new categories.
2. clean_merchant must be a short, human-readable brand name (e.g. "Netflix", "Tesco", "HMRC").
3. is_subscription = true only for clearly recurring charges (streaming, SaaS, gym, insurance, etc).
4. subcategory is an optional free-text refinement within the category (e.g. "groceries" under "food", "rail" under "transport"). Use null if not applicable.
5. confidence is a float 0.0–1.0 reflecting how certain you are about the category assignment.
6. Return ONLY a valid JSON array — no markdown, no explanation, no extra text.

ALLOWED CATEGORIES (use the "name" field exactly):
${categoryList}

TRANSACTIONS TO ENRICH:
[
${txList}
]

Return a JSON array where each object has exactly these fields:
- transaction_id: string (copy from input id)
- category_name: string (must be one of the allowed category names above)
- clean_merchant: string
- is_subscription: boolean
- subcategory: string or null
- confidence: number (0.0 to 1.0)

Example output:
[
  {"transaction_id":"abc-123","category_name":"food","clean_merchant":"Tesco","is_subscription":false,"subcategory":"groceries","confidence":0.97},
  {"transaction_id":"def-456","category_name":"bills","clean_merchant":"Netflix","is_subscription":true,"subcategory":"streaming","confidence":0.99}
]`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type ValidationError = { field: string; reason: string };

function validateResult(
  r: EnrichmentResult,
  validIds: Set<string>,
  categoryMap: Map<string, string>,
): ValidationError[] {
  const errs: ValidationError[] = [];

  if (!r.transaction_id || !validIds.has(r.transaction_id)) {
    errs.push({ field: 'transaction_id', reason: `"${r.transaction_id}" not in batch` });
  }

  if (!r.category_name || !categoryMap.has(r.category_name)) {
    errs.push({ field: 'category_name', reason: `"${r.category_name}" is not a valid category` });
  }

  if (typeof r.confidence !== 'number' || r.confidence < 0 || r.confidence > 1) {
    errs.push({ field: 'confidence', reason: `must be a number between 0 and 1, got ${r.confidence}` });
  }

  if (typeof r.clean_merchant !== 'string' || r.clean_merchant.trim() === '') {
    errs.push({ field: 'clean_merchant', reason: 'must be a non-empty string' });
  }

  if (typeof r.is_subscription !== 'boolean') {
    errs.push({ field: 'is_subscription', reason: `must be boolean, got ${typeof r.is_subscription}` });
  }

  return errs;
}

// ---------------------------------------------------------------------------
// Claude call
// ---------------------------------------------------------------------------

async function callClaude(prompt: string): Promise<EnrichmentResult[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw: string = data.content?.[0]?.text?.trim() ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) throw new Error('Claude did not return an array');
  return parsed as EnrichmentResult[];
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  let upload_id: string | undefined;
  try {
    const body = await req.json();
    upload_id = body.upload_id ?? undefined;
    // user_id from body is ignored — we always use the authenticated user
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // --- Fetch categories (Claude must only choose from these) ---
  const { data: categories, error: catError } = await admin
    .from('categories')
    .select('id, name, label');

  if (catError || !categories?.length) {
    return json({ error: 'Failed to load categories' }, 500);
  }

  // --- Fetch unprocessed transactions for this user ---
  let query = admin
    .from('transactions')
    .select('id, raw_description, merchant, amount, type')
    .eq('user_id', user.id)
    .eq('ai_processed', false);

  if (upload_id) {
    query = query.eq('upload_id', upload_id);
  }

  const { data: transactions, error: txError } = await query;

  if (txError) return json({ error: `Failed to fetch transactions: ${txError.message}` }, 500);
  if (!transactions?.length) return json({ success: true, enriched: 0, message: 'Nothing to enrich' });

  // Build a name→id map so we can resolve category_name → category_id
  const categoryMap = new Map<string, string>(
    (categories as Category[]).map((c) => [c.name, c.id])
  );

  // --- Process in batches ---
  let totalEnriched = 0;
  const errors: string[] = [];

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = (transactions as RawTransaction[]).slice(i, i + BATCH_SIZE);

    const validIds = new Set(batch.map((t) => t.id));

    let results: EnrichmentResult[];
    try {
      const prompt = buildPrompt(batch, categories as Category[]);
      results = await callClaude(prompt);
    } catch (e) {
      errors.push(`Batch ${i / BATCH_SIZE + 1} Claude error: ${(e as Error).message}`);
      continue;
    }

    // Update each transaction individually so a single bad row doesn't block the rest
    for (const r of results) {
      // Validate before touching the DB
      const validationErrors = validateResult(r, validIds, categoryMap);
      if (validationErrors.length > 0) {
        const details = validationErrors.map((e) => `${e.field}: ${e.reason}`).join('; ');
        errors.push(`Row ${r.transaction_id} validation failed — ${details}`);
        continue;
      }

      const category_id = categoryMap.get(r.category_name)!; // safe: validated above

      const { error: updateError } = await admin
        .from('transactions')
        .update({
          category_id,
          clean_merchant: r.clean_merchant.trim().slice(0, 40),
          is_subscription: r.is_subscription,
          subcategory: r.subcategory ?? null,
          ai_confidence: r.confidence,
          ai_processed: true,
        })
        .eq('id', r.transaction_id)
        .eq('user_id', user.id); // safety: never update another user's rows

      if (updateError) {
        errors.push(`Row ${r.transaction_id} DB error: ${updateError.message}`);
      } else {
        totalEnriched++;
      }
    }
  }

  return json({
    success: true,
    enriched: totalEnriched,
    total: transactions.length,
    ...(errors.length ? { errors } : {}),
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
