# Mobile Features

## Status key
- `done` — shipped, in `main`
- `in-progress` — active development
- `planned` — scoped but not started
- `shelved` — paused / blocked

---

## Auth & Onboarding

| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| Email/password sign-up & login | `done` | `main` | Via Supabase Auth |
| SecureStore session persistence | `done` | `main` | Migrated from AsyncStorage; uses iOS Keychain / Android Keystore |
| Onboarding flow (name, income, goal, currency) | `done` | `main` | Single-step; saves to `profiles` table via GraphQL |
| Profile screen | `done` | `main` | Shows name, goal, income; sign-out |

---

## Dashboard

| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| Balance card (income vs expenses) | `done` | `main` | |
| Stats row (income / spent / saved%) | `done` | `main` | |
| Savings goal progress bar (20% target) | `done` | `main` | |
| AI insight tip card | `done` | `main` | Static calculation; not yet LLM-powered |
| Recent 5 transactions | `done` | `main` | |

---

## Transactions

| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| Add transaction (type, amount, merchant, category, date, notes) | `done` | `feat/-pdf-upload` | Saves to Supabase |
| List / search / filter transactions | `done` | `main` | Filter by type and category |
| Sync transactions to Supabase | `done` | `feat/-pdf-upload` | `lib/transactions.ts` reads/writes Supabase |
| PDF bank statement upload & parse | `done` | `feat/-pdf-upload` | Pick PDF → Storage → edge function → Claude → DB |
| Show AI enrichment in transactions screen | `in-progress` | `feat/AI-tables` | Display `clean_merchant`, subscription badge, `ai_confidence` |

---

## Bank Connection

| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| TrueLayer OpenBanking OAuth | `shelved` | `feat/openbankapis` | Blocked by deep-link redirect issue |
| PDF upload approach | `done` | `feat/-pdf-upload` | Full end-to-end flow working |

---

## AI / Insights

| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| Insights tab | `planned` | — | Screen exists; content TBD |
| Chat tab | `planned` | — | Screen exists; LLM integration TBD |
| AI enrichment — clean_merchant, category_id, is_subscription, ai_confidence, ai_processed | `in-progress` | `feat/AI-tables` | Migrations 000004 + 000005 written; TypeScript types updated in `types/index.ts` |
| AI-powered spend analysis | `planned` | — | Depends on AI enrichment data |
