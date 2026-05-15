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
| Add transaction (type, amount, merchant, category, date, notes) | `done` | `main` | |
| List / search / filter transactions | `done` | `main` | Filter by type and category |
| Local AsyncStorage persistence | `done` | `main` | Temporary; to be replaced by Supabase |
| Sync transactions to Supabase | `planned` | — | Migration: local → `transactions` table |
| PDF bank statement upload & parse | `in-progress` | `feat/read_pdf_file` | Replaces TrueLayer OAuth |

---

## Bank Connection

| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| TrueLayer OpenBanking OAuth | `shelved` | `feat/openbankapis` | Blocked by deep-link redirect issue |
| PDF upload approach | `in-progress` | `feat/read_pdf_file` | Active alternative to OAuth |

---

## AI / Insights

| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| Insights tab | `planned` | — | Screen exists; content TBD |
| Chat tab | `planned` | — | Screen exists; LLM integration TBD |
| AI-powered spend analysis | `planned` | — | Depends on transactions Supabase sync |
