# Baslix Leakage X-Ray — Locked Decisions

**Version:** 1.0
**Companion to:** prd.md, userstories.md, architecture.md
**Status:** Draft for build
**Last updated:** April 2026

---

## How this doc works

Each row is a decision we've committed to. "Locked" means don't re-debate without new evidence — if new evidence appears, update the row with the date + trigger.

The **Rationale** column is the one-line "why" so future-you (or a new engineer) doesn't have to retrace the analysis. The **Rejected** column stops us from re-proposing the same alternatives.

When in doubt, `architecture.md` has the long-form reasoning.

---

## 1. Product shape

| Decision | Rationale | Rejected | Locked |
|---|---|---|---|
| Free lead-magnet tool, no paywall, no tiers | Recovery service is worth 10–100x an audit; audit is bait, not product | Two-tier ($99 premium), freemium | 2026-04 |
| CSV upload only in v1 (no SP-API) | Lower trust ask, faster to build, avoids Amazon TOS ambiguity | SP-API OAuth in v1 | 2026-04 |
| Amazon 3P / FBA only in v1 | Mature detection rules, easy CSV access. Vendor Central / Walmart later. | Multi-marketplace v1 | 2026-04 |
| Single report-delivery email, no sequences | Vyshag handles outreach manually via admin page | Nurture flows, drip campaigns | 2026-04 |
| No CRM / Slack / Zapier integrations | User explicitly dropped these — admin page is the single source of truth | Zoho, HubSpot, Customer.io, Loops | 2026-04 |
| Admin page is the outreach surface | Vyshag reviews audits, picks who to email from Gmail | Automated lead-routing, scoring | 2026-04 |
| Stateless user flow + UUID report URLs, zero auth for users | Zero-friction is the product thesis | Magic-link login, passwords | 2026-04 |
| Admin page at `/admin`, password-gated, not indexed | Single operator (Vyshag), low complexity | SSO, multi-admin RBAC | 2026-04 |
| PDF is the primary forwardable artifact | CFO-forwardability drives conversion | Browser-only report | 2026-04 |
| LLM narrates, never calculates | Hallucinated $ figures destroy credibility irreversibly | Letting the LLM do matching or math | 2026-04 |
| Every $ figure traces to a source CSV row | Defensibility if a Controller's auditor pushes back | Aggregate-only findings | 2026-04 |

---

## 2. Stack

### 2.1 Carried over from ChannelScope (no re-evaluation)

| Area | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) on Vercel | Proven in ChannelScope, fits streaming + server-actions pattern |
| Language | TypeScript strict | Non-negotiable for financial code |
| Package manager | pnpm | Monorepo-ready, disk-efficient |
| Styling | Tailwind v4 + @tailwindcss/typography | Same as ChannelScope |
| UI | shadcn/ui (New York) + Launch UI blocks | Copy-paste, own the source |
| Animation | Motion (Framer Motion), sparingly | Same as ChannelScope |
| Validation | Zod v4 | Report schemas, forms, API contracts |
| Env | T3 Env (`@t3-oss/env-nextjs`) | Compile-time validation, server/client split |
| Server actions | next-safe-action | Type-safe + zod-validated |
| Forms | React Hook Form + zod resolver | Standard |
| Background jobs | Trigger.dev v4 | Same as ChannelScope; v4 parent-child API fits pipeline shape |
| LLM SDK | Vercel AI SDK | Same as ChannelScope |
| LLM model | Anthropic Claude (`claude-sonnet-4-5-20250929` primary, `claude-haiku-4-5-20251001` bulk) | Latest + cost/latency split. Sonnet 4.5 confirmed 2026-04-18 during pre-build tech re-validation. No Sonnet 4.6 exists; Opus 4.6 does but is too expensive for narrative workload. |
| LLM observability | Helicone proxy | Per-audit cost attribution |
| LLM regression testing | Promptfoo | Same as ChannelScope |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` | Same as ChannelScope |
| Security headers | Nosecone | CSP + HSTS |
| Sanitization | isomorphic-dompurify | All LLM HTML output |
| Markdown rendering | react-markdown + remark-gfm | LLM prose → prose component |
| Charts | shadcn/ui chart (Recharts) | Urgency timeline + category donut |
| Concurrency | p-limit | Cap parallel rule workers + LLM calls |
| Testing | Vitest | Every detection rule + schema |
| Linting | ESLint v9 flat + Prettier | Same as ChannelScope |
| Deployment | Vercel + Trigger.dev Cloud + Supabase Cloud | Zero-ops |

### 2.2 New for X-Ray

| Area | Choice | Rationale | Rejected |
|---|---|---|---|
| **Analytics engine (detection rules)** | **DuckDB via `@duckdb/node-api`, in-process** | Every cross-CSV detection rule becomes pure SQL over Parquet. In-process, no server. Proven at 1TB TPC-H in 30s on a laptop; our audits are ~150MB total. 10× less code per rule, trivially reviewable by finance people. | Postgres for detection (slow on cross-CSV analytics, wasted insert pass), hand-rolled JS joins (unreviewable), Python+pandas (wrong language, extra runtime). |
| **Working-set format** | **Parquet (written by DuckDB in `parse.csv`)** | 10–20× smaller than CSV, columnar, DuckDB reads it 10–100× faster than CSV. Free indefinite retention. | Raw CSV only (slow re-reads), JSON lines (bloated), Arrow files (less portable). |
| Database | **Supabase Postgres** (for outputs only: audits, findings, events, costs) | Managed Postgres + RLS + Storage + Auth in one project. Stores state, not working data. | Neon (no Storage), PlanetScale (no Postgres JSON/RLS), self-hosted (overkill). |
| Object storage | **Supabase Storage v3** | Same project as DB. 50GB TUS resumable uploads. Signed URLs for per-report isolation. Hosts raw CSVs, derived Parquet, final PDFs. | S3 direct (we'd write TUS ourselves), R2 (extra vendor). |
| Resumable uploads | **Uppy Dashboard + `@uppy/tus` → Supabase Storage `/upload/resumable`** | Supabase Storage speaks TUS natively with 6MB chunks. Uppy handles pause/resume/retry. | Plain `fetch` (dies on 150MB + flaky Wi-Fi), Uploadthing (no TUS, vendor lock), Filestack (lock + cost). |
| CSV header sniffing (client) | **PapaParse `preview: 50`** | Validates the right report is in the right tile before upload. | Manual split. |
| Auth (admin only) | **Supabase Auth — email+password** | Single admin user. Works with Supabase RLS + Next.js middleware. | Clerk (overkill + cost), NextAuth (more wiring). |
| PDF generation — primary | **Typst via `@myriaddreamin/typst.ts` (WASM)** | Millisecond compile, beautiful typography, declarative template. No Rust toolchain on Vercel. | Puppeteer (cold start + Chromium), LaTeX (same), PDFKit (ugly), pdfme (template-based; great but typography weaker than Typst — revisit in Phase 3 if non-devs need to edit templates). |
| PDF generation — fallback | **`@react-pdf/renderer`** | Insurance if Typst WASM misbehaves on serverless. Declarative, 15k stars. | Re-invoke Typst only (no safety net). |
| Email | **Resend + React Email** | Single transactional email. 3k/mo free tier, React Email templates in-repo. | SES (setup cost), Postmark (fine alternative, no tiebreaker). |
| **Error tracking** | **Sentry** | Native Next.js + Trigger.dev integrations, source-mapped traces, release health. | Axiom (log-mgmt focused), Rollbar (dated), hand-rolled (reinvents source maps). |
| **Product analytics** | **PostHog (Cloud EU)** | Funnels, cohorts, retention, session replay, feature flags. 1M events/mo free (covers 5k audits/mo). Replaces hand-rolled `/admin/funnel` work. | Plausible (no funnels), Mixpanel (paid), hand-rolled (reinventing). |

### 2.3 Explicitly dropped from ChannelScope

| Dropped | Why |
|---|---|
| Easyparser client | X-Ray has no product-data API surface; user uploads CSVs directly |
| Shopify `/products.json` client | No Shopify flow |
| `string-similarity` + cross-channel matching | No cross-channel matching in X-Ray |
| `splice-briefing.ts` two-phase briefing | X-Ray is linear, not Step 1 → CSV → Step 2 |
| In-memory everything | X-Ray is stateful (audits persist for manual review + re-access) |

---

## 3. Architectural contracts

| Decision | Rationale | Locked |
|---|---|---|
| **LLM never does arithmetic** | Hallucinated findings are an extinction-level credibility risk. Deterministic rules do all math; LLM only writes prose given precomputed numbers. | 2026-04 |
| **Monetary values as `bigint` cents everywhere internally** | Float math kills financial tools silently. Format only at UI boundary. | 2026-04 |
| **Every finding carries `rule_id` + `rule_version`** | Old reports remain reproducible and defensible after rules evolve (US-9.7). | 2026-04 |
| **Every finding traces to source CSV row(s) via `row_ref`** (written into Parquet + carried through to findings) | Audit trail for when a Controller's auditor pushes back. | 2026-04 |
| **Detection rules are pure SQL against Parquet, run by DuckDB** | Most reviewable form of financial logic. Testable with fixture Parquet files. | 2026-04 |
| **Detection rules have Vitest fixtures** | `synthetic Parquet → expected findings` tests run on every PR. | 2026-04 |
| **Trigger.dev parent-child with `batchTriggerAndWait`** | Parent doesn't consume a concurrency slot while children run; per-child retry with exponential backoff. | 2026-04 |
| **Realtime progress via `@trigger.dev/react-hooks` `useRealtimeRun()`** | Same pattern as ChannelScope; no FlowToken, no handroll SSE. | 2026-04 |
| **Idempotency key per child task** = `{audit_id}:{stage}:{input_hash}` | Safe to retry, re-run, re-process from admin without double-writing. | 2026-04 |
| **LLM output validated against known `findings.amount_cents` set before render** | Any `$X` substring that doesn't match a real finding → fall back to templates + flag admin. | 2026-04 |
| **Prompt caching on the static system prompt** | ~70% cost cut on repeat audits within the cache window. | 2026-04 |
| **Per-audit cost circuit breaker at $50 default** | Stops runaway spend from a pathological upload before it becomes expensive. | 2026-04 |
| **Raw uploads auto-purged at 30 days via scheduled Trigger.dev task** | Privacy promise from PRD §9 is enforced in code, not policy alone. | 2026-04 |
| **Normalized tables retained past 30-day purge** | Audits remain re-runnable against new rule versions; materially smaller than raw CSV. | 2026-04 |
| **All LLM HTML passes through DOMPurify before render** | Defense-in-depth against prompt-injected XSS. | 2026-04 |
| **Admin pages served with `noindex` + `robots.txt` disallow** | `/admin` must never surface in search. | 2026-04 |
| **No `NEXT_PUBLIC_*` secrets** | T3 Env schema forbids it at compile time. | 2026-04 |
| **CSP allows `wasm-unsafe-eval`** | Required for Typst WASM; scoped to our own origin. | 2026-04 |

---

## 4. Deferred decisions

Things we consciously chose not to decide now. Revisit at the indicated trigger.

| Decision | Revisit at | Why deferred |
|---|---|---|
| Admin 2FA (TOTP) | 50 completed audits | Single password is fine for early phase; add before we have meaningful recovery dollars attached to audits. |
| Supabase Pro vs Team tier | 5,000 audits/mo | Pro at $25/mo covers us far past MVP. |
| Normalized-table retention cap | 100k audits | Negligible cost below that. |
| Per-case vs per-category narration | After 100 audits of real cost data | LLM cost creep may force a collapse to per-category. |
| SP-API continuous ingest (US-10.1) | Phase 3 | Requires its own architecture doc; separate from CSV pipeline. |
| Whitelabel reports for CFO partners (US-10.2) | Phase 3 | Revenue-share model first, engineering second. |
| Contract-vs-Reality v2 tool (US-10.3) | Phase 3 | Separate sub-system; separate architecture doc. |
| Multi-marketplace (UK, EU, JP, AU) | Post-Phase 3 | US-only ICP through Phase 3. |
| Domain: `xray.baslix.com` vs `leakagexray.com` | Before Phase 1 launch | PRD §14 recommends subdomain; confirm with Vyshag before DNS work. |
| Free-file-top-3-disputes offer (US-10.4) | Phase 3 | Massive conversion lever but need validated rules first. |

---

## 5. Anti-decisions

Things we have explicitly rejected and will not revisit without new evidence:

- **No LangChain / LangGraph / Mastra.** Vercel AI SDK + Claude is enough. Framework overhead is not worth it for our shape of workload. (Same decision as ChannelScope.)
- **No database ORM.** Direct Supabase client + typed query helpers. Prisma/Drizzle would add build-time churn for no payoff on ~15 tables.
- **No Storybook / component library infra.** Single-product, single-audience. Maintaining stories is unpaid overhead.
- **No GraphQL.** REST + server actions suffice. GraphQL would add a layer we never use.
- **No Docker for local dev.** pnpm + Supabase CLI + Trigger.dev CLI. Docker is solving a problem we don't have.
- **No microservices.** One Next.js app + one Trigger.dev project + external SaaS. Splitting this further is premature.
- **No feature flags vendor (LaunchDarkly, Unleash).** A few env-var booleans (`AUTO_APPROVE`, `USE_REACT_PDF_FALLBACK`) are enough through Phase 2.
- **No analytics vendor that sees finding data.** Plausible/Umami for traffic is fine; nothing that ingests $ figures.
- **No CAPTCHA.** Rate limits + block list + disposable-email rejection + manual review in Phase 1 cover abuse.
- **No Stripe / payment layer in the X-Ray.** The tool is free. Payment belongs to the managed-service contract, which is out-of-band sales.

---

## 6. Coding conventions (locked)

| Convention | Rule |
|---|---|
| Component style | Functional, named exports (except `page.tsx`) |
| Type declarations | `interface` for objects, `type` for unions/intersections |
| Monetary values | `bigint` cents internally, format via `Intl.NumberFormat` at display only |
| Import paths | `@/` alias for all internal imports |
| Import order | React/Next → external → `@/` internal → relative |
| API error shape | `{ error: string, code: string }` — never leak internals |
| LLM output rendering | Always pass through DOMPurify |
| Rule functions | Pure; inputs are normalized rows, outputs are findings; zero side effects |
| Test colocation | Rule tests live in `tests/rules/<rule-id>.test.ts` with synthetic fixtures |
| Trigger.dev task names | `namespace.verb` — e.g., `audit.run`, `validate.csv`, `render.pdf` |
| Database columns | `snake_case`; TypeScript mirrors as `camelCase` via typed client layer |
| Migrations | Supabase SQL migrations in `migrations/`; sequential timestamps |

---

## 7. Change log

| Date | Change | Trigger |
|---|---|---|
| 2026-04 | Initial draft | PRD v2 + architecture v1 written together |
| 2026-04 | **Swap detection engine from "PapaParse → Postgres normalized tables" to "DuckDB over Parquet"** | Second-pass research surfaced DuckDB. Detection rules become pure SQL over columnar files, 10× less code, in-process, serverless-friendly. Postgres reverts to outputs-only (findings, audits, events). |
| 2026-04 | Add **Sentry** for error tracking | Gap in first draft. Native Trigger.dev integration exists. |
| 2026-04 | Add **PostHog** for product analytics | Replaces hand-rolled `/admin/funnel`. 1M events free covers our volume. |
| 2026-04 | Evaluated and rejected **BAML** for structured LLM output | Our LLM usage is narrow; Vercel AI SDK `generateObject` with Zod is sufficient. BAML's value (schema-aligned parsing across multiple models) doesn't apply. |
| 2026-04 | Evaluated and rejected **pdfme** as PDF primary | Template-editability is a nice-to-have, but Typst's typography wins for financial docs. Revisit Phase 3 if non-devs need to edit templates. |
| 2026-04 | Confirmed **Inngest vs Trigger.dev** choice | Trigger.dev runs on their compute (no serverless timeout); Inngest calls our serverless endpoints (timeout risk on 150MB parse). Parent-child API fits. |
| 2026-04 | Confirmed **no open-source FBA reimbursement libraries** exist | Every competitor is closed-source commercial (GETIDA, ReimburseOps, Carbon6 Seller Investigators, SELLERLOGIC). Detection rules in PRD §5 are ours to build. Moat, not gap. |
| 2026-04-18 | **Pre-build tech re-validation pass** | Re-evaluated every major stack choice against alternatives current as of this date. All choices confirmed. Explicit confirmations below. |
| 2026-04-18 | **Model confirmed: `claude-sonnet-4-5-20250929`** (Haiku 4.5 stays) | Sonnet 4.5 confirmed as the correct model ID. No Sonnet 4.6 exists; the 4.6 line is Opus only (`claude-opus-4-6`). |
| 2026-04-18 | **Privacy language corrected** for Parquet retention | The old promise "we delete raw uploads at 30 days" silently relied on users not noticing Parquet survives. Updated copy on `/start` + `/upload` + report email to explicitly disclose columnar retention, with full-deletion as a capability. PRD §9.2, architecture §4.3 + §10.1, userstories US-8.1 + US-8.3 all updated. |
| 2026-04-18 | **Deletion flow: per-audit signed link in the report email, not email reply** | Resend has no inbound mail; "reply to delete" would silently fail. Replaced with a signed `/deletion/{audit_id}?token=...` link + form + `/api/deletion` route. |
| 2026-04-18 | **Next.js 15 locked (no Next 16 straddle)** | Architecture §9.1 previously mentioned `src/middleware.ts` (Next 15) / `src/proxy.ts` (Next 16 rename); ambiguity removed — we ship on 15. |
| 2026-04-18 | **No shorthand in LLM output** | Prompt rule added (no `$147k`, `$1.2M`) and validator pre-check enforces it. Prevents a class of "approximate" dollar figures that wouldn't match `findings.amount_cents` but would pass a naïve regex.|
| 2026-04-18 | Re-confirmed **DuckDB + Parquet** vs Polars, ClickHouse, MotherDuck | `nodejs-polars` exists but fewer Node-native Parquet patterns and no S3/HTTP reader parity with DuckDB. ClickHouse needs a server. MotherDuck (managed DuckDB) is interesting but adds a vendor; re-revisit if we ever want shared caching across audits. In-process DuckDB stays. |
| 2026-04-18 | Re-confirmed **Trigger.dev v4** vs Inngest | Trigger.dev runs on their compute — no serverless timeout on 150MB CSV parses. Inngest calls our serverless endpoints, which would hit Vercel's 300s cap. Confirmed. |
| 2026-04-18 | Re-confirmed **Anthropic direct (not Message Batches API)** for draft disputes | Batches offer 50% discount but are asynchronous (up to 24h). Our audit target is 3–8 min end-to-end; batches break the UX. Prompt caching + Haiku is the right cost lever. |
| 2026-04-18 | Re-confirmed **ESLint + Prettier** over Biome | Biome is faster but the Next.js 15 + ESLint 9 flat-config plugin ecosystem is richer (rules for Server Components, Route handlers, etc.). Revisit at Phase 3 if lint wall-clock becomes painful. |
| 2026-04-18 | Re-confirmed **Typst WASM primary + React-PDF fallback** | Evaluated Puppeteer-core on Vercel (cold-start cost + 50MB+ Chromium), PDFKit (low-level, ugly default output), and Pandoc WASM (heavier than Typst). Typst's typography quality is the deciding factor for a document a CFO will read. |
| 2026-04-18 | Re-confirmed **no ORM** (raw Supabase typed client) | Drizzle would add a layer for ~15 tables with no query-builder payoff. We commit to `pnpm db:types` (`supabase gen types typescript`) + thin snake→camel mapping helpers in `src/lib/db/` as the typed access layer. |
| 2026-04-18 | **Corrected Sonnet model ID: `claude-sonnet-4-6` → `claude-sonnet-4-5-20250929`** | Phase 0 research checkpoint discovered no Sonnet 4.6 exists. The 4.6 line is Opus only. Corrected in architecture.md, CLAUDE.md, plan.md, and decisions.md. |
| 2026-04-18 | **Descoped Phase 0.6 (observability), 0.7 (CI/CD); deferred 0.5 (security)** | User directive: "don't overdo observability, CI/CD etc — just care about CX and customer value." Sentry, PostHog, Helicone wiring, GitHub Actions all deferred to post-launch. Security baseline (Nosecone, rate-limits, admin auth middleware) deferred to before first public users. |
| 2026-04-21 | **Replaced Uppy + TUS upload with FormData upload** | Uppy + TUS adds a dependency and complexity not justified for MVP. FormData via a single `/api/audit/upload` route handles 3 CSV files directly. Trade-off: no resume on flaky Wi-Fi for large files. Acceptable for Phase 1 (most CSVs are <50MB). Uppy/TUS can be added later if reliability issues emerge. Architecture §6 still documents the TUS approach as the target; current implementation is a simplification. |
| 2026-04-21 | **Monolithic parent task instead of child tasks with batchTriggerAndWait** | Architecture §5 planned separate child tasks (validate, parse, detect, narrate, draft, render, notify) orchestrated by the parent. MVP uses a single `audit-run.ts` that runs detect → narrate → draft inline. Trade-off: no per-stage retry granularity, no per-child concurrency isolation. Acceptable for 3 rules on small datasets. Extract to child tasks when adding Phase 2 rules or if retry granularity is needed. |
| 2026-04-21 | **DuckDB reads CSVs directly (`read_csv()`) — no Parquet conversion step** | Architecture §4.3 planned CSV→Parquet via `parse-to-parquet.ts`, with detection rules reading Parquet. MVP reads CSVs directly with DuckDB's `read_csv(auto_detect=true)`. Trade-off: slower re-reads on large files, no columnar compression benefit. Acceptable for Phase 1 where each audit reads CSVs once. Parquet conversion can be added as a pipeline step later. |
| 2026-04-21 | **Template-based narrative and dispute drafts instead of LLM API calls** | Architecture §8 planned Sonnet 4.5 + Haiku 4.5 API calls. MVP uses template prose generators in `src/lib/llm/narrate.ts` and `draft-dispute.ts`. Output carries `source: "template"` flag. Trade-off: generic prose quality. Acceptable until detection rules are validated against real Amazon data; LLM enhancement is a quality upgrade, not a blocker. |
| 2026-04-21 | **Added `report_data jsonb` column to `audits` table** | Not in original schema. Stores the fully-built report JSON (narrative, categories, top cases, dispute drafts) so the report page can render from a single DB read. Alternative was multiple queries + on-the-fly aggregation on every page load. Migration: `002_add_report_data.sql`. |
| 2026-04-21 | **Processing page uses polling instead of `useRealtimeRun()`** | Architecture §5.1 planned `@trigger.dev/react-hooks` `useRealtimeRun()` for live progress. MVP polls `/api/audit/status` every 5 seconds with simulated stage labels. Trade-off: no real-time stage updates from pipeline. Acceptable because the total processing time is 3-8 min; polling is good enough. Real-time streams can be added as a UX polish. |
| 2026-04-21 | **Plain HTML email instead of React Email** | Architecture §5 planned React Email component. MVP uses a plain HTML string template in `report-ready.ts`. Trade-off: less maintainable templates. Acceptable for a single transactional email. React Email can be introduced when email template changes become frequent. |
