---
name: Prompt saving rule
description: When to save prompts to the vault prompt logs
type: feedback
---

Only save prompts to `mobile/prompts.md` or `backend/prompts.md` when:
- Starting a real new feature
- Fixing a non-trivial bug that required proper investigation

**Why:** Saving every back-and-forth message clutters the log and makes it useless for interview prep.

**How to apply:** Skip conversational exchanges (e.g. "is it working?", "check the vault", debugging one-liners). Only log prompts where a senior dev would write a proper engineering brief.
