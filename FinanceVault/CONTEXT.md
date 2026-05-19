# FinanceAI — Session Context

> Read this at the start of every Claude session. It gives full project context without scanning the codebase.

---

## What This App Is

A personal finance mobile app. Users upload bank statement PDFs → app extracts transactions → AI analyses spending and gives insights.

---

## Repo Structure

```
FinanceProject/
├── FinanceApp/          # Expo React Native mobile app
├── supabase/            # Supabase migrations + seed
├── FinanceVault/        # Project docs (features, bugs, branches, this file)
└── .gitignore
```

---

## Tech Stack

### Mobile — `FinanceApp/`
| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54, React Native 0.81 |
| Routing | Expo Router v6 (file-based) |
| UI | Tamagui v2, React Native core components |
| Icons | expo-symbols (SF Symbols on iOS), MaterialIcons fallback |
| Auth | Supabase Auth (email/password) |
| Storage (auth) | expo-secure-store (iOS Keychain / Android Keystore) |
| Local data | AsyncStorage (temporary — to be replaced by Supabase) |
| Backend client | @supabase/supabase-js |
| API layer | Apollo Client + pg_graphql (GraphQL over Supabase) |
| PDF picking | expo-document-picker |
| File storage | expo-file-system |
| Theme | Custom dark palette in `constants/theme.ts` (accent: #7B5EF8) |

### Backend — `supabase/`
| Layer | Technology |
|-------|-----------|
| Platform | Supabase (hosted) |
| Auth | Supabase Auth — email confirmation disabled |
| Database | PostgreSQL via Supabase |
| API | pg_graphql (auto-generated GraphQL) |
| Edge Functions | Deno — `supabase/functions/process-pdf/` written, not yet deployed |
| Storage | Supabase Storage — `bank-statements` bucket (create manually in dashboard) |

---

## App Screens

### Tab Navigation (3 tabs)
| Tab | File | Status |
|-----|------|--------|
| Home | `app/(tabs)/dashboard.tsx` | done |
| Upload PDF | `app/(tabs)/upload.tsx` | in-progress |
| Profile | `app/(tabs)/profile.tsx` | done |

### Hidden screens (exist but not in tab bar)
- `app/(tabs)/transactions.tsx` — transaction list with search/filter
- `app/(tabs)/chat.tsx` — AI chat interface (shell only)
- `app/(tabs)/insights.tsx` — analytics (shell only)

### Auth & Onboarding
- `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`
- `app/(onboarding)/index.tsx` — collects name, income, goal, currency

### Other
- `app/add-transaction.tsx` — modal to manually add a transaction

---

## Database Schema

### `profiles` table — **live**
```
id (uuid, FK → auth.users)
name, monthly_income, goal, currency
created_at, updated_at (auto-trigger)
RLS: per-user select/insert/update
```

### `transactions` table — **migration written, not applied**
```
id, user_id (FK → auth.users)
type (income/expense), amount, merchant
category, date, notes
RLS: full CRUD per user
Index: user_id + date
```

### `pdf_uploads` table — **migration written, not applied**
```
id, user_id (FK → auth.users)
file_name, storage_path
status: pending | processing | done | failed
transaction_count (int, set on success)
error_message (text, set on failure)
RLS: users can select/insert own rows; edge function uses service role for updates
```

---

## Key Files

| File | Purpose |
|------|---------|
| `supabase/functions/process-pdf/index.ts` | Edge function — PDF → Claude → transactions |
| `FinanceApp/lib/supabase.ts` | Supabase client init |
| `FinanceApp/lib/apollo.ts` | Apollo client (GraphQL) |
| `FinanceApp/lib/graphql/queries.ts` | Profile CRUD queries |
| `FinanceApp/lib/transactions.ts` | Local AsyncStorage transaction helpers |
| `FinanceApp/lib/session.ts` | Auth session management |
| `FinanceApp/constants/theme.ts` | Colour palette (`R.*`) |
| `supabase/migrations/` | DB migrations |
| `supabase/seed.sql` | Demo user + 13 sample transactions |

---

## Current Status (as of 2026-05-16)

### Done
- Auth flow (sign-up, login, onboarding, profile)
- Dashboard with balance, stats, savings goal, recent transactions
- Manual add-transaction modal — saves to Supabase
- Transactions screen — reads from Supabase, shown in tab bar
- Tab bar (4 tabs: Home, Upload PDF, Transactions, Profile)
- Full PDF upload flow — pick PDF → Supabase Storage → `process-pdf` edge function → Claude extracts transactions → saved to `transactions` table
- All migrations applied: `profiles`, `transactions`, `pdf_uploads`, `bank-statements` bucket
- `process-pdf` edge function deployed with `ANTHROPIC_API_KEY` secret
- AI chat — `finance-chat` edge function + chat screen (bubble UI, suggestion chips, typing indicator)

### Active Branch
`feat/chat-bot` — AI chat feature complete (mobile UI + `finance-chat` edge function); not yet deployed or merged

### Planned / Next
- Deploy `finance-chat` edge function + merge `feat/chat-bot` to main
- Insights tab with real spend analysis

### Shelved
- TrueLayer OpenBanking OAuth (`feat/openbankapis`) — blocked by deep-link redirect bug

---

## Open Bugs

| ID | Layer | Title | Status |
|----|-------|-------|--------|
| M-001 | Mobile | TrueLayer OAuth redirect fails — shelved, pivoted to PDF | shelved |
| M-002 | Mobile | Transactions stored only in AsyncStorage | fixed in `feat/-pdf-upload` |
| B-001 | Backend | Transactions not in Supabase | fixed in `feat/-pdf-upload` |

---

## Active Branch
`feat/-pdf-upload`
