# Backend Branches

| Branch | Status | Purpose |
|--------|--------|---------|
| `main` | active | Production migrations — `profiles` table live |
| `feat/transactions-supabase` | planned | Add `transactions` table migration + update mobile to read/write from Supabase |
| `feat/-pdf-upload` | done | All migrations applied, Storage bucket live, process-pdf deployed, ANTHROPIC_API_KEY set. Full PDF → transactions pipeline working. |
