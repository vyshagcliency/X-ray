# Paste this in the very first message of the new repo's Claude Code session

---

Hey — we're starting a new project called **Baslix Leakage X-Ray**. All the planning docs have already been written and are sitting in this repo. Here's what exists and what you need to know before touching anything:

## Docs you must read before we write a line of code

Read all four of these now:

- `prd.md` — full product spec (detection rules, report structure, admin page, phases)
- `userstories.md` — acceptance criteria per epic, phase groupings
- `architecture.md` — system design, pipeline, DuckDB + Parquet strategy, data model, PDF generation, admin surface
- `decisions.md` — every locked stack decision with rationale and rejected alternatives

After reading, confirm:
1. Which phase we're in (Phase 1 unless I say otherwise)
2. That you understand the DuckDB + Parquet detection architecture (this is the most non-obvious part — ask if unclear)
3. That you understand the LLM contract: narrates pre-computed findings, never calculates

## What this project is

Free forensic audit tool for Amazon FBA sellers ($20M–$100M brands). User uploads 3 Seller Central CSVs (Phase 1), gets a PDF report showing every dollar Amazon owes them. The tool is free — the paid managed-recovery service is the product. CEO-grade PDF forwarded to the CFO is the conversion mechanism.

## The single hardest rule

**LLMs never do arithmetic.** Every dollar figure in every report traces to a `findings.amount_cents` DB column written by a deterministic DuckDB SQL rule. If you ever see code that passes a CSV row or asks the LLM to calculate a number, stop and flag it.

## Stack in one line

Next.js 15 (App Router) + Supabase (Postgres + Storage) + Trigger.dev v4 (parent-child pipeline) + DuckDB (detection rules, pure SQL over Parquet) + Typst WASM (PDF, @react-pdf/renderer fallback) + Claude Sonnet/Haiku via Vercel AI SDK + Resend (single email) + Sentry + PostHog + Uppy/TUS (resumable uploads) + Upstash Redis (rate limit)

## Phase 1 scope (what we're building now)

Per `plan.md` Phase 1:
- Landing + start form (email + brand name)
- Upload page (3 required CSVs: Returns, Adjustments, Reimbursements)
- 3 detection rules (§5.1, §5.2, §5.3 in prd.md)
- Trigger.dev pipeline (validate → parse → detect → narrate → draft → PDF → email)
- In-browser report + PDF download
- Single delivery email (Resend)
- Admin page (audit list, manual review queue, cost monitoring, failed audits)

Do not build Phase 2 features (optional CSVs, rules 5.4–5.9, self-serve delivery, block list, funnel metrics) until Phase 1 is shipped and confirmed.

## Before writing any code

1. Create `plan.md` based on the Phase 1 scope above (tasks, checkboxes)
2. Scaffold the Next.js project with `pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"`
3. Set up Supabase project and run migrations from `migrations/`
4. Set up Trigger.dev project
5. Then confirm the scaffold is clean before we proceed

Ready when you are.
