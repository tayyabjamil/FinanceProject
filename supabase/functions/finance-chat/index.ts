/**
 * finance-chat — Tool-based AI chat
 *
 * Flow:
 *   1. Auth user via JWT
 *   2. Fetch user's transactions once
 *   3. Send user message to Claude with tool definitions (intent detection)
 *   4. Claude picks the right tool(s) based on the question
 *   5. Execute each tool — targeted aggregation on the transaction data
 *   6. Send tool results back to Claude for the final answer
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

type ToolUseBlock = {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
};

type ContentBlock = { type: string } & Partial<ToolUseBlock> & { text?: string };

// ---------------------------------------------------------------------------
// Tool definitions — Claude picks from these based on user intent
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'get_overview',
    description:
      "Get overall financial summary: total income, total expenses, net savings, and the date range of transactions. Use for general questions like 'how am I doing?', 'what's my balance?', or 'how much did I earn/spend overall?'.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_category_breakdown',
    description:
      'Get spending broken down by category (food, transport, shopping, bills, rent, etc.). Use when the user asks where their money went, which categories cost the most, or wants a spending breakdown.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_top_merchants',
    description:
      'Get the top merchants or shops the user spent the most money at, ranked by total spend.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'How many merchants to return (default 8)' },
      },
      required: [],
    },
  },
  {
    name: 'get_subscriptions',
    description:
      'Get all recurring subscription transactions (Netflix, Spotify, gym, SaaS tools, etc.) and total subscription cost.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_recent_transactions',
    description:
      'Get recent transactions, optionally filtered by a specific category. Use when the user asks to see transactions, recent activity, or spending in a particular category.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of transactions to return (default 10)' },
        category: {
          type: 'string',
          description: 'Category to filter by: food, transport, shopping, bills, rent, salary, other',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_largest_expenses',
    description:
      'Get the single largest expense transactions. Use when the user asks about their biggest purchases, most expensive transactions, or what cost the most.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of transactions to return (default 5)' },
      },
      required: [],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution — each tool runs targeted aggregation on pre-fetched data
// ---------------------------------------------------------------------------

function executeTool(name: string, input: Record<string, unknown>, txns: TxRow[]): string {
  switch (name) {
    case 'get_overview': {
      const expenses = txns.filter((t) => t.type === 'expense');
      const income = txns.filter((t) => t.type === 'income');
      const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
      const totalIncome = income.reduce((s, t) => s + t.amount, 0);
      const dates = txns.map((t) => t.date).sort();
      return JSON.stringify({
        from: dates[0] ?? null,
        to: dates[dates.length - 1] ?? null,
        transaction_count: txns.length,
        total_income: `£${totalIncome.toFixed(2)}`,
        total_expenses: `£${totalExpenses.toFixed(2)}`,
        net_savings: `£${(totalIncome - totalExpenses).toFixed(2)}`,
      });
    }

    case 'get_category_breakdown': {
      const byCategory: Record<string, { total: number; count: number }> = {};
      for (const t of txns.filter((t) => t.type === 'expense')) {
        const cat = t.categories?.label ?? t.category ?? 'Other';
        byCategory[cat] ??= { total: 0, count: 0 };
        byCategory[cat].total += t.amount;
        byCategory[cat].count += 1;
      }
      const breakdown = Object.entries(byCategory)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([category, { total, count }]) => ({
          category,
          total: `£${total.toFixed(2)}`,
          transactions: count,
        }));
      return JSON.stringify(breakdown);
    }

    case 'get_top_merchants': {
      const limit = (input.limit as number) ?? 8;
      const byMerchant: Record<string, { total: number; count: number }> = {};
      for (const t of txns.filter((t) => t.type === 'expense')) {
        const m = t.clean_merchant ?? t.merchant;
        byMerchant[m] ??= { total: 0, count: 0 };
        byMerchant[m].total += t.amount;
        byMerchant[m].count += 1;
      }
      const merchants = Object.entries(byMerchant)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, limit)
        .map(([merchant, { total, count }]) => ({
          merchant,
          total: `£${total.toFixed(2)}`,
          transactions: count,
        }));
      return JSON.stringify(merchants);
    }

    case 'get_subscriptions': {
      const subs = txns.filter((t) => t.is_subscription);
      const total = subs.reduce((s, t) => s + t.amount, 0);
      // Deduplicate by merchant name, keep first occurrence
      const seen = new Map<string, TxRow>();
      for (const t of subs) {
        const key = t.clean_merchant ?? t.merchant;
        if (!seen.has(key)) seen.set(key, t);
      }
      const list = [...seen.values()].map((t) => ({
        merchant: t.clean_merchant ?? t.merchant,
        amount: `£${t.amount.toFixed(2)}`,
      }));
      return JSON.stringify({
        total: `£${total.toFixed(2)}`,
        count: subs.length,
        subscriptions: list,
      });
    }

    case 'get_recent_transactions': {
      const limit = (input.limit as number) ?? 10;
      const category = (input.category as string | undefined)?.toLowerCase();
      const filtered = category
        ? txns.filter(
            (t) => (t.categories?.name ?? t.category ?? '').toLowerCase() === category,
          )
        : txns;
      const recent = [...filtered]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit)
        .map((t) => ({
          date: t.date,
          merchant: t.clean_merchant ?? t.merchant,
          amount: `£${t.amount.toFixed(2)}`,
          type: t.type,
          category: t.categories?.label ?? t.category ?? 'Other',
        }));
      return JSON.stringify(recent);
    }

    case 'get_largest_expenses': {
      const limit = (input.limit as number) ?? 5;
      const largest = txns
        .filter((t) => t.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, limit)
        .map((t) => ({
          date: t.date,
          merchant: t.clean_merchant ?? t.merchant,
          amount: `£${t.amount.toFixed(2)}`,
          category: t.categories?.label ?? t.category ?? 'Other',
        }));
      return JSON.stringify(largest);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

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

  // Fetch transactions once — all tools operate on this in-memory
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: transactions, error: txError } = await admin
    .from('transactions')
    .select('type, amount, merchant, clean_merchant, category, is_subscription, date, categories(name, label)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(500);

  if (txError) return json({ error: `Failed to fetch transactions: ${txError.message}` }, 500);

  const txList = (transactions ?? []) as TxRow[];
  console.log(`[finance-chat] user=${user.id} | message="${message}" | transactions fetched=${txList.length}`);

  const SYSTEM =
    "You are a smart personal finance assistant. Use the tools to fetch the user's real transaction data, then give a concise, specific, and helpful answer. Use £ for currency. Only reference data returned by the tools — never make up numbers.";

  const claudeHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  };

  // --- Turn 1: send user message + tools → Claude detects intent and calls tools ---
  const turn1Res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: claudeHeaders,
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM,
      tools: TOOLS,
      messages: [{ role: 'user', content: message }],
    }),
  });

  if (!turn1Res.ok) {
    const err = await turn1Res.text();
    return json({ error: `Claude error ${turn1Res.status}: ${err}` }, 502);
  }

  const turn1 = await turn1Res.json();
  console.log(`[finance-chat] turn1 stop_reason=${turn1.stop_reason}`);

  // If Claude answered directly without using a tool, return it
  if (turn1.stop_reason !== 'tool_use') {
    const answer =
      (turn1.content as ContentBlock[])?.find((b) => b.type === 'text')?.text?.trim() ??
      'Sorry, I could not generate a response.';
    console.log(`[finance-chat] no tools used — direct answer`);
    return json({ answer });
  }

  // --- Execute all tool calls Claude requested ---
  const toolUseBlocks = (turn1.content as ContentBlock[]).filter(
    (b): b is ToolUseBlock => b.type === 'tool_use',
  );
  console.log(`[finance-chat] tools called: ${toolUseBlocks.map((b) => `${b.name}(${JSON.stringify(b.input)})`).join(', ')}`);

  const toolResults = toolUseBlocks.map((block) => {
    const result = executeTool(block.name, block.input, txList);
    console.log(`[finance-chat] tool=${block.name} result=${result.slice(0, 300)}`);
    return {
      type: 'tool_result' as const,
      tool_use_id: block.id,
      content: result,
    };
  });

  // --- Turn 2: send tool results back → Claude generates final answer ---
  const turn2Res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: claudeHeaders,
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM,
      tools: TOOLS,
      messages: [
        { role: 'user', content: message },
        { role: 'assistant', content: turn1.content },
        { role: 'user', content: toolResults },
      ],
    }),
  });

  if (!turn2Res.ok) {
    const err = await turn2Res.text();
    return json({ error: `Claude error ${turn2Res.status}: ${err}` }, 502);
  }

  const turn2 = await turn2Res.json();
  console.log(`[finance-chat] turn2 stop_reason=${turn2.stop_reason}`);
  const answer =
    (turn2.content as ContentBlock[])?.find((b) => b.type === 'text')?.text?.trim() ??
    'Sorry, I could not generate a response.';

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
