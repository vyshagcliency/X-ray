# Baslix Leakage X-Ray

Free forensic audit tool for Amazon FBA sellers. User uploads 3–8 Seller Central CSVs; 3–8 minutes later they get a PDF showing every dollar Amazon owes them, with dispute-ready evidence and countdowns on closing dispute windows. No login, no signup, no friction.

The audit is the bait. Recovery (the paid service) is the product.

## Reference Docs (read on demand, not auto-loaded)

| Doc | Path | Contains | When to Read |
|-----|------|----------|--------------|
| PRD | `prd.md` | Full spec: detection rules, report structure, admin page, edge cases | Before each phase — has cases not in plan |
| User Stories | `userstories.md` | Stories, personas, acceptance criteria, phase groupings | Before each phase — acceptance criteria live here |
| Architecture | `architecture.md` | System flow, pipeline, data model, DuckDB + Parquet, PDF strategy, admin surface | New modules, API work, data shape questions |
| Decisions | `decisions.md` | Locked stack choices with rationale | Before re-evaluating any tool/approach |
| Plan | `plan.md` | Phased build plan with checkboxes | Start of every session — check current phase |

**Rule: Do not re-debate accepted decisions.** Choices in `decisions.md` are final unless new evidence is presented. State concerns openly — never silently deviate.

Path-specific rules live in `.claude/rules/` — **these are reference docs, not auto-loaded**. Read the relevant file before touching matching code:

| File | Read before editing |
|---|---|
| `frontend.md` | `src/components/**`, `src/app/**/*.tsx` |
| `api-routes.md` | `src/app/api/**`, admin routes |
| `detection-rules.md` | `src/lib/rules/**`, `src/lib/duckdb/**`, `src/trigger/detect-rule.ts`, `src/trigger/parse-csv.ts`, `tests/rules/**` |
| `llm.md` | `src/lib/llm/**`, `src/trigger/narrate-llm.ts`, `src/trigger/draft-disputes.ts`, `tests/llm/**` |
| `security.md` | `src/env.ts`, auth/middleware, API routes, `src/lib/security/**`, `src/lib/db/**`, `src/lib/storage/**` |

Once `src/` is scaffolded, these will migrate to nested `CLAUDE.md` files at the matching paths so they auto-load when Claude works in those directories.

---

## How to Work

### Think first, code second
- State assumptions explicitly before implementing. Don't pick an interpretation silently.
- When ambiguity exists, present both readings and ask — don't guess.
- When confused, stop and name what's unclear. Partial understanding produces the worst code.
- When a simpler approach exists, say so. Push back against the user's framing when warranted.
- Surface tradeoffs openly — especially the ones that would be easier to hide.

### Simplicity first
- Minimum code that solves the stated problem. Nothing speculative.
- No abstractions for single-use code. No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios. No premature optimization.
- If 200 lines could be 50, rewrite it.
- The test: would a senior engineer say this is overcomplicated? If yes, simplify.

### Surgical changes
- Touch only what the task requires. Don't "improve" adjacent code, comments, or formatting.
- Match existing style, even if you'd do it differently.
- Remove imports/variables/functions only if YOUR changes made them unused. Don't remove pre-existing dead code unless asked.
- If you notice unrelated dead code or bugs, **mention them — don't fix them in the same change**.
- Don't modify comments or code you don't fully understand, even if they look orthogonal.
- Every changed line should trace directly to the request.

### Goal-driven execution
- Transform tasks into verifiable success criteria before coding. Strong criteria let you loop independently.
- For multi-step tasks, state a brief plan with verify steps.
- "Fix the bug" → write a test that reproduces it, then make it pass.
- "Add a detection rule" → write the fixture Parquet + expected findings first, then make it pass.
- "Refactor X" → ensure tests pass before and after; no behavior change.

### Research before committing
- If a better tool/approach might exist, research it before locking in.
- Check current state of libraries (breaking changes, deprecations, better alternatives).

### When to skip this rigor
- Trivial tasks (typo fixes, obvious one-liners) don't need the full rigor above. Use judgment.
- The goal is reducing costly mistakes on non-trivial work, not slowing down simple edits.

---

## Phase Workflow

`plan.md` is the single source of truth for what has shipped, what's in flight, and what's next. Every session starts by reading it. Every sub-phase ends by updating it.

**Starting a phase:**
1. Read `plan.md` — find the current phase and its research checkpoint
2. Complete the research checkpoint first (verify external APIs, Amazon report formats, model IDs — things drift)
3. Read the PRD sections, user stories, and architecture sections referenced by the sub-phase
4. Plan the sub-phase's approach, surface ambiguity, get user approval before coding

**During implementation:**
5. Write tests alongside code (not after). Detection rules especially — fixture Parquet in, expected findings out.
6. **Check off plan items the moment they're done** — never batch.
7. If the approach needs to change, update `plan.md` in place (don't silently deviate). If the change is architectural, also update `architecture.md`. If the change reverses or supersedes a locked choice, add a row to the `decisions.md` change log with the date and trigger.

**Completing a sub-phase:**
8. Verify the sub-phase's exit gate from `plan.md` is fully met
9. `pnpm build && pnpm lint && pnpm test` — all passing, zero regressions

**Completing a phase:**
10. Verify the phase-level exit gate in `plan.md` is met (every sub-phase's checkboxes ticked, acceptance criteria from `userstories.md` passed)
11. Sweep for TODOs/placeholders that should be resolved this phase
12. **Update `plan.md`** — check off remaining items, move the status pointer, add a line to its change log
13. **Update `architecture.md`** — if any component, data model, or pipeline shape changed during the phase, fold it into the relevant section (don't append — rewrite the affected lines)
14. **Update `decisions.md`** — if any locked decision was superseded or a new locked decision was made, add a row to its change log with the date and the trigger
15. **Update any `.claude/rules/*.md`** whose scope was touched (detection-rules.md when a new rule lands, etc.)
16. Post a phase summary to the user: what shipped, what deferred, what the phase-3 gate needs
17. **Do not start the next phase without explicit user confirmation.**

---

## Doc Maintenance

Update docs in the same session as the code change. Never defer to "later."

| What Changed | Update |
|---|---|
| Sub-phase item done | Check it off in `plan.md` the moment it's done — never batch |
| Sub-phase exit gate met | Mark the gate ticked in `plan.md` + post summary to user |
| Phase exit gate met | Update plan status + move pointer + append to `plan.md` change log + update `architecture.md` for any shape changes + update `decisions.md` change log for any superseded locks |
| Plan re-scope mid-phase | Update `plan.md` in place with the reason; if architectural → also `architecture.md`; if overrides a lock → also `decisions.md` change log |
| New architectural pattern | Add to `architecture.md` (rewrite affected lines, don't append) |
| New tool/library decision | Add to `decisions.md` change log with rationale + date |
| Superseded locked decision | Update the decision row in `decisions.md` + add a change-log entry citing the trigger |
| New coding convention | Add to this file (Coding Conventions) |
| Design system change | Update `.claude/rules/frontend.md` |
| New detection rule | Add to rule registry + add fixture test + update PRD §5 if logic changes |

**Frozen docs** — `prd.md` and `userstories.md` are the canonical requirements. Never edit silently. If implementation deviates, capture the deviation in `decisions.md` change log.

**Anti-bloat rule** — Update existing lines, don't append. If a section grows past its purpose, extract to the right doc.

---

## Tech Stack

| Category | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Package Manager | pnpm |
| Database | Supabase Postgres (outputs only: audits, findings, events, costs) |
| Object Storage | Supabase Storage v3 (raw CSVs, derived Parquet, final PDFs) |
| Resumable Uploads | Uppy Dashboard + `@uppy/tus` → Supabase Storage TUS endpoint |
| CSV header sniffing | PapaParse (`preview: 50`, client-side) |
| **Analytics engine (detection)** | **DuckDB (`@duckdb/node-api`), in-process** — pure SQL over Parquet |
| **Working-set format** | **Parquet (written by DuckDB during parse)** |
| Background Jobs | Trigger.dev v4 (parent-child with `batchTriggerAndWait`) |
| LLM | Vercel AI SDK + Anthropic Claude (Sonnet 4.5 + Haiku 4.5) + prompt caching |
| LLM Observability | Helicone (proxy) |
| LLM Testing | Promptfoo |
| PDF (primary) | Typst via `@myriaddreamin/typst.ts` (WASM) |
| PDF (fallback) | `@react-pdf/renderer` |
| Email | Resend + React Email (single transactional report-delivery email) |
| Auth (admin only) | Supabase Auth — password |
| Validation | Zod v4 |
| Env Vars | T3 Env |
| Server Actions | next-safe-action |
| Forms | React Hook Form + Zod resolver |
| Styling | Tailwind CSS v4 + @tailwindcss/typography |
| UI | shadcn/ui (New York) + Launch UI blocks |
| Animation | Motion (Framer Motion) — sparingly |
| Charts | shadcn/ui chart (Recharts) |
| Markdown Rendering | react-markdown + remark-gfm |
| Sanitization | isomorphic-dompurify |
| Security Headers | Nosecone |
| Rate Limiting | Upstash Redis + `@upstash/ratelimit` |
| Concurrency | p-limit |
| Error Tracking | Sentry (native Trigger.dev + Next.js integrations) |
| Product Analytics | PostHog (funnels, cohorts, session replay) |
| Linting | ESLint v9 flat config + Prettier |
| Testing | Vitest (detection rules, CSV validation, LLM output validation) |
| Deployment | Vercel Hobby · Trigger.dev Cloud · Supabase Cloud |

---

## Commands

```bash
pnpm dev              # Dev server
pnpm build            # Production build
pnpm lint             # ESLint
pnpm lint --fix       # ESLint auto-fix
pnpm format           # Prettier
pnpm test             # Vitest
pnpm test:watch       # Vitest watch
pnpm db:migrate       # Supabase migrations
pnpm db:types         # Regenerate Supabase TS types
npx promptfoo eval    # LLM prompt regression tests
npx trigger.dev dev   # Trigger.dev worker
```

---

## Project Structure

```
src/
  app/
    (public)/
      page.tsx                     # Landing
      start/page.tsx               # Email + brand capture
      upload/[id]/page.tsx         # Uppy dashboard (tiles per report)
      run/[id]/page.tsx            # Processing (useRealtimeRun)
      r/[uuid]/page.tsx            # In-browser report
    (admin)/
      admin/
        page.tsx                   # Dashboard
        audits/page.tsx
        audits/[id]/page.tsx
        review/[id]/page.tsx       # Phase 1 approval queue
        cost/page.tsx
        funnel/page.tsx            # PostHog embed + audits $ metrics
        blocklist/page.tsx
        failures/page.tsx
    api/
      upload-token/route.ts        # Scoped Supabase Storage JWT
      upload-complete/route.ts     # Record raw_uploads row
      audit/run/route.ts           # Enqueue parent Trigger.dev task
      admin/approve/route.ts       # Flip pending_review → completed + notify
      admin/reject/route.ts
      deletion/route.ts            # User-initiated deletion requests
  components/
    landing/                       # Hero, SampleCards, TrustSignals
    upload/                        # UppyDashboard, ReportTile, ValidationBadge
    processing/                    # StageStream, Timeline
    report/                        # HeadlineStrip, CategoryCards, UrgencyBar, TopCasesTable, PatternBlock, CtaBlock
    admin/                         # AuditTable, CostChart, FunnelChart, BlockListTable, FailureCard
    ui/                            # shadcn/ui base
  lib/
    db/                            # Supabase clients (anon + service-role)
    storage/                       # Signed URL helpers, upload-token issuer
    csv/
      headers.ts                   # Per-report header signatures (zod)
      validate-client.ts           # PapaParse preview + match (client-only)
    duckdb/
      client.ts                    # DuckDB connection factory (per-task)
      parse-to-parquet.ts          # CSV → typed Parquet via COPY
      run-rule.ts                  # Executes rule SQL against Parquet → findings
    rules/                         # Each rule is pure SQL, registered in index.ts
      returns-gap.ts               # §5.1
      inventory-lost.ts            # §5.2
      refund-reimbursement-mismatch.ts  # §5.3
      # ... Phase 2 and 3 rules
      index.ts                     # { id, version, sql, requiredReports, confidenceFn }
    llm/
      narrate.ts                   # Sonnet 4.5 pattern narrative
      draft-dispute.ts             # Haiku 4.5 per-case drafts
      validate-output.ts           # Ensures no invented numbers
    pdf/
      typst-render.ts              # Primary
      react-pdf-render.tsx         # Fallback
      data-builder.ts              # Findings → render input JSON
    email/
      templates/ReportReady.tsx    # React Email
      send.ts                      # Resend client
    cost/
      record.ts                    # Write cost_events
      circuit-breaker.ts           # Enforce MAX_COST_PER_AUDIT_CENTS
    security/
      dompurify.ts                 # Isomorphic config
      nosecone.ts                  # CSP config
      rate-limit.ts                # Upstash wrappers
    analytics/
      posthog.ts                   # Server + client init, event helpers
    observability/
      sentry.ts                    # Trigger.dev + Next.js init helpers
    format.ts                      # formatDollars(), formatPct() — cents→display at UI boundary
  trigger/
    audit-run.ts                   # Parent task
    validate-csv.ts                # Child × N reports
    parse-csv.ts                   # Child × N — DuckDB → Parquet
    detect-rule.ts                 # Child × M — generic, takes rule_id, runs from registry
    materialize-cases.ts           # Pulls top-25 source rows into case_source_rows
    narrate-llm.ts
    draft-disputes.ts              # Child × 25
    render-pdf.ts
    notify-email.ts
    purge-raw-uploads.ts           # Scheduled daily
  types/
    audit.ts, findings.ts, reports.ts, admin.ts
  middleware.ts                    # Admin route guard
  instrumentation.ts               # Sentry Next.js init
  env.ts                           # T3 Env schema
templates/
  report.typ                       # Typst template + imported partials
tests/
  rules/                           # One file per rule, fixture Parquet in → expected findings out
  validation/                      # Header-signature tests
  llm/                             # Output-validation tests
migrations/
  *.sql                            # Supabase migrations
```

---

## Coding Conventions

- Functional components, named exports (except `page.tsx`)
- `interface` for objects, `type` for unions/intersections
- Monetary values as **cents (`bigint` integers)** — dollars at display only via `Intl.NumberFormat`
- `@/` path alias for all internal imports
- Import order: React/Next → external → `@/` internal → relative
- API errors: `{ error: string, code: string }` — never expose internals
- LLM output: always sanitize with DOMPurify before rendering
- LLM narrates from pre-computed JSON — **never calculates**
- **Detection rules are pure SQL** — no math in TypeScript, no loops over result sets
- Trigger.dev task names: `namespace.verb` — e.g., `audit.run`, `validate.csv`, `render.pdf`
- DB columns: `snake_case`; TypeScript mirrors as `camelCase` via typed client layer
- Migrations in `migrations/` with sequential timestamps

---

## Common Pitfalls

1. **LLM calculating numbers** — The #1 credibility risk. All dollar figures come from `findings.amount_cents`. The LLM writes prose around pre-computed data. Before render, every `$X` substring in LLM output is validated against known finding amounts; mismatches fall back to template prose.
2. **Writing detection logic in TypeScript** — Don't. Write pure SQL against Parquet via DuckDB. The SQL IS the rule. TypeScript code wraps execution, maps rows to `findings` inserts, and attaches `rule_version`. If you find yourself writing a JS `for` loop over returned rows to "adjust" amounts, stop — that calculation belongs in SQL.
3. **Putting raw CSV rows into Postgres** — No. Raw CSVs live in Supabase Storage. `parse.csv` converts them to Parquet (also in Storage). Detection queries Parquet via DuckDB. Postgres stores **outputs only** (findings, audits, events, costs, top-25 case source rows).
4. **Cents vs dollars** — Internal code uses `bigint` cents everywhere. Only convert at the display boundary. Never pass dollar floats between functions.
5. **API keys on client** — All external API calls are server-side only. Never `NEXT_PUBLIC_` an API key. T3 Env schema enforces this.
6. **CSV data persistence** — Raw CSVs auto-purge at 30 days via scheduled `purge.raw-uploads` task. Parquet files survive (smaller, re-runnable). Findings persist indefinitely. Privacy promise is enforced in code, not policy.
7. **LLM seeing raw CSV rows** — Never. LLMs receive aggregated + precomputed findings JSON only. Raw rows stay in Parquet + DuckDB. Helicone logs therefore never contain customer PII.
8. **SaaS dashboards** — X-Ray is a **one-shot report tool**. Each audit produces one report URL + one PDF. No user accounts, no log-in-to-see-history. The report page IS the product. Admin is separate and internal only.
9. **Admin indexed or linked** — `/admin` is `noindex` + `robots.txt` disallow + never linked from any public page. Accidentally linking it would expose operator data.
10. **Two-phase flows like ChannelScope** — X-Ray is linear: upload → parse → detect → narrate → render → notify. Do not introduce ChannelScope's Step 1 → CSV → Step 2 patterns.
11. **Cross-rule coupling** — Each detection rule is independent. A failing rule never blocks others; the report flags the missing category. Do not write rules that depend on other rules' outputs.
12. **Overbuilding for later phases** — Each phase plans fresh against actual code. Don't pre-build Phase 2 rules during Phase 1.

---

## Hard Rules

- **LLM narrates, never calculates.** Every `$X` in output must trace to a `findings.amount_cents`.
- **Detection rules are pure SQL.** Not "mostly SQL." Not "SQL with a bit of post-processing." Pure SQL.
- **Cents integers internally, format at display.** No dollar floats anywhere internal.
- **Raw CSV purged at 30 days.** Enforced by scheduled task, not policy.
- **No LLM sees raw CSV rows.** Aggregates + precomputed findings only.
- **Admin is `noindex` + `robots.txt` disallow + unlinked.** No exceptions.
- **No email sequences.** Exactly one transactional email per audit. No drips, no nurtures.
- **No CRM / Slack / analytics vendor that sees $ figures.** PostHog events carry event names only, never payloads with finding data.
- **No auth for end users.** UUID report URLs are the only capability.
- **No SP-API in v1.** CSV upload is the entire data-ingest surface.
- **Every finding carries `rule_id` + `rule_version` + `row_ref`.** Old reports stay reproducible and defensible.
- **Per-audit cost circuit breaker at $50.** If exceeded mid-pipeline, next LLM stage falls back to templates.
- **No features beyond current phase in `plan.md`.** Stay scoped.
