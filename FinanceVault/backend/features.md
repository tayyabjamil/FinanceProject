# Backend Features

## Status key
- `done` — migration applied to production Supabase project
- `in-progress` — migration written, not yet applied
- `planned` — scoped but not written

---

## Auth

| Feature | Status | Notes |
|---------|--------|-------|
| Supabase Auth (email/password) | `done` | Managed by Supabase; no custom migration needed |
| Email confirmation disabled | `done` | Sign-up immediately creates a session |

---

## Database — Profiles

| Feature | Status | Migration | Notes |
|---------|--------|-----------|-------|
| `profiles` table | `done` | `20250101000000_profiles.sql` | UUID PK linked to `auth.users`; name, monthly_income, goal, currency |
| Row Level Security on profiles | `done` | `20250101000000_profiles.sql` | Select / insert / update policies per user |
| `updated_at` auto-trigger | `done` | `20250101000000_profiles.sql` | `set_updated_at()` trigger function |

---

## Database — Transactions

| Feature | Status | Migration | Notes |
|---------|--------|-----------|-------|
| `transactions` table | `in-progress` | `20250101000001_transactions.sql` | user_id FK, type, amount, merchant, category, date, notes |
| Row Level Security on transactions | `in-progress` | `20250101000001_transactions.sql` | Full CRUD policies per user |
| `user_id + date` index | `in-progress` | `20250101000001_transactions.sql` | Optimises listing transactions by recency |

---

## GraphQL (pg_graphql)

| Feature | Status | Notes |
|---------|--------|-------|
| Profile CRUD via pg_graphql | `done` | GET_PROFILE, INSERT_PROFILE, UPDATE_PROFILE queries used by mobile |
| Transactions CRUD via pg_graphql | `planned` | After `transactions` table migration is applied |

---

## Seed Data

| Feature | Status | File | Notes |
|---------|--------|------|-------|
| Demo user + 13 sample transactions | `done` | `seed.sql` | For local Supabase dev (`supabase db reset`) |
