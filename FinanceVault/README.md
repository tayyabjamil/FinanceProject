# FinanceVault

Project tracking for the FinanceAI app. Two vaults — one per layer.

## Structure

```
FinanceVault/
├── mobile/          # Expo React Native app (FinanceApp/)
│   ├── features.md  # Feature status tracker
│   ├── branches.md  # Branch register
│   └── bugs.md      # Known bugs
└── backend/         # Supabase project (supabase/)
    ├── features.md  # DB + API feature tracker
    ├── branches.md  # Branch register
    └── bugs.md      # Known bugs
```

## How to use

- **New feature** → add a row to the relevant `features.md` with status `planned`
- **New branch** → add it to `branches.md`
- **New bug** → add it to `bugs.md` with a sequential ID (`M-xxx` mobile, `B-xxx` backend)
- **When merged** → update status in features, mark branch as `merged`, close bug if fixed
