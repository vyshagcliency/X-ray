---
paths: ["src/lib/llm/**", "src/trigger/narrate-llm.ts", "src/trigger/draft-disputes.ts", "tests/llm/**"]
---

# LLM rules

## The contract (read this first)

LLMs in X-Ray have **one job**: write prose around numbers they are given. They do not produce numbers, do not verify numbers, and do not invent numbers. A hallucinated dollar figure in a client's report is an extinction-level credibility event.

> If the number isn't in the input JSON, it does not appear in the output.

Every violation of this rule will be caught by `validate-output.ts` before the report renders — but the goal is to write prompts where violations never occur in the first place.

## Model assignment

| Task | Model ID | Why |
|---|---|---|
| `narrate.ts` — pattern analysis narrative | `claude-sonnet-4-6` | Complex synthesis, ~2k output tokens, once per audit |
| `draft-dispute.ts` — per-case dispute starter | `claude-haiku-4-5-20251001` | Structured, templatable, 25× per audit — cost matters |
| Optional category blurbs | `claude-haiku-4-5-20251001` | Short, fill-in-the-blank |

Never use Opus for X-Ray. Sonnet is the ceiling. When bumping models, update this table, `decisions.md` §2.2, and `architecture.md` §8 in the same change.

## Prompt caching — always on

The system prompt for each LLM call is large (detection rule descriptions, format guide, anti-hallucination guardrails). It is identical across every audit. Apply prompt caching:

```ts
const result = await generateText({
  model: anthropic("claude-sonnet-4-6"),
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: SYSTEM_PROMPT,            // the big static one
          experimental_providerMetadata: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
        { type: "text", text: JSON.stringify(findingsInput) }, // per-audit
      ],
    },
  ],
})
```

This cuts ~70% of token cost from the second audit of the cache window onward.

## Anti-hallucination prompt structure

Every system prompt must include this block verbatim (or an equivalent):

```
You are writing financial prose for a forensic audit report. Rules:

1. Every dollar figure you write must appear in the input JSON under a field ending in _cents or _formatted. Do not compute, round, or invent figures. If a calculation is needed, it has already been done.
2. Always write dollar amounts using the exact `_formatted` string from the input (e.g., "$147,332"). Never use shorthand like "$147k", "$1.2M", or "~$150k". Never abbreviate.
3. Do not invent order IDs, SKUs, ASINs, or case IDs. Reference them only from the input.
4. Do not add findings, categories, or recovery amounts not present in the input.
5. If you need information that isn't provided, write [DATA_UNAVAILABLE] — do not approximate.
6. Output is markdown. No HTML tags.
7. Write in a calm, professional tone. This document will be forwarded to CFOs.
```

## Output validation — every LLM output passes through this

`src/lib/llm/validate-output.ts` runs after every LLM response before anything is saved:

```ts
export function validateLLMOutput(text: string, knownAmounts: bigint[]): ValidationResult {
  // Reject any shorthand before strict matching — prompt bans it, but enforce it too.
  const shorthand = text.match(/\$[\d,.]+\s*(k|K|m|M|B)\b/g)
  if (shorthand?.length) {
    return { valid: false, inventedAmount: shorthand[0], reason: "shorthand" }
  }

  // Extract every "$X,XXX" or "$X,XXX.XX" substring and match against known findings.
  const dollarMatches = text.match(/\$[\d,]+(\.\d{2})?/g) ?? []
  for (const match of dollarMatches) {
    const cents = parseDollarToCents(match)
    if (!knownAmounts.some((a) => a === cents)) {
      return { valid: false, inventedAmount: match, reason: "unknown" }
    }
  }
  return { valid: true }
}
```

On failure: log to Sentry, fall back to template prose, flag in `audit_events`. The report ships; admin sees the flag.

**Why both a prompt rule AND a validator:** the prompt prevents the LLM from producing shorthand in the first place (cheaper). The validator is belt-and-braces — it catches drift, prompt-injection, and tomorrow's model behaving differently.

## Helicone — route everything through it

```ts
// src/lib/llm/client.ts
import { createAnthropic } from "@ai-sdk/anthropic"
import { env } from "@/env"

export function getAnthropic(auditId: string) {
  return createAnthropic({
    baseURL: "https://anthropic.helicone.ai",
    headers: {
      "Helicone-Auth": `Bearer ${env.HELICONE_API_KEY}`,
      "Helicone-Property-AuditId": auditId,   // per-request tagging
    },
  })
}
```

Never instantiate the Anthropic client without Helicone. Helicone is how we track cost per audit (it webhooks to `cost_events`) and debug bad outputs.

## Promptfoo regression tests

`tests/llm/narrate.promptfoo.yaml` tests the narrative with synthetic finding sets:

```yaml
providers:
  - anthropic:claude-sonnet-4-6
prompts:
  - file://../../src/lib/llm/narrate-prompt.txt
tests:
  - vars:
      findings: '{"total_cents":14700000,"top_category":"returns",...}'
    assert:
      - type: not-contains
        value: "calculate"     # LLM should never say it's calculating
      - type: javascript
        value: |
          // No invented amounts — all $ values must be in the input
          const invented = output.match(/\$[\d,]+/g)?.filter(m =>
            !['$147,000'].includes(m)  // known amounts
          )
          return invented?.length === 0
```

Run with `npx promptfoo eval`. Add a test whenever the prompt changes.

## Dispute draft quality bar

The dispute draft is intentionally a **starter**, not a finished product (PRD §6.3). It should:
- Include the case ID, order ID, dates, and dollar gap from the finding evidence
- Reference the relevant Amazon policy (provided in the prompt, not looked up by the LLM)
- Be 150–300 words
- NOT read as a polished professional filing (deliberate; the full filing is the paid service)

Prompts should instruct: "Write a starter dispute message, not a professional filing. Leave [SELLER_SIGNATURE] as a literal placeholder. Omit the supporting-document list (that requires human review). Use a firm but not aggressive tone."

## What NOT to do

- Don't ask the LLM to cross-reference two findings and compute a combined total.
- Don't pass raw CSV rows to the LLM. Pass pre-aggregated, pre-computed finding data only.
- Don't trust the LLM's output for amounts — always run `validate-output.ts`.
- Don't generate findings with the LLM. Findings come from DuckDB rules. LLM adds prose after.
- Don't retry an LLM call that passed validation but produced weak prose — fall back to templates instead.
- Don't use streaming for narrate.ts (it complicates validation). Stream only for UI progress, not LLM output that needs to be validated.
