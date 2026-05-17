# Mobile Bugs

| ID | Title | Status | Branch | Description |
|----|-------|--------|--------|-------------|
| M-001 | TrueLayer OAuth redirect fails | open | `feat/openbankapis` | `financeaiapp://truelayer-callback` deep link does not complete the OAuth flow. Workaround: pivoted to PDF upload (`feat/read_pdf_file`). |
| M-002 | Transactions stored only locally | fixed | `feat/-pdf-upload` | Migrated `lib/transactions.ts` to Supabase. `listTransactions` reads from DB, `addTransaction` writes to DB. |
