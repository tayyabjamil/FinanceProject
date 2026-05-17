# Backend — Prompt Log

A log of prompts used during backend development, alongside the senior-developer refined version.
Use this to study how to write better AI prompts for engineering interviews.

---

## Format

**Date:** YYYY-MM-DD
**Task:** what was being built
**My prompt:** what was actually typed
**Senior version:** how a 6+ year developer would have written it

---

## Log

---

### 2026-05-16 — process-pdf Edge Function

**My prompt:**
> now work in supabase what can be the best way to extract the data from this pdf and save in the supabase so that later on i can pass to the AI

**Senior version:**
> "Design and implement a Supabase Deno Edge Function called `process-pdf`. It must: (1) authenticate the caller via their JWT using the anon key, (2) accept `{ upload_id, storage_path }` in the POST body, (3) download the PDF from the `bank-statements` Storage bucket using the service role client, (4) base64-encode the bytes and send to Claude API as a native `document` content block with a prompt that returns a strict JSON array of `{ date, merchant, amount, type, category }` transactions, (5) bulk-insert the parsed rows into the `transactions` table with `user_id` from the verified JWT, (6) update `pdf_uploads.status` to `done` or `failed` with an error message. The `ANTHROPIC_API_KEY` must be injected via Supabase secrets, never hardcoded."

---

### 2026-05-16 — bank-statements Storage bucket migration

**My prompt:**
> I want you to do 1 this for me

**Senior version:**
> "We have a Supabase project with an existing migration chain (`000000` → `000002`). Create migration `000003` to provision the `bank-statements` Storage bucket programmatically via `storage.buckets` insert — private, `application/pdf` MIME type only, 10MB file size limit. Add three RLS policies on `storage.objects` (insert, select, delete) scoped to the authenticated user's own folder using `storage.foldername(name)[1] = auth.uid()::text`. Use `on conflict do nothing` so the migration is idempotent. No manual dashboard steps — fully reproducible."

---

### 2026-05-16 — pdf_uploads tracking table

**My prompt:**
> (part of the edge function request)

**Senior version:**
> "Create Supabase migration `000002` for a `pdf_uploads` table to track the lifecycle of each uploaded bank statement. Columns: `id` (uuid PK), `user_id` (FK → auth.users, cascade delete), `file_name` (text), `storage_path` (text — path inside the `bank-statements` bucket), `status` (text with check constraint: `pending | processing | done | failed`, default `pending`), `transaction_count` (int, nullable — set on success), `error_message` (text, nullable — set on failure), `created_at`, `updated_at` (with auto-trigger). Add a composite index on `(user_id, created_at desc)`. RLS: users can select and insert their own rows; the edge function updates via service role so no update policy is needed for the app client."

---

### 2026-05-16 — AI enrichment fields on transactions table

**My prompt:**
> Make the transactions table AI-ready and add AI transaction enrichment

**Senior version:**
> "Add AI enrichment columns to the `transactions` table via migration `000004`. Raw bank statement data (`merchant`, `category`) must stay untouched. Add: `merchant_clean` (text) — Claude's cleaned merchant name; `category_ai` (text, same check constraint as `category`) — Claude's best-guess category which may differ from raw; `is_subscription` (boolean, default false) — true for recurring subscriptions like Netflix, Spotify, SaaS; `enriched_at` (timestamptz, nullable) — null means not yet enriched. Update the `process-pdf` edge function extraction prompt to return these four fields alongside existing ones. Map them into the insert row so enrichment happens at PDF parse time with no extra API call. Update the `Transaction` TypeScript type with the new optional fields."

---
