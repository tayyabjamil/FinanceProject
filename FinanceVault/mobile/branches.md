# Mobile Branches

| Branch | Status | Purpose |
|--------|--------|---------|
| `main` | active | Production-ready mobile app |
| `feat/openbankapis` | shelved | TrueLayer OpenBanking OAuth integration — blocked by deep-link redirect URL issue |
| `feat/read_pdf_file` | shelved | Initial PDF branch — superseded by `feat/-pdf-upload` |
| `feat/-pdf-upload` | done | Full PDF upload flow: pick PDF → Supabase Storage → process-pdf edge function → Claude extracts transactions → saved to DB. Transactions screen added to tab bar. AsyncStorage replaced with Supabase. |
