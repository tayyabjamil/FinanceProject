-- Storage bucket: bank-statements
-- Private bucket for user-uploaded PDF bank statements.
-- Files are stored at {user_id}/{timestamp}_{filename}.pdf
-- RLS policies ensure users can only access their own folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bank-statements',
  'bank-statements',
  false,                          -- private: no public URL access
  10485760,                       -- 10 MB max per file
  array['application/pdf']        -- PDFs only
)
on conflict (id) do nothing;

-- Users can upload to their own folder only
drop policy if exists "Users can upload their own PDFs" on storage.objects;
create policy "Users can upload their own PDFs"
  on storage.objects for insert
  with check (
    bucket_id = 'bank-statements'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read their own PDFs
drop policy if exists "Users can read their own PDFs" on storage.objects;
create policy "Users can read their own PDFs"
  on storage.objects for select
  using (
    bucket_id = 'bank-statements'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own PDFs
drop policy if exists "Users can delete their own PDFs" on storage.objects;
create policy "Users can delete their own PDFs"
  on storage.objects for delete
  using (
    bucket_id = 'bank-statements'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
