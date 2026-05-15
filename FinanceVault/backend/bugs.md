# Backend Bugs

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| B-001 | Transactions not in Supabase | open | Transactions are stored in mobile AsyncStorage only — no backend table. Creates data loss risk on reinstall. Fix: apply `20250101000001_transactions.sql` and update mobile `lib/transactions.ts` to use Supabase. |
