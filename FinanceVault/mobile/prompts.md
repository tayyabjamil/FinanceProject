# Mobile — Prompt Log

A log of prompts used during mobile development, alongside the senior-developer refined version.
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

### 2026-05-16 — Remove tabs and add PDF upload tab

**My prompt:**
> remove the extra options from the tabs and make 1 for upload pdf and use expo to upload pdfs

**Senior version:**
> "In our Expo Router v6 app (`FinanceApp/app/(tabs)/_layout.tsx`), reduce the tab bar from 5 tabs to 3: keep Home and Profile, replace the middle tabs with a single Upload PDF tab. Hide the removed screens (transactions, chat, insights) from the tab bar using `href: null` so their routes still exist. Create `app/(tabs)/upload.tsx` — a screen that uses `expo-document-picker` to let the user pick a PDF, copies it to the app's document directory with `expo-file-system`, and renders a list of uploaded files with filename, size, date, and a delete action. Match the existing dark theme from `constants/theme.ts`. Add any missing SF Symbol → MaterialIcon mappings to `components/ui/icon-symbol.tsx` for Android fallback."

---

### 2026-05-16 — Full PDF upload pipeline with Supabase Edge Function

**My prompt:**
> now work in supabase what can be the best way to extract the data from this pdf and save in the supabase so that later on i can pass to the AI

**Senior version:**
> "Design and implement the server-side pipeline for PDF transaction extraction. The flow should be: mobile uploads PDF to Supabase Storage (`bank-statements/{user_id}/`) → calls a Deno Edge Function `process-pdf` → function downloads the PDF, base64-encodes it, sends it to the Claude API (`claude-opus-4-6`) as a native document with a strict prompt to return a JSON array of transactions (`date`, `merchant`, `amount`, `type`, `category`) → bulk-inserts into the existing `transactions` table → updates a `pdf_uploads` tracking table with status (`pending | processing | done | failed`) and `transaction_count`. Write the edge function, the `pdf_uploads` migration, and update the upload screen to use the full Supabase flow instead of local file storage. API keys must stay server-side only."

---

### 2026-05-16 — Create Supabase Storage bucket via migration

**My prompt:**
> I want you to do 1 this for me also

**Senior version:**
> "We have a Supabase project with an existing migration chain (`000000` → `000002`). Create migration `000003` to provision the `bank-statements` Storage bucket programmatically — private, `application/pdf` only, 10MB file size limit. Add RLS policies on `storage.objects` scoped so a user can only insert/select/delete within their own `{user_id}/` folder, using `storage.foldername(name)[1]` to extract the folder prefix. No manual dashboard steps — everything must be reproducible from migrations."

---

### 2026-05-16 — Centralise all TypeScript types

**My prompt:**
> For all the typescript types in mobile expo app declare them in a separate file call it something professional and import all the types from there

**Senior version:**
> "Audit all `.ts` and `.tsx` files in `FinanceApp/` for type aliases, interfaces, and enums. Centralise all domain and shared types (transactions, session, profile, chat, insights, PDF upload) into `FinanceApp/types/index.ts`, importable via the `@/types` path alias. Component-specific prop types (e.g. `ThemedViewProps`, `Props`) stay co-located with their component. In `lib/transactions.ts` and `lib/session.ts`, remove the type definitions and re-export them from `@/types` to preserve backwards compatibility for existing importers without updating every call site. In screen files with inline types (`chat.tsx`, `insights.tsx`, `upload.tsx`), remove the local declarations and import from `@/types`. Rename ambiguous single-letter types (`Msg` → `ChatMessage`, `Bar` → `CategoryBar`) to be self-documenting. Run `tsc --noEmit` to confirm no regressions."

---

### 2026-05-16 — Migrate transactions to Supabase and add Transactions tab

**My prompt:**
> show these transactions now in a screen

**Senior version:**
> "The `transactions` table is now live in Supabase and populated by the `process-pdf` edge function. Migrate `lib/transactions.ts` from AsyncStorage to Supabase — `listTransactions` should query the `transactions` table ordered by date desc, and `addTransaction` should insert with the authenticated user's `user_id`. The transactions screen at `app/(tabs)/transactions.tsx` already consumes `listTransactions`, so no screen changes are needed. Add Transactions to the tab bar in `_layout.tsx` — it is currently hidden with `href: null`."

---
