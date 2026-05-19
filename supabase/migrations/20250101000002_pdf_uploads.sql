-- pdf_uploads table
-- Tracks every bank statement PDF uploaded by a user.
-- The process-pdf edge function reads this table to update status
-- and stores extracted transaction count when done.

create table if not exists public.pdf_uploads (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  file_name         text not null,
  storage_path      text not null,            -- path inside bank-statements bucket
  status            text not null default 'pending'
                      check (status in ('pending', 'processing', 'done', 'failed')),
  transaction_count int,                      -- populated by edge function on success
  error_message     text,                     -- populated by edge function on failure
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Index for listing a user's uploads newest-first
create index if not exists pdf_uploads_user_created_idx on public.pdf_uploads (user_id, created_at desc);

-- Row Level Security: users can only see their own uploads
alter table public.pdf_uploads enable row level security;

drop policy if exists "Users can view their own pdf uploads" on public.pdf_uploads;
create policy "Users can view their own pdf uploads"
  on public.pdf_uploads for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own pdf uploads" on public.pdf_uploads;
create policy "Users can insert their own pdf uploads"
  on public.pdf_uploads for insert
  with check (auth.uid() = user_id);

-- Edge function uses service role so no update policy needed for the app client

-- Auto-update updated_at
drop trigger if exists pdf_uploads_set_updated_at on public.pdf_uploads;
create trigger pdf_uploads_set_updated_at
  before update on public.pdf_uploads
  for each row execute function public.set_updated_at();
