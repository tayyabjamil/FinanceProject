# Edge Functions

## What Is an Edge Function?

An Edge Function is a small server-side script that runs on Supabase's infrastructure (built on Deno).
You write it once, deploy it, and Supabase hosts and runs it — no server to manage.

It runs **close to the user** (at the "edge" of the network, not in one central data centre),
which keeps response times fast regardless of where the user is.

---

## Why Do We Use Them?

| Problem | Why Edge Function solves it |
|---------|-----------------------------|
| **API keys must stay secret** | `ANTHROPIC_API_KEY` must never ship inside the mobile app. Edge functions hold it server-side. |
| **Heavy work off device** | PDF → base64 → Claude API is slow and battery-draining on a phone. Done server-side instead. |
| **Direct DB writes** | Functions use the Supabase service role key to write to `transactions` and `pdf_uploads` without special user permissions. |
| **No backend server needed** | No Express/FastAPI/etc. Supabase handles scaling, uptime, and deployment. |

---

## Full Flow

```
Mobile App
    │
    │  1. Upload PDF to Supabase Storage (bank-statements bucket)
    │  2. POST /functions/v1/process-pdf
    │     Authorization: Bearer <user JWT>
    │     Body: { upload_id, storage_path }
    ▼
┌─────────────────────────────────────────────────┐
│  process-pdf  (Deno, Supabase Edge)             │
│                                                 │
│  ① Verify JWT → get user.id                    │
│  ② Mark pdf_uploads.status = processing        │
│  ③ Download PDF from Storage                   │
│  ④ Base64-encode PDF bytes                     │
│  ⑤ Call Claude API → extract transactions      │
│     Fields extracted per row:                  │
│       date, merchant (raw), merchant_clean,    │
│       amount, type, category, category_ai,     │
│       is_subscription, balance_after           │
│  ⑥ Insert rows into transactions table:        │
│       source = 'pdf_upload'                    │
│       upload_id = <from request>               │
│       raw_description = merchant (raw copy)    │
│       ai_processed = false                     │
│  ⑦ Mark pdf_uploads.status = done / failed    │
│  ⑧ Call enrich-transactions({ upload_id })    │
└──────────────────┬──────────────────────────────┘
                   │  POST /functions/v1/enrich-transactions
                   │  Same user JWT passed through
                   ▼
┌─────────────────────────────────────────────────┐
│  enrich-transactions  (Deno, Supabase Edge)     │
│                                                 │
│  ① Verify JWT                                  │
│  ② Fetch categories table (fixed list —        │
│     Claude must only pick from these)          │
│  ③ Fetch transactions where                    │
│       ai_processed = false                     │
│       AND user_id = current user               │
│       AND upload_id = <from request> (if set)  │
│  ④ Split into batches of 50                    │
│  ⑤ For each batch → call Claude API:           │
│     - Pass raw_description + category list     │
│     - Claude returns JSON array                │
│  ⑥ Validate each Claude result:               │
│     - transaction_id exists in batch           │
│     - category_name exists in categories table │
│     - confidence is 0.0 – 1.0                 │
│     - clean_merchant is a non-empty string     │
│     - is_subscription is boolean              │
│  ⑦ Update each valid transaction:             │
│       category_id  (resolved from name → id)  │
│       clean_merchant                           │
│       subcategory                              │
│       is_subscription                          │
│       ai_confidence                            │
│       ai_processed = true                      │
│     Invalid rows are skipped + logged          │
└─────────────────────────────────────────────────┘
                   │
                   ▼
Mobile App receives {
  success: true,
  transaction_count: N,
  enrichment: { enriched: N, total: N, errors?: [...] }
}
```

---

## Function Reference

### `process-pdf`

**File:** `supabase/functions/process-pdf/index.ts`
**Trigger:** Called by mobile app after PDF is uploaded to Storage.
**Calls:** `enrich-transactions` automatically after insert (non-blocking).

**Request:**
```json
POST /functions/v1/process-pdf
Authorization: Bearer <user JWT>
{ "upload_id": "<uuid>", "storage_path": "<user-id>/file.pdf" }
```

**Response:**
```json
{ "success": true, "transaction_count": 12, "enrichment": { "enriched": 12, "total": 12 } }
```

**Fields set on insert:**

| Field | Value |
|-------|-------|
| `merchant` | Raw bank payee string (kept for backwards compat) |
| `raw_description` | Copy of raw payee string |
| `merchant_clean` | Claude's cleaned name (from extraction prompt) |
| `category` | Claude's category (text fallback) |
| `category_ai` | Claude's AI category judgement |
| `is_subscription` | Claude's subscription detection |
| `balance_after` | Running balance from statement (or null) |
| `source` | `'pdf_upload'` |
| `upload_id` | FK → `pdf_uploads.id` |
| `ai_processed` | `false` (set to `true` by `enrich-transactions`) |

---

### `enrich-transactions`

**File:** `supabase/functions/enrich-transactions/index.ts`
**Trigger:** Called automatically by `process-pdf`; can also be called standalone to re-enrich or catch missed rows.

**Request:**
```json
POST /functions/v1/enrich-transactions
Authorization: Bearer <user JWT>
{ "upload_id": "<uuid>" }   // optional — omit to enrich all unprocessed rows for the user
```

**Response:**
```json
{ "success": true, "enriched": 12, "total": 12, "errors": [] }
```

**Fields written per transaction:**

| Field | Source |
|-------|--------|
| `category_id` | Resolved from `category_name` → `categories.id` (never trusts Claude UUIDs) |
| `clean_merchant` | Claude output, validated as non-empty string, trimmed to 40 chars |
| `subcategory` | Claude output (nullable free-text) |
| `is_subscription` | Claude output, validated as boolean |
| `ai_confidence` | Claude output, validated 0.0–1.0 |
| `ai_processed` | `true` |

**Validation rules (invalid rows skipped + logged, not aborted):**

| Field | Rule |
|-------|------|
| `transaction_id` | Must be in the current batch |
| `category_name` | Must exactly match a name in the `categories` table |
| `confidence` | Must be a number between 0 and 1 |
| `clean_merchant` | Must be a non-empty string |
| `is_subscription` | Must be boolean |

---

## Environment Variables

| Variable | Used by | Notes |
|----------|---------|-------|
| `ANTHROPIC_API_KEY` | Both | Set via `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` |
| `SUPABASE_URL` | Both | Auto-set by Supabase |
| `SUPABASE_ANON_KEY` | Both | Auto-set by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Both | Auto-set by Supabase |

---

## Deploy

```bash
supabase functions deploy process-pdf
supabase functions deploy enrich-transactions
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

## Test Locally

```bash
supabase start
supabase functions serve --env-file .env.local

# Test process-pdf
curl -X POST http://localhost:54321/functions/v1/process-pdf \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"upload_id":"<uuid>","storage_path":"<user-id>/file.pdf"}'

# Test enrich-transactions standalone
curl -X POST http://localhost:54321/functions/v1/enrich-transactions \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"upload_id":"<uuid>"}'
```

---

## Status Lifecycle

```
pdf_uploads row:
  pending → processing → done
                      → failed  (error_message populated)

transactions rows:
  inserted with ai_processed=false
      → enrich-transactions runs
      → ai_processed=true, category_id/clean_merchant/etc populated
```
