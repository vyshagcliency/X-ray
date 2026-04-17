# Baslix Leakage X-Ray — Build Plan

**Version:** 1.0
**Companion to:** prd.md, userstories.md, architecture.md, decisions.md
**Status:** Active
**Last updated:** 2026-04-18

---

## How this document works

This is the ordered, checkboxed build plan. It is the single source of truth for **what has been shipped, what's in flight, and what's next.**

- Phases and sub-phases are **ordered** — ship sequentially unless a sub-phase is explicitly marked parallel-safe.
- Each sub-phase has an **exit gate** — a concrete, verifiable condition. Do not close a sub-phase until every gate condition is met.
- Every sub-phase lists **relevant PRD / user-story / architecture references** so you can pull the authoritative detail without re-reading everything.
- **Research checkpoints** at the top of each phase call out moving pieces that must be verified against current documentation before implementation begins. APIs drift. Amazon report columns drift. Verify first.
- **Do not start the next phase without explicit user confirmation.**

### Rules for updating this file

1. **Check off items the moment they're done** — never batch.
2. **Do not silently re-scope.** If a sub-phase needs to change, update it in-place with a note, and if the change is architectural, update `architecture.md`; if it changes a locked choice, update the `decisions.md` change log.
3. **Never delete completed items** — they're the shipped record. Only add a strikethrough or a `(descoped: reason)` annotation if a completed item is reversed later.
4. **Phase transitions are gated by the user.** When a phase's exit gate is met, post a summary and wait for sign-off before opening the next phase.

### Legend

- `[ ]` not started · `[~]` in progress · `[x]` done · `[-]` descoped (with reason)
- **P0/P1/P2/P3** — priority from `userstories.md`
- 🔬 **Research** — a task that requires reading current external docs before coding
- 🔒 **Gate** — exit condition for a sub-phase

---

## Phase overview

| Phase | Name | Target duration | Goal |
|---|---|---|---|
| **0** | Foundation & scaffolding | 3–5 days | Clean Next.js app, all external services provisioned, migrations run, env validated, CI passing |
| **1** | MVP ship | 4–6 weeks | First 50 brands can self-serve an audit; Vyshag manually reviews; 3 detection rules live |
| **2** | Full Bucket 3 | 6 weeks | All 10 core detection rules, self-serve delivery, admin funnel, block list, user-initiated deletion automation |
| **3** | Bucket 2 + growth | 3–6 months | Fee anomaly rule, SP-API continuous monitoring, whitelabel partnerships, Contract-vs-Reality v2, free-disputes conversion lever |

---

## Phase 0 — Foundation & scaffolding

**Goal:** A repo that builds, lints, tests, deploys, and connects to every external service. No product code yet. Nothing user-facing.

**Exit gate:** `pnpm build && pnpm lint && pnpm test` all pass on a clean clone. `pnpm dev` boots. `npx trigger.dev dev` connects. Vercel preview deploy succeeds. Supabase migrations applied. Sentry + PostHog + Helicone wired and receiving events from a hello-world route.

### 🔬 Research checkpoint (before starting)

- [ ] Confirm **Next.js 15** is the current stable line (if Next 16 has shipped stably, flag to user — `architecture.md §9.1` locks us to 15, but `decisions.md` 2026-04-18 entry anticipates this).
- [ ] Confirm **DuckDB `@duckdb/node-api`** latest API — verify the `COPY ... TO 'file.parquet'` + `read_parquet` patterns still work as documented in `architecture.md §5.4`.
- [ ] Confirm **Trigger.dev v4** `triggerAndWait` / `batchTriggerAndWait` + `metadata.set` / `@trigger.dev/react-hooks` `useRealtimeRun()` APIs are stable.
- [ ] Confirm **Supabase Storage TUS resumable** endpoint path (`/storage/v1/upload/resumable`) and chunk size (6MB) against current Supabase docs.
- [ ] Confirm **`@myriaddreamin/typst.ts`** bundle size and WASM compatibility with Trigger.dev workers.
- [ ] Confirm **Anthropic model IDs** (`claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) are still current — these were locked 2026-04-18.

### 0.1 Repo scaffold

- [ ] Initialize Next.js 15 App Router app: `pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"`
- [ ] Configure `tsconfig.json` with strict mode, `@/` alias
- [ ] Install core deps: `zod`, `@t3-oss/env-nextjs`, `next-safe-action`, `react-hook-form`, `@hookform/resolvers`, `motion`, `p-limit`
- [ ] ESLint v9 flat config + Prettier, matching coding conventions in CLAUDE.md
- [ ] `vitest.config.ts` with path alias, test file discovery under `tests/`
- [ ] `package.json` scripts: `dev`, `build`, `lint`, `format`, `test`, `test:watch`, `db:migrate`, `db:types`
- [ ] `.gitignore` — include `.gitignore-additions.txt` contents
- [ ] Commit and push initial scaffold

### 0.2 External service provisioning

- [ ] Create Supabase project (Pro tier or Free to start)
- [ ] Create Trigger.dev v4 project
- [ ] Create Vercel project, link to repo
- [ ] Create Resend account + verify sending domain
- [ ] Create Upstash Redis database (free tier)
- [ ] Create Anthropic API key
- [ ] Create Helicone project, grab proxy URL + key
- [ ] Create Sentry project (Next.js + Trigger.dev integrations)
- [ ] Create PostHog Cloud EU project
- [ ] Purchase / confirm `xray.baslix.com` DNS (arch §15 deferred decision — confirm with Vyshag before pointing DNS)
- [ ] Add all secrets to Vercel + Trigger.dev env (never `NEXT_PUBLIC_*`)

### 0.3 Env + validation

- [ ] `src/env.ts` — T3 Env schema covering every secret listed in `architecture.md §10.2`
- [ ] Schema explicitly rejects `NEXT_PUBLIC_*` prefixed secrets (decisions §3 hard rule)
- [ ] Add a `/api/health` route that touches each external service once on request (Supabase select, Trigger.dev ping, Anthropic models list, Resend ping)

### 0.4 Database migrations

**Reference:** `architecture.md §4`

- [ ] Migration: `audits` table (arch §4.1)
- [ ] Migration: `raw_uploads` table (arch §4.2)
- [ ] Migration: `case_source_rows` table (arch §4.3b)
- [ ] Migration: `findings` table + indexes (arch §4.4)
- [ ] Migration: `audit_events` table (arch §4.5)
- [ ] Migration: `cost_events` table (arch §4.5)
- [ ] Migration: `rule_versions` table (arch §4.5)
- [ ] Migration: `block_list` table (arch §4.5)
- [ ] Migration: `deletion_requests` table (arch §4.5)
- [ ] Migration: RLS policies — `deny all` to anon + authenticated on every server-only table (arch §4.6)
- [ ] Migration: seed Vyshag's admin user with `role: 'admin'` app_metadata claim
- [ ] `pnpm db:types` regenerates TypeScript types into `src/types/supabase.ts`

### 0.5 Security baseline

**Reference:** `.claude/rules/security.md`

- [ ] `src/lib/security/nosecone.ts` — CSP per arch §10.5 (include `wasm-unsafe-eval` for Typst)
- [ ] `src/lib/security/rate-limit.ts` — Upstash wrappers for the three limits in arch §10.4
- [ ] `src/lib/security/dompurify.ts` — isomorphic DOMPurify config
- [ ] `src/middleware.ts` — admin route guard (arch §9.1) + Nosecone headers application
- [ ] `robots.txt` — disallow `/admin`, `/r/`, `/run/`, `/upload/`, `/start`, `/deletion/` (only landing + legal pages are indexable)

### 0.6 Observability wiring

- [ ] `src/instrumentation.ts` — Sentry Next.js init with `beforeSend` filter stripping CSV data, order IDs, emails, dollar values (arch §14.1)
- [ ] `src/lib/observability/sentry.ts` — helper for tagging Trigger.dev task errors
- [ ] `src/lib/analytics/posthog.ts` — server + client init, event helpers; event names only, no PII payloads (arch §14.1)
- [ ] Helicone base URL configured as Anthropic `baseURL` override
- [ ] `/api/health` now also logs a test event to Sentry + PostHog

### 0.7 CI/CD baseline

- [ ] GitHub Actions workflow: on PR, run `pnpm lint && pnpm build && pnpm test` (no deploys from CI — Vercel owns that)
- [ ] Vercel: enable preview deploys per branch
- [ ] Trigger.dev: confirm deploy on push to `main`
- [ ] Smoke test: push a branch, land a PR, confirm Vercel preview builds, confirm Sentry receives an event

### 🔒 Phase 0 exit gate

- [ ] All `pnpm` scripts pass cleanly on a fresh clone.
- [ ] Preview deploy URL boots, `/api/health` returns green for all services.
- [ ] Migrations applied, DB types generated, RLS verified (manual check: signing in as anon returns zero rows on `audits`).
- [ ] Sentry + PostHog + Helicone each received at least one event from the deployed preview.
- [ ] **User confirmation received before starting Phase 1.**

---

## Phase 1 — MVP ship

**Goal:** 50 brands can upload 3 CSVs, wait 3–8 minutes, and get a PDF report. Vyshag reviews each one manually via `/admin/review/:id` before the user receives the email. Three detection rules live: returns gap, inventory lost/damaged, refund/reimbursement mismatch.

**Exit gate:** End-to-end test with 3 real brand datasets produces defensible PDFs. All P0-Phase-1 user stories pass their acceptance criteria. Per-audit cost stays under $30. Vyshag has approved and sent ≥3 real reports through the manual review queue.

### 🔬 Research checkpoint (before starting)

- [ ] Pull **current Amazon Seller Central report formats** — the four required reports (`prd.md §4.3`). Record the header rows as of today in `src/lib/csv/headers.ts`. Amazon has renamed columns before; the MVP's validation layer cannot be stale.
- [ ] Confirm **Anthropic prompt caching** API shape (`cache_control: { type: "ephemeral" }`) and the minimum cacheable prompt length.
- [ ] Confirm **Vercel AI SDK v5+** `generateText`/`generateObject` shape for Claude models via custom `baseURL` (Helicone).
- [ ] Confirm **Typst syntax + `@myriaddreamin/typst.ts`** embed API for the `json(...)` data injection pattern (arch §7.1).
- [ ] Confirm **Uppy Dashboard** + `@uppy/tus` plugin props (endpoint, custom headers for Supabase JWT).
- [ ] Confirm **Supabase signed upload URLs** — the upload-token issuance API and scoping to a specific storage path.

### 1.1 Public intake — landing + start form

**User stories:** US-1.1, US-1.2, US-2.1, US-2.2 · **PRD:** §4.1, §4.2

- [ ] `src/app/(public)/page.tsx` — landing page
  - [ ] Hero with headline, subhead, trust line (PRD §4.1)
  - [ ] 60-second screen recording embed (placeholder video OK until Phase 1.11)
  - [ ] Three anonymized sample finding cards
  - [ ] "About Baslix" block (US-1.2)
  - [ ] Footer with privacy policy + terms links
- [ ] `src/app/(public)/start/page.tsx` — email + brand form
  - [ ] Zod-validated form (email, brand_name, legal_checkbox) via next-safe-action + React Hook Form
  - [ ] Disposable email domain rejection (US-2.2)
  - [ ] Block-list check against `block_list` table (US-2.2)
  - [ ] Rate limit: 5/domain/30d + 10/IP/day (arch §10.4)
  - [ ] Insert `audits` row with `status = 'pending_upload'`
  - [ ] Redirect to `/upload/[id]`
- [ ] `src/app/(public)/privacy/page.tsx` — real privacy policy reflecting PRD §9.2 + arch §10.1 language
- [ ] `src/app/(public)/terms/page.tsx` — terms of service
- [ ] PostHog events: `landing.viewed`, `start.submitted`, `start.blocked`

### 1.2 Upload — Uppy + TUS + client-side validation

**User stories:** US-3.1, US-3.2, US-3.3, US-3.5 · **PRD:** §4.3 · **Arch:** §6

- [ ] `src/lib/csv/headers.ts` — zod schemas for the three required Phase-1 reports (Returns, Adjustments, Reimbursements)
- [ ] `src/lib/csv/validate-client.ts` — PapaParse `preview: 50` sniffer + header-signature match
- [ ] `src/components/upload/ReportTile.tsx` — tile with report name, menu path, 4-screenshot walkthrough accordion, drop zone, validation badge
- [ ] `src/components/upload/UppyDashboard.tsx` — Uppy Dashboard wrapper scoped per report type, wired to `@uppy/tus` → Supabase Storage TUS endpoint
- [ ] `src/app/api/upload-token/route.ts` — issues scoped Supabase Storage JWT (path-restricted to `raw/{audit_id}/{report_type}/`, 30-min TTL)
- [ ] `src/app/api/upload-complete/route.ts` — inserts `raw_uploads` row on client callback
- [ ] `src/app/(public)/upload/[id]/page.tsx` — page with tiles for Returns, Adjustments, Reimbursements
  - [ ] 5 plain-English privacy bullets (US-8.1) above the tiles
  - [ ] "Run audit" button disabled until all three validated
- [ ] `src/app/api/audit/run/route.ts` — enqueues `audit.run` Trigger.dev task, flips status to `processing`, redirects to `/run/[id]`
- [ ] PostHog events: `upload.page_viewed`, `upload.file_dropped`, `upload.validated`, `upload.rejected_wrong_report`, `upload.completed`, `audit.started`

### 1.3 Core pipeline — validate + parse

**User stories:** US-4.4, US-4.5 · **PRD:** §7.2 · **Arch:** §5

- [ ] `src/trigger/audit-run.ts` — parent task using `batchTriggerAndWait` for each stage
- [ ] `src/trigger/validate-csv.ts` — child task, one per uploaded report
  - [ ] DuckDB `read_csv` sniff + first-100-row scan
  - [ ] Zod header-signature re-check server-side (client sniff is defense-in-depth, not authoritative)
  - [ ] Populate `row_count` + `date_range_*` on `raw_uploads`
  - [ ] Fail-fast with actionable message on bad report
- [ ] `src/lib/duckdb/client.ts` — per-task DuckDB connection factory
- [ ] `src/lib/duckdb/parse-to-parquet.ts` — `COPY (SELECT typed_cols FROM read_csv('<url>')) TO 'parquet/...'` with zstd, including stable `row_ref` generation
- [ ] `src/trigger/parse-csv.ts` — child task that streams CSV → Parquet → upload to Supabase Storage at `parquet/{audit_id}/{type}.parquet`
- [ ] `src/lib/db/audit-events.ts` — helper that writes `audit_events` rows on every stage transition
- [ ] Idempotency keys on every child: `{audit_id}:{stage}:{input_hash}` (decisions §3)
- [ ] Retries: `maxAttempts: 3, factor: 2`

### 1.4 Detection rules (Phase 1) + cost ledger

**User stories:** US-5.1, US-5.2, US-5.3, US-9.7 · **PRD:** §5.1–5.3 · **Rules reference:** `.claude/rules/detection-rules.md`

- [ ] `src/lib/rules/index.ts` — rule registry with `{ id, version, sql, requiredReports, confidenceFn }` shape
- [ ] `src/lib/duckdb/run-rule.ts` — generic rule executor that opens required Parquet files via signed URL, runs the rule's SQL, maps rows → `findings` inserts with `rule_version` + `row_ref`
- [ ] `src/lib/rules/returns-gap.ts` — PRD §5.1 (pure SQL)
- [ ] `src/lib/rules/inventory-lost.ts` — PRD §5.2 (pure SQL)
- [ ] `src/lib/rules/refund-reimbursement-mismatch.ts` — PRD §5.3 (pure SQL)
- [ ] `src/trigger/detect-rule.ts` — generic child task that takes `rule_id`, loads it from registry, executes
- [ ] `tests/rules/returns-gap.test.ts` — fixture Parquet in, expected findings out (Vitest)
- [ ] `tests/rules/inventory-lost.test.ts`
- [ ] `tests/rules/refund-reimbursement-mismatch.test.ts`
- [ ] `src/trigger/materialize-cases.ts` — pulls top-25 source rows into `case_source_rows` (arch §4.3b + §5 materialize stage)
- [ ] `src/lib/cost/record.ts` — writes `cost_events` rows (storage, compute seconds via task duration)
- [ ] `src/lib/cost/circuit-breaker.ts` — checks running total vs. `MAX_COST_PER_AUDIT_CENTS` (default 5000) before LLM stages

### 1.5 LLM — narrative + dispute drafts

**User stories:** US-4.5, US-6.3 · **PRD:** §5, §6.3 · **Arch:** §8 · **Rules reference:** `.claude/rules/llm.md`

- [ ] `src/lib/llm/narrate.ts` — Sonnet 4.6 pattern-analysis narrative generator (takes pre-aggregated findings JSON)
- [ ] `src/lib/llm/draft-dispute.ts` — Haiku 4.5 per-case draft dispute generator (input: finding evidence jsonb)
- [ ] `src/lib/llm/validate-output.ts` — zod + regex pass: every `$X` / `$X.XX` substring must match a known `findings.amount_cents`. Also rejects shorthand (`$147k`, `$1.2M`) per decisions 2026-04-18.
- [ ] Prompt caching on the static system prompt (arch §8.1)
- [ ] Helicone proxy configured on both calls; per-audit cost written to `cost_events` via webhook or request metadata
- [ ] `src/trigger/narrate-llm.ts` — single task
- [ ] `src/trigger/draft-disputes.ts` — batch task × top-25 findings, p-limit(4)
- [ ] Fallback: if validation fails or cost circuit breaker trips, substitute templated prose and flag for admin
- [ ] **Promptfoo**: `promptfoo/narrate.yaml` + `promptfoo/draft-dispute.yaml` with synthetic finding sets; `npx promptfoo eval` passes in CI
- [ ] PostHog events: `llm.narrate_ok`, `llm.narrate_fallback`, `llm.draft_dispute_ok`

### 1.6 PDF rendering — Typst primary + React-PDF fallback

**User stories:** US-6.2, US-6.3 · **PRD:** §6.2 · **Arch:** §7

- [ ] `templates/report.typ` — Typst template with imported partials for cover, exec summary, methodology, findings-by-category, top-25 case pages, pattern analysis, math, about, appendix
- [ ] `src/lib/pdf/data-builder.ts` — findings + narrative → JSON blob consumed by Typst + React-PDF
- [ ] `src/lib/pdf/typst-render.ts` — compile Typst WASM, produce PDF buffer
- [ ] `src/lib/pdf/react-pdf-render.tsx` — mirror template in `@react-pdf/renderer`, page-for-page
- [ ] `src/trigger/render-pdf.ts` — Typst first, React-PDF on failure, record renderer choice on `reports` metadata
- [ ] Upload to `reports/{audit_id}.pdf` in Supabase Storage
- [ ] Manual PDF inspection on 3 real datasets before marking 1.6 complete

### 1.7 Processing page + report page

**User stories:** US-4.1, US-4.2, US-6.1, US-6.5 · **PRD:** §4.4, §4.5, §6.1 · **Arch:** §5.1

- [ ] `src/app/(public)/run/[id]/page.tsx` — processing page with `useRealtimeRun()`
  - [ ] Streamed stage labels (e.g. `Parsing 47,231 reimbursement records...`)
  - [ ] Elapsed + estimated-remaining timer
  - [ ] Auto-switch to "we'll email you" after 10 minutes (US-4.2)
  - [ ] On failure: show actionable error + re-upload path (US-4.3)
- [ ] `src/app/(public)/r/[uuid]/page.tsx` — report page served from DB
  - [ ] Headline strip (total, urgent, cases)
  - [ ] Four category cards
  - [ ] Urgency timeline (Recharts)
  - [ ] Top 10 cases table with view-evidence expander
  - [ ] Pattern findings section (LLM narrative rendered through react-markdown + DOMPurify)
  - [ ] CTA block restating top-3 findings + Cal.com/Calendly link (US-7.1)
  - [ ] Download PDF button → signed URL (1-hour TTL, new URL each click)
- [ ] Report URL valid indefinitely until deletion (US-6.5)
- [ ] PostHog events: `processing.viewed`, `report.viewed`, `report.pdf_downloaded`, `report.cta_clicked`

### 1.8 Email delivery

**User stories:** US-6.4 · **PRD:** §4.6 · **Arch:** §5

- [ ] `src/lib/email/templates/ReportReady.tsx` — React Email template with headline number, key stats, link, PDF link, soft CTA, signed deletion link
- [ ] `src/lib/email/send.ts` — Resend client wrapper
- [ ] `src/trigger/notify-email.ts` — sends email, marks audit `completed`, writes `cost_events` row for email cost
- [ ] In Phase 1, `notify-email` runs **only** after admin approval (not auto on pipeline completion); if pending_review, skip and wait

### 1.9 Admin (Phase 1)

**User stories:** US-9.1, US-9.2, US-9.3, US-9.6, US-9.7 · **PRD:** §8 · **Arch:** §9

- [ ] Supabase Auth password flow; admin middleware guard (arch §9.1)
- [ ] `src/app/(admin)/admin/page.tsx` — dashboard: today/yesterday counts, 7-day trend sparkline
- [ ] `src/app/(admin)/admin/audits/page.tsx` — audit list (sortable, filterable, searchable)
- [ ] `src/app/(admin)/admin/audits/[id]/page.tsx` — full report view + `audit_events` timeline + raw upload links
- [ ] `src/app/(admin)/admin/review/[id]/page.tsx` — approve / reject UI (US-9.2)
  - [ ] Approve flips status → `completed` + triggers `notify.email`
  - [ ] Reject sets `failed`, persists reason note
- [ ] `src/app/(admin)/admin/cost/page.tsx` — per-audit breakdown, 7d rolling avg, $50 flag list, month total
- [ ] `src/app/(admin)/admin/failures/page.tsx` — failed audits + stage + Sentry error link + re-run button + raw file preview (pre-purge)
- [ ] `src/app/api/admin/approve/route.ts`
- [ ] `src/app/api/admin/reject/route.ts`
- [ ] `src/app/api/admin/rerun/route.ts` — idempotency-safe re-enqueue of `audit.run`
- [ ] Verify admin pages ship `noindex` + appear in `robots.txt` disallow (arch §9)
- [ ] PostHog events: `admin.approved`, `admin.rejected`, `admin.rerun_triggered`

### 1.10 Privacy + deletion + purge

**User stories:** US-8.1, US-8.2, US-8.3, US-8.4 · **PRD:** §9 · **Arch:** §10

- [ ] `src/trigger/purge-raw-uploads.ts` — scheduled daily task: deletes Storage objects + sets `purged_at` on `raw_uploads` older than 30 days (Parquet survives, findings survive)
- [ ] `src/app/(public)/deletion/[audit_id]/page.tsx` — confirmation page (reached via signed token in email)
- [ ] `src/app/api/deletion/route.ts` — validates token, writes `deletion_requests` row (Phase 1: manual processing)
- [ ] `src/app/(admin)/admin/audits/[id]/page.tsx` includes a "Process deletion" action in Phase 1 — cascade wipes raw CSV (if present), Parquet, `findings`, `case_source_rows`, `reports/{audit_id}.pdf`, zeros PII on `audits`, sets status `deleted` (arch §10.1)
- [ ] Privacy language on `/start` + `/upload` + privacy policy matches exact wording from arch §4.3 (Parquet retention explicitly disclosed)

### 1.11 Hardening + launch readiness

- [ ] Smoke test with **3 real brand datasets** provided by Vyshag (PRD §11 Phase 1 step 14)
- [ ] Tune detection rule thresholds based on smoke test findings (update rule versions, preserve old versions for reproducibility per US-9.7)
- [ ] Manually inspect each PDF — typography, page breaks, forwardability test ("would a CFO read this?")
- [ ] Verify cost per audit on all three smoke datasets is under $30
- [ ] Final landing page polish: shoot the real 60-second screen recording, replace placeholder
- [ ] Confirm `sitemap.xml` and `robots.txt` are correct
- [ ] Confirm TLS 1.3, HSTS, CSP headers via `securityheaders.com` against the production domain
- [ ] Load test: 10 concurrent audits don't trip cost circuit breaker or Trigger.dev concurrency limits
- [ ] Write the internal launch announcement / outreach template for Vyshag

### 🔒 Phase 1 exit gate

- [ ] All P0-Phase-1 user stories meet their acceptance criteria (see `userstories.md` Story Map Summary).
- [ ] Three real brand datasets produced defensible PDFs that Vyshag signed off on.
- [ ] `pnpm build && pnpm lint && pnpm test` all pass.
- [ ] `npx promptfoo eval` passes on the narrate + draft-dispute suites.
- [ ] Per-audit cost on smoke tests confirmed under $30.
- [ ] Admin has processed at least one real deletion request end-to-end.
- [ ] **User confirmation received before starting Phase 2.**

---

## Phase 2 — Full Bucket 3

**Goal:** Self-serve delivery (no more manual review), all 10 Bucket-3 detection rules live, optional reports unlock deeper findings, admin gets funnel analytics + block list, user-initiated deletion is automated.

**Exit gate:** Phase 2 P1/P2 user stories pass. 300-brand target from PRD §11 Phase 2 is achievable. Detection rule catalog covers 5.4–5.9. Self-serve feature flag flipped without incident.

### 🔬 Research checkpoint (before starting)

- [ ] Pull **current Amazon referral-fee category table** — fee percentages by category (rule 5.5 depends on this; Amazon updates periodically).
- [ ] Pull **current FBA size-tier boundaries** and per-tier fulfillment fees (rule 5.4 depends on this).
- [ ] Pull **current 9-month inbound-shipment reconciliation window** policy (rule 5.8).
- [ ] Confirm **LTSF (long-term storage fee)** policy — aged-inventory thresholds (rule 5.9).
- [ ] Confirm **Removal Order Detail** report column schema (rule 5.6).
- [ ] Verify **Manage FBA Inventory** report now includes dimensions column (required for rule 5.4).
- [ ] Confirm **Supabase Pro tier** capacity covers projected volume (decisions §4 deferred decision).

### 2.1 Extended uploads

**User stories:** US-3.4 · **PRD:** §4.3

- [ ] Add 4th required CSV tile: **All Listings Report** — headers in `src/lib/csv/headers.ts`
- [ ] Add 4 optional CSV tiles: Settlement, FBA Fee Preview, Removal Order Detail, Manage FBA Inventory
- [ ] Optional tile styling + "+$X estimated findings if you add this" messaging
- [ ] `parse-csv` task handles the new report types; Parquet schemas added (arch §4.3)
- [ ] Header schemas pinned with `header_signature` hash so we can detect Amazon format drift (arch §4.2)
- [ ] Smoke test all 8 reports against one real dataset end-to-end

### 2.2 Detection rules — expansion

**User stories:** US-5.4, US-5.5, US-5.6, US-5.7, US-5.8, US-5.9 · **PRD:** §5.4–5.9 · **Rules reference:** `.claude/rules/detection-rules.md`

Each rule is: **pure SQL file + registry entry + Vitest fixture + fixture test.**

- [ ] `src/lib/rules/returned-not-resold.ts` (PRD §5.4) + tests
- [ ] `src/lib/rules/dim-overcharge.ts` (PRD §5.5) + tests — the headline Phase 2 feature per PRD §11
- [ ] `src/lib/rules/referral-category.ts` (PRD §5.6) + tests
- [ ] `src/lib/rules/removal-not-received.ts` (PRD §5.7) + tests
- [ ] `src/lib/rules/ltsf-active-sku.ts` (PRD §5.8) + tests
- [ ] `src/lib/rules/inbound-shortage.ts` (PRD §5.9) + tests
- [ ] Update report category cards to include the new rule categories
- [ ] Update PDF template to render the expanded findings
- [ ] Regenerate sample report PDF for landing page (US-1.3)

### 2.3 Self-serve delivery

**User stories:** (no explicit story — driven by PRD §11 Phase 2)

- [ ] Env flag `AUTO_APPROVE` (decisions §5 anti-decision — simple env var, no vendor)
- [ ] When `AUTO_APPROVE=true`: `notify.email` runs immediately on pipeline completion, skipping review queue
- [ ] Admin review queue becomes optional dashboard (still reachable, not blocking delivery)
- [ ] Add a "spot check" admin filter: sample N% of auto-approved audits for post-hoc review
- [ ] Add an admin kill-switch: one-click flip AUTO_APPROVE back off if a bad batch slips through

### 2.4 Admin analytics

**User stories:** US-9.4, US-9.5 · **PRD:** §8.4, §8.5 · **Arch:** §9.2

- [ ] `src/app/(admin)/admin/funnel/page.tsx` — PostHog embedded dashboard + `audits` aggregates for $ metrics (median report value, % > $50k per PRD §12)
- [ ] `src/app/(admin)/admin/blocklist/page.tsx` — CRUD + blocked-attempt log
- [ ] PostHog funnel definitions: landing → start → upload → completed → pdf_downloaded
- [ ] PostHog cohort definitions: high-value ($50k+) vs low-value reports

### 2.5 UX polish

**User stories:** US-1.3, US-2.3, US-6.6 · **PRD:** §4.1

- [ ] `src/app/(public)/sample/page.tsx` — anonymized sample report PDF link (US-1.3)
- [ ] Cross-device resume link (US-2.3)
  - [ ] Signed 7-day-TTL link emailed on `audit.started` if no uploads arrive within 10 minutes
  - [ ] Link opens `/upload/[id]` with existing state
- [ ] CSV export on report page (US-6.6) — just-in-time DuckDB query over Parquet (arch §4.3b), streams as CSV download

### 2.6 Automated deletion

**User stories:** US-8.3 (Phase 2 automation half) · **Arch:** §10.1

- [ ] Scheduled Trigger.dev task `process.deletion-requests` drains the queue daily
- [ ] Cascade wipe is now automatic (raw CSV if present, Parquet, findings, case_source_rows, PDF, zero PII on audits, status=`deleted`)
- [ ] Admin gets a notification on each auto-processed deletion
- [ ] Verify 7-day SLA from request → completion (US-8.3 AC)

### 2.7 Admin 2FA (if threshold crossed)

- [ ] 🔬 Check cumulative completed audits. If ≥ 50 (decisions §4 trigger), add TOTP to the admin login via Supabase Auth MFA. Otherwise defer.

### 🔒 Phase 2 exit gate

- [ ] All P1-Phase-2 and P2-Phase-2 user stories meet their acceptance criteria.
- [ ] All 9 Phase-1 + Phase-2 detection rules pass Vitest fixture tests.
- [ ] Self-serve delivery has run for ≥ 50 audits without a credibility incident.
- [ ] Admin funnel dashboard reflects real data, not dev fixtures.
- [ ] At least one user-initiated deletion processed automatically end-to-end.
- [ ] **User confirmation received before starting Phase 3.**

---

## Phase 3 — Bucket 2 + growth

**Goal:** The X-Ray becomes the primary acquisition channel for Baslix. Fee anomaly detection ships. SP-API unlocks continuous monitoring. Partnership and whitelabel surfaces open. Contract-vs-Reality v2 is scoped (it is a separate sub-system; the v2 build itself gets its own architecture doc).

**Exit gate:** Phase 3 P3 user stories meet their acceptance criteria, sub-systems scoped in their own design docs as applicable.

### 🔬 Research checkpoint (before starting)

- [ ] Pull **current Amazon SP-API** OAuth (LWA) flow + scopes for read-only report pulls.
- [ ] Pull **SP-API Reports API** schedule + rate limits (daily pulls for the 8 reports we care about).
- [ ] Review **Amazon SP-API TOS** — confirm our use (read-only, user-authorized, no resale of data) is compliant (PRD §13 risk row).
- [ ] Evaluate **AWS KMS / HashiCorp Vault** for storing SP-API refresh tokens (new secret class, bigger blast radius than the Phase-1 secrets).
- [ ] Scope **Contract-vs-Reality** as its own architecture doc before any code.

### 3.1 Fee anomaly detection (§5.10)

**User stories:** US-5.10 · **PRD:** §5.10

- [ ] `src/lib/rules/fee-anomaly.ts` — MoM per-SKU fee delta rule (pure SQL)
- [ ] `tests/rules/fee-anomaly.test.ts`
- [ ] Narrative framing: "this changed silently in [month]" (LLM prompt update)

### 3.2 SP-API continuous monitoring

**User stories:** US-10.1

**⚠️ This is a new sub-system. Write a dedicated `sp-api-architecture.md` before writing code.** Plan items below are scaffolding only.

- [ ] Write `sp-api-architecture.md` covering OAuth flow, token storage, daily ingest job shape, failure model, deletion semantics
- [ ] Decide on incremental ingest strategy (cursor per report type)
- [ ] User-facing OAuth flow page
- [ ] Daily scheduled Trigger.dev task per connected seller
- [ ] Weekly digest email (first time we break the "single email per audit" rule — requires explicit user opt-in at SP-API connection time)
- [ ] Rolling recoverable-balance dashboard (first SaaS-dashboard surface — mark this as an explicit divergence from decisions §1 "no SaaS dashboards" and document the rationale)

### 3.3 Whitelabel / partnerships

**User stories:** US-10.2

- [ ] Revenue-share model defined with legal + finance
- [ ] Partner admin surface (separate from Vyshag's admin)
- [ ] Custom-branding template variables in `report.typ`
- [ ] Bulk audit CSV ingest for agencies with many brands

### 3.4 Contract-vs-Reality v2 (scope only)

**User stories:** US-10.3

- [ ] Write `contract-vs-reality-architecture.md` (LLM contract-term extraction, cross-reference model, discrepancy report structure)
- [ ] Do **not** start the build in Phase 3 unless the architecture is reviewed and approved

### 3.5 Free top-3 disputes offer

**User stories:** US-10.4

- [ ] Admin toggle per audit (visible only on audits ≥ $50k)
- [ ] Manual workflow; not automated
- [ ] Success metric: conversion to paid contract after disputes land

### 🔒 Phase 3 exit gate

- [ ] P3 user stories that shipped meet acceptance criteria.
- [ ] Any deferred P3 stories documented with the trigger for later resurrection.
- [ ] SP-API subsystem has a completed architecture doc (shipped or deferred).
- [ ] Contract-vs-Reality has a completed architecture doc (shipped or deferred).

---

## Cross-phase threads

These don't belong to a single phase — they're continuous discipline across all phases. Listed here so they don't get forgotten.

### Testing discipline

- [ ] Every detection rule ships with a Vitest fixture test before it can merge (CLAUDE.md hard rule).
- [ ] Every new LLM prompt change runs through Promptfoo regression before it can merge.
- [ ] Every API route has at least one happy-path + one error-path test.
- [ ] Every schema migration has a rollback plan documented in the migration file comment.

### Observability discipline

- [ ] Every new pipeline stage writes to `audit_events` with `{ audit_id, stage, status, duration_ms, error_sentry_id? }`.
- [ ] Every new LLM call goes through Helicone; its cost ends up in `cost_events`.
- [ ] Every new PostHog event name is documented in `src/lib/analytics/posthog.ts` (no ad-hoc event names).
- [ ] Sentry `beforeSend` filter is updated every time a new PII-adjacent field enters the error path.

### Privacy discipline

- [ ] Every new data field on any table is reviewed for PII classification + deletion cascade inclusion.
- [ ] Every new external service vendor is checked against decisions §5 anti-decisions (no analytics vendor that sees $ figures, no CRM integrations, etc.).

### Cost discipline

- [ ] Every new LLM call has a per-call token budget documented.
- [ ] Every phase gate checks 7-day avg cost per audit against the PRD §10 target ($6–$16 ideal, $30 hard cap).
- [ ] Circuit breaker (`MAX_COST_PER_AUDIT_CENTS`) is re-evaluated at each phase gate.

---

## Change log

| Date | Change | Trigger |
|---|---|---|
| 2026-04-18 | Initial plan written | User requested comprehensive phased plan after PRD / architecture / decisions / userstories were frozen |
