# Mobile Branches

| Branch | Status | Purpose |
|--------|--------|---------|
| `main` | active | Production-ready mobile app |
| `feat/openbankapis` | shelved | TrueLayer OpenBanking OAuth integration — blocked by deep-link redirect URL issue |
| `feat/-pdf-upload` | done | Full PDF upload flow — pick PDF → Supabase Storage → edge function → Claude → transactions in DB |
| `feat/AI-tables` | in-progress | AI enrichment on transactions — merchant_clean, category_ai, is_subscription fields |
