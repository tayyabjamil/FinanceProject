/**
 * finance-chat — Supabase Edge Function
 *
 * Flow:
 *   1. Authenticate user via JWT
 *   2. Receive { message } from request body
 *   3. Fetch user's enriched transactions + category names from Supabase
 *   4. Build compact financial summary (totals, top merchants, subscriptions)
 *   5. Send summary + user message to Claude
 *   6. Return Claude's answer
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TxRow = {
  type: string;
  amount: number;
  merchant: string;
  clean_merchant: string | null;
  category: string | null;
  is_subscription: boolean | null;
  date: string;
  categories: { name: string; label: string } | null;
};

// ---------------------------------------------------------------------------
// Build financial summary to inject into Claude's context
// ---------------------------------------------------------------------------

function buildSummary(transactions: TxRow[]): string {
  if (!transactions.length) return 'The user has no transactions on record.';

  const expenses = transactions.filter((t) => t.type === 'expense');
  const income = transactions.filter((t) => t.type === 'income');

  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);

  // Spending by category
  const byCategory: Record<string, number> = {};
  for (const t of expenses) {
    const cat = t.categories?.label ?? t.category ?? 'Other';
    byCategory[cat] = (byCategory[cat] ?? 0) + t.amount;
  }
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cat, amt]) => `  - ${cat}: £${amt.toFixed(2)}`)
    .join('\n');

  // Top merchants by spend
  const byMerchant: Record<string, number> = {};
  for (const t of expenses) {
    const name = t.clean_merchant ?? t.merchant;
    byMerchant[name] = (byMerchant[name] ?? 0) + t.amount;
  }
  const topMerchants = Object.entries(byMerchant)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([m, amt]) => `  - ${m}: £${amt.toFixed(2)}`)
    .join('\n');

  // Subscriptions
  const subs = transactions.filter((t) => t.is_subscription);
  const subTotal = subs.reduce((s, t) => s + t.amount, 0);
  const subList = [...new Set(subs.map((t) => t.clean_merchant ?? t.merchant))]
    .slice(0, 10)
    .join(', ');

  // Date range
  const dates = transactions.map((t) => t.date).sort();
  const from = dates[0];
  const to = dates[dates.length - 1];

  return `FINANCIAL SUMMARY (${from} to ${to}):
Total transactions: ${transactions.length}
Total income:   £${totalIncome.toFixed(2)}
Total expenses: £${totalExpenses.toFixed(2)}
Net:            £${(totalIncome - totalExpenses).toFixed(2)}

SPENDING BY CATEGORY:
${topCategories || '  (none)'}

TOP MERCHANTS BY SPEND:
${topMerchants || '  (none)'}

SUBSCRIPTIONS (${subs.length} detected, total £${subTotal.toFixed(2)}/period):
${subList || 'None detected'}`;
}

// ---------------------------------------------------------------------------
// Call Claude
// ---------------------------------------------------------------------------

async function callClaude(summary: string, userMessage: string): Promise<string> {
  const prompt = `You are a smart, friendly personal finance assistant. You have access to the user's real transaction data summarised below. Use it to give specific, actionable answers.

Be concise but insightful. Use £ for currency. If you spot something concerning or interesting in the data, mention it. Don't make up numbers — only reference what's in the summary.

${summary}

User question: ${userMessage}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  clearTimeout(timeout);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? 'Sorry, I could not generate a response.';
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

  let message: string;
  try {
    const body = await req.json();
    message = (body.message ?? '').trim();
    if (!message) return json({ error: 'message is required' }, 400);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch enriched transactions with category join
  const { data: transactions, error: txError } = await admin
    .from('transactions')
    .select('type, amount, merchant, clean_merchant, category, is_subscription, date, categories(name, label)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(300);

  if (txError) return json({ error: `Failed to fetch transactions: ${txError.message}` }, 500);

  const summary = buildSummary((transactions ?? []) as TxRow[]);
  const answer = await callClaude(summary, message);

  return json({ answer });
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
