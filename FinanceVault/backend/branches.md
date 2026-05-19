# Backend Branches

| Branch | Status | Purpose |
|--------|--------|---------|
| `main` | active | Production migrations — `profiles` table live |
| `feat/-pdf-upload` | done | pdf_uploads table, bank-statements bucket, process-pdf edge function deployed |
| `feat/AI-tables` | in-progress | Migrations 000004 + 000005 — AI enrichment columns + categories table on transactions; edge function prompt updated; TypeScript types updated |
| `feat/chat-bot` | in-progress | `finance-chat` edge function — fetches user transactions, builds financial summary, calls Claude Haiku, returns AI answer; feature complete, not yet deployed |
