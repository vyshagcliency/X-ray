---
name: lint-fix
description: Run ESLint auto-fix then Prettier across the whole project
user-invocable: true
allowed-tools: Bash
---

```bash
cd "$CLAUDE_PROJECT_DIR" && pnpm lint --fix && pnpm format
```

Report how many files were changed. If any errors remain that couldn't be auto-fixed, list them with file and line number.
