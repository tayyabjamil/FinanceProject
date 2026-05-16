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
| PDF bank statement upload & parse | `in-progress` | `feat/-pdf-upload` | Replaces TrueLayer OAuth; UI done — tab added, expo-document-picker + expo-file-system integrated, files saved to app document directory |

---

## Bank Connection

| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| TrueLayer OpenBanking OAuth | `shelved` | `feat/openbankapis` | Blocked by deep-link redirect issue |
| PDF upload approach | `in-progress` | `feat/-pdf-upload` | Upload tab live; picks PDF, copies to app storage, lists uploaded files with delete |

---

## Architecture

| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| Central types file | `done` | `feat/-pdf-upload` | All domain types in `types/index.ts`; imported via `@/types`. Component prop types stay co-located. `lib/` files re-export for backwards compat. |

---

## Navigation / UI

| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| Tab bar reduced to 3 tabs (Home, Upload PDF, Profile) | `done` | `feat/-pdf-upload` | Removed Payments, AI, Analytics tabs from tab bar; hidden via `href: null` |

---

## AI / Insights

| Feature | Status | Branch | Notes |
|---------|--------|--------|-------|
| Insights tab | `planned` | — | Screen exists; content TBD |
| Chat tab | `planned` | — | Screen exists; LLM integration TBD |
| AI-powered spend analysis | `planned` | — | Depends on transactions Supabase sync |
