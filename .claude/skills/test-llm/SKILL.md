---
name: test-llm
description: Run Promptfoo regression tests on the narrative and dispute-draft prompts
user-invocable: true
allowed-tools: Bash, Read
---

Run LLM prompt regression tests:

```bash
cd "$CLAUDE_PROJECT_DIR" && npx promptfoo eval 2>&1
```

Report:
- Which tests passed
- Which tests failed and what the assertion was (e.g., "output contained an invented dollar amount")
- Whether the failure is a prompt drift issue or a test fixture issue

If tests fail because the prompt was intentionally changed, update the test fixtures. If tests fail because the prompt drifted and is now hallucinating, flag it immediately — this is a P0 issue.

Do NOT approve any LLM output change that would allow the LLM to produce a dollar figure not present in the input JSON.
