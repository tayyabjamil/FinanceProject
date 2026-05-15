-- Transactions table
-- Migrating from local AsyncStorage to Supabase so transactions sync across devices.
-- Categories and types must match the TypeScript enums in lib/transactions.ts.

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('income', 'expense')),
  amount      numeric(12, 2) not null check (amount > 0),
  merchant    text not null,
  category    text not null check (category in ('food', 'transport', 'shopping', 'bills', 'rent', 'salary', 'other')),
  date        date not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for common query patterns: all user transactions ordered by date
create index transactions_user_date_idx on public.transactions (user_id, date desc);

-- Row Level Security: users can only access their own transactions
alter table public.transactions enable row level security;

create policy "Users can view their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();
