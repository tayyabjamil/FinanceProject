-- AI Enrichment fields on transactions
-- Raw bank statement data (merchant, category) stays untouched.
-- AI-generated clean data is stored in separate columns so both are always available.

alter table public.transactions
  add column if not exists merchant_clean  text,           -- AI-cleaned merchant name e.g. "ChatGPT" instead of "OPENAI *CHATGPT SU"
  add column if not exists category_ai    text            -- AI-assigned category (may differ from raw extraction)
    check (category_ai in ('food', 'transport', 'shopping', 'bills', 'rent', 'salary', 'other')),
  add column if not exists is_subscription boolean not null default false,  -- true if AI detects recurring subscription
  add column if not exists enriched_at    timestamptz;    -- null = not yet enriched; set when AI fields are populated
