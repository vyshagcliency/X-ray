---
name: test-rule
description: Run detection rule tests with fixture Parquet files and report results
user-invocable: true
allowed-tools: Bash, Read
---

Run the detection rule tests:

```bash
cd "$CLAUDE_PROJECT_DIR" && pnpm test tests/rules/ --reporter=verbose 2>&1
```

Report:
- Which rules passed
- Which rules failed and what the failure was
- Whether the failure is a SQL logic issue, a fixture data issue, or a TypeScript mapping issue

If a rule fails, read the relevant rule file (`src/lib/rules/<rule_id>.ts`) and the fixture (`tests/fixtures/`) and diagnose the root cause before suggesting a fix.
