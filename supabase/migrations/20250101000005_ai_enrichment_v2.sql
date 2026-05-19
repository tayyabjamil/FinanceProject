-- AI Enrichment v2 — extended columns on transactions
--
-- Adds richer AI-processing fields:
--   raw_description  — untouched payee string from the bank statement
--   clean_merchant   — human-readable merchant name (alias approach alongside merchant_clean)
--   category_id      — FK to categories lookup table (nullable)
--   subcategory      — free-text sub-category within the main category
--   is_subscription  — already exists (000004); if not exists makes this a no-op
--   ai_confidence    — 0–1 score reflecting model confidence in categorisation
--   ai_processed     — flag so we can queue/retry enrichment in bulk
--   balance_after    — running balance value extracted from the statement line
--   source           — how the transaction entered the system: 'manual' | 'pdf_upload' | 'open_banking'
--   upload_id        — FK back to pdf_uploads so we can trace which upload created each row

-- ── Categories lookup table ──────────────────────────────────────────────────
-- Needed for category_id FK below.  Seeded with the same values already used
-- in the category text check constraint on transactions.

create table if not exists public.categories (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique,   -- 'food', 'transport', etc.
  label text not null           -- display label e.g. 'Food & Drink'
);

insert into public.categories (name, label) values
  ('food',      'Food & Drink'),
  ('transport', 'Transport'),
  ('shopping',  'Shopping'),
  ('bills',     'Bills & Utilities'),
  ('rent',      'Rent & Housing'),
  ('salary',    'Salary & Income'),
  ('other',     'Other')
on conflict (name) do nothing;

-- ── New columns on transactions ──────────────────────────────────────────────
-- NOTE: the existing `category` text column is intentionally left untouched.
-- It remains the source of truth for the current app and must not be dropped
-- until all reads/writes have been migrated to use category_id.

alter table public.transactions
  add column if not exists raw_description  text,
  add column if not exists clean_merchant   text,
  add column if not exists category_id      uuid references public.categories(id) on delete set null,
  add column if not exists subcategory      text,
  add column if not exists is_subscription  boolean not null default false,   -- no-op if 000004 already added it
  add column if not exists ai_confidence    numeric(4, 3) check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1)),
  add column if not exists ai_processed     boolean not null default false,
  add column if not exists balance_after    numeric(12, 2),
  add column if not exists source           text not null default 'manual' check (source in ('manual', 'pdf_upload', 'open_banking')),
  add column if not exists upload_id        uuid references public.pdf_uploads(id) on delete set null;

-- Index: quickly find all transactions from a given upload
create index if not exists transactions_upload_id_idx on public.transactions (upload_id);

-- Index: find all unprocessed rows for background enrichment jobs
create index if not exists transactions_ai_processed_idx on public.transactions (ai_processed) where ai_processed = false;
