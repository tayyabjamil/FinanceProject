# Upload PDFs Edge Function

## What Is an Edge Function?

An Edge Function is a small server-side script that runs on Supabase's infrastructure (built on Deno).
You write it once, deploy it, and Supabase hosts and runs it — no server to manage.

It runs **close to the user** (at the "edge" of the network, not in one central data centre),
which keeps response times fast regardless of where the user is.

---

## Why Do We Use Them?

| Problem | Why Edge Function solves it |
|---------|-----------------------------|
| **API keys must stay secret** | The Claude API key (`ANTHROPIC_API_KEY`) must never ship inside the mobile app. The edge function holds it server-side where users can't see it. |
| **Heavy work off device** | Converting a PDF to base64 and calling an AI API is slow and battery-draining on a phone. The edge function does this server-side. |
| **Direct DB writes** | The function uses the Supabase service role key to write to `transactions` and update `pdf_uploads` without the user needing special permissions. |
| **No backend server needed** | We don't run Express/FastAPI/etc. Supabase handles scaling, uptime, and deployment. |

---

## How It Works — General

```
Mobile App
    │
    │  POST /functions/v1/process-pdf
    │  Authorization: Bearer <user JWT>
    │  Body: { upload_id, storage_path }
    ▼
Edge Function (Deno, runs on Supabase)
    │
    ├── Verifies the user JWT → gets user.id
    ├── Downloads PDF from Supabase Storage
    ├── Converts PDF to base64
    ├── Calls Claude API → extracts transactions as JSON
    ├── Inserts transactions into DB (service role, bypasses RLS)
    └── Updates pdf_uploads.status to done / failed
    │
    ▼
Mobile App receives { success: true, transaction_count: N }
```

---

## Our Function — `process-pdf`

**File:** `supabase/functions/process-pdf/index.ts`

**Trigger:** Called directly by the mobile app after a PDF is uploaded to Storage.

**Environment variables required (set in Supabase dashboard → Edge Functions → Secrets):**

| Variable | What it is |
|----------|-----------|
| `ANTHROPIC_API_KEY` | Claude API key — used to extract transactions from the PDF |
| `SUPABASE_URL` | Your project URL (auto-set by Supabase) |
| `SUPABASE_ANON_KEY` | Public anon key — used to verify the user JWT (auto-set) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret service key — bypasses RLS for DB writes (auto-set) |

**Step-by-step what it does:**

1. Authenticates the user via their JWT (so random people can't call it)
2. Updates `pdf_uploads.status` → `processing`
3. Downloads the PDF from the `bank-statements` Storage bucket
4. Base64-encodes the PDF bytes
5. Sends the PDF to `claude-opus-4-6` with a strict prompt to return a JSON array of transactions
6. Parses Claude's response
7. Bulk-inserts rows into the `transactions` table with `user_id` set to the authenticated user
8. Updates `pdf_uploads.status` → `done` (or `failed` with an error message)

---

## How to Deploy

```bash
# Install Supabase CLI if not already
brew install supabase/tap/supabase

# Login
supabase login

# Link to your project (run once)
supabase link --project-ref <your-project-ref>

# Deploy the function
supabase functions deploy process-pdf

# Set the Claude API key secret
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

---

## How to Test Locally

```bash
# Start local Supabase stack
supabase start

# Serve the function locally
supabase functions serve process-pdf --env-file .env.local

# Call it with curl
curl -X POST http://localhost:54321/functions/v1/process-pdf \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"upload_id":"<uuid>","storage_path":"<user-id>/file.pdf"}'
```

---

## Status Lifecycle

```
pending  →  processing  →  done
                        →  failed  (error_message populated)
```

The mobile upload screen polls / refreshes after calling the function to show the final status.

---

## Functions Register

| Function | Status | File | Purpose |
|----------|--------|------|---------|
| `process-pdf` | done | `supabase/functions/process-pdf/index.ts` | Extract transactions from uploaded bank statement PDF via Claude API |
