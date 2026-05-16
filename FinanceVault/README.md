# FinanceVault

Project tracking for the FinanceAI app. Two vaults — one per layer.

## Structure

```
FinanceVault/
├── CONTEXT.md       # Full project context — read at session start
├── mobile/          # Expo React Native app (FinanceApp/)
│   ├── features.md      # Feature status tracker
│   ├── branches.md      # Branch register
│   ├── bugs.md          # Known bugs
│   └── prompts.md       # Prompt log — original vs senior-developer version
└── backend/         # Supabase project (supabase/)
    ├── features.md      # DB + API feature tracker
    ├── branches.md      # Branch register
    ├── bugs.md          # Known bugs
    ├── edge-functions.md # Edge function docs + deploy guide
    └── prompts.md       # Prompt log — original vs senior-developer version
```

## How to use

- **New feature** → add a row to the relevant `features.md` with status `planned`
- **New branch** → add it to `branches.md`
- **New bug** → add it to `bugs.md` with a sequential ID (`M-xxx` mobile, `B-xxx` backend)
- **When merged** → update status in features, mark branch as `merged`, close bug if fixed
