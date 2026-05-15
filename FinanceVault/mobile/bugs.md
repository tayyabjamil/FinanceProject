# Mobile Bugs

| ID | Title | Status | Branch | Description |
|----|-------|--------|--------|-------------|
| M-001 | TrueLayer OAuth redirect fails | open | `feat/openbankapis` | `financeaiapp://truelayer-callback` deep link does not complete the OAuth flow. Workaround: pivoted to PDF upload (`feat/read_pdf_file`). |
| M-002 | Transactions stored only locally | open | `main` | Transactions use AsyncStorage — lost on app reinstall / no cross-device sync. Fix: migrate to Supabase `transactions` table. |
