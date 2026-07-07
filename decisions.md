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
| 2026-05-08 | **Admin auth uses Supabase Auth + httpOnly cookie** | `/api/admin/login` authenticates via `supabase.auth.signInWithPassword`, verifies `app_metadata.role = 'admin'`, sets httpOnly session cookie (8h TTL). Middleware checks cookie presence on `/admin/*` routes (excluding `/admin/login`). Simple and secure for single-admin MVP. |
| 2026-05-08 | **DuckDB `SET home_directory = '/tmp'` required in containers** | Trigger.dev Cloud workers have no `HOME` env var. DuckDB extension install (`INSTALL httpfs`) fails without a writable home directory. Fixed by setting `home_directory = '/tmp'` before any extension commands in `client.ts`. |
| 2026-05-08 | **Renamed `adjustments` → `inventory_ledger` across codebase** | Amazon deprecated "FBA Inventory Adjustments" report (Jan 2023). Replaced with "Inventory Ledger - Detailed View" which has different columns (`Event Type`, `Quantity`, `Fulfillment Center`). DB migration `003_rename_adjustments_to_inventory_ledger.sql` added. All rules, fixtures, tests, and UI updated. |
| 2026-05-08 | **CSP added inline in middleware instead of nosecone** | Nosecone adds a dependency for what amounts to a single header string. Inline CSP in `src/middleware.ts` is simpler and easier to audit. Can revisit if CSP complexity grows. |
| 2026-05-08 | **Security hardening shipped** | Rate limits (Upstash): 5/domain/30d on start, 10/IP/day on upload, 30/IP/min on API. DOMPurify sanitizer for LLM HTML output. CSP header on all responses. |
| 2026-05-09 | **Synthetic smoke data replaces real-data requirement for Phase 1 gate** | 3 deterministic brand datasets (NovaPeak Outdoor, LuxeNest Home, PureGlow Beauty) with seeded PRNG generator. Covers all 3 rules, all confidence levels, realistic Amazon CSV formats. Real Amazon data testing deferred — no sellers onboarded yet. |
| 2026-05-09 | **Documentation sync: architecture.md, .claude/rules/ updated** | All references to `adjustments` → `inventory_ledger`, `read_parquet` → `read_csv(auto_detect=true)`, `nosecone` → inline CSP in middleware. Rule examples updated to match actual SQL. API routes, security, and detection-rules .claude/rules/*.md rewritten to match actual shipped code. |
| 2026-06-23 | **Size-tier recovery self-calibrates from the seller's own fees; referral uses a product-group→category map with conservative fallback** | (1) The FBA fee dollar grid couldn't be sourced authoritatively (gated rate-card, no seller account, conflicting third-party copies). Resolution: `size_tier_misclassification` (v1.1.0) now derives the "correct tier cost" empirically — median `estimated-fee-total` of SKUs correctly classified into that tier, from the seller's *own* Fee Preview — and uses the hardcoded schedule only as a fallback for tiers with no clean sample. Recovery dollars no longer depend on placeholder fees once real data is present; the schedule remains the source of dimension/weight tier *boundaries* (stable). (2) Fee Preview's `product-group` uses Amazon category *codes*, not referral category labels; `reference/product-group-map.ts` bridges them. Unmapped → "Everything Else" (15%), so a mapping miss can only cause a missed overcharge, never a false one (credibility over coverage). Amazon doesn't publish the code list — verify/extend against real data. |
| 2026-06-01 | **Referral-rate table populated from Amazon's public pricing page (authoritative); FBA fee grid still representative** | Seller Central help pages are login-gated and a seller account requires operating a retail company — which Baslix does not. Resolution: Amazon's **public** marketing site (`sell.amazon.com/pricing`, no login) publishes the full referral schedule; fetched it and replaced the representative referral values with verbatim published rates (`referral-rates.ts` → v2026.2, now a progressive 3-tier model to represent Clothing's 5/10/17 rule and the corrected Beauty $10 threshold). The **FBA fulfillment fee dollar grid** is NOT on the public pricing page and the gated rate-card needs a seller login; third-party transcriptions disagree materially, so those values were left representative. Planned resolution: **self-calibrate per-tier fees from each real seller's own Fee Preview/Settlement data** (observe Amazon's actual charge for correctly-tiered SKUs) rather than a hardcoded global grid — needs no account, auto-updates, and is more defensible. Hardcoded schedule stays as fallback. |
| 2026-06-01 | **Rules may emit `amount_cents` from SQL (payout-integrity recoverable is real, not estimated)** | The §3 contract said amount estimation is downstream via `runRule`'s `estimateAmountCents` callback (default $15/finding) — fine for Phase-1 reimbursement rules where the recoverable is the item value. Payout-integrity rules compute the *actual* overcharge (referral fee delta, size-tier fee delta × units, return-credit gap × avg price) — that arithmetic belongs in SQL per the pure-SQL rule. **Change:** `run-rule.ts` and `tests/helpers.ts` now prefer a SQL-emitted `amount_cents` column when present, falling back to the estimator otherwise. Reimbursement rules are unchanged (they emit no `amount_cents`, so they still use the estimator). Arithmetic stays in SQL; no math added to TypeScript. Reference rates live in versioned `VALUES` CTEs (`src/lib/rules/reference/`). |
| 2026-06-01 | **Four payout-integrity rules + 3 new report types shipped (Phase 1.5)** | Built `referral_fee_mismatch` (§5.6), `size_tier_misclassification` (§5.5), `return_credit_unapplied` (§5.4), `aged_surcharge_on_sold` (§5.8) — each pure SQL + fixture test, all green. New report signatures in `headers.ts`: `settlement` (V2 flat file — Principal/Commission per order), `fba_fee_preview` (dimensions + assigned tier), `storage_fees` (aged surcharge). Reference tables: `reference/referral-rates.ts` + `reference/fba-fee-schedule.ts` (versioned `VALUES` CTEs, representative 2026 values, flagged for live-Amazon verification before production). Synthetic smoke generator extended to emit all 3 new reports with planted discrepancies; all 4 rules fire on all 3 brands. Reimbursement rules demoted below payout-integrity in the registry. 57 tests pass. Note: DuckDB reserves `at` as a keyword — alias size-tier joins as `amzt`. |
| 2026-06-01 | **Wedge re-pointed: lead with payout integrity, demote FBA reimbursement to a table-stakes add-on** | First-principles strategy review (`Baslix-brain/synthesis/the-wedge-correction-2026.md`, 2026-05-30) + external market research found the build led with FBA reimbursement (Bucket 3) while strategy says lead with payout integrity (Bucket 2). Bucket 3 is structurally dying: Amazon auto-reimbursement (Nov 2024/Jan 2025), manufacturing-cost basis (60–75% lower per claim), GETIDA/ProfitGuard commission price war; detection itself is commoditizing. The defensible moat is recovery operations + relationship, not detection. **Decision:** new Phase 1.5 pulls four contract-free payout-integrity checks forward (referral-fee tier mismatch, FBA size-tier misclassification, return-credit-never-applied, aged-surcharge-on-sold — ≈ PRD §5.4–5.6/5.8, previously sequenced into Phase 2 as "Bucket 3 expansion"); the three existing reimbursement rules (`returns_gap`, `inventory_lost`, `refund_reimbursement_mismatch`) survive as demoted add-ons; ingest surface gains the settlement/transaction, FBA fee-preview-with-dimensions, and storage-surcharge reports; messaging shifts from "Amazon owes you money" to "your settlement report is lying to you." **Not changed:** the free-lead-magnet shape, Amazon-3P/FBA-only-v1 ingest (the new checks still read Seller Central reports), the stack, and all §3 architectural contracts. PRD stays frozen; this is a re-sequencing + re-framing, not a spec change. New supporting asset: versioned reference tables (Amazon referral-rate table + FBA fee schedule) the rules join against — these carry a `reference_version` for reproducibility. See `plan.md` Phase 1.5. |
| 2026-06-13 | **FEEX rework: self-serve tool = fulfillment/air-cover, not the acquisition engine; sell the system, not one-shot recovery** | Wiki pivots (`the-wedge-correction-2026`, `teardown-led-acquisition`, `give-the-finding-sell-the-system`) moved past what the build encoded. **Decision:** the manual public-data teardown is the acquisition magnet; X-Ray confirms findings on real data (fulfillment). The report gives the finding away and the CTA sells the recurring system (continuous monitoring, cross-channel, backward claims) — not a 20%-of-recovered one-shot. Free tool stays contract-free/Amazon-only; cross-channel breadth is sold, not built. Privacy becomes a conversion device. Captured in `feex-rework.md`; PRD §4.1/§4.5/§6.1/§11/§12 superseded by this + Phase 1.5. (Logged retroactively 2026-07-05 to close a change-log gap.) |
| 2026-07-05 | **Report Killer: credibility-engineering + information-hierarchy rework of the report deliverable, plus curated bucket expansion, richer visuals, and funnel consistency** | First realistic synthetic run (Halcyon Audio, 42 SKUs / 19 mo) exposed report defects that specifically kill a verify-everything finance buyer: numbers not reconciling across surfaces (recurring shown 3 ways; referral counts mismatched; confidence widget ≠ findings count), `[object Object]` render bugs (DuckDB temporal values not JSON-safe in `evidence` — verified root cause in `run-rule.ts`), the softest 100%-medium bucket heroed while the sharpest wedge findings were buried, and flat-$15 estimates sitting above a "traces to a row" promise. **Decisions (Vyshag):** (1) tiered report — hero = the provable-forward, high-confidence overcharge, big total demoted to a secondary "surfaced" line (honest, smaller headline is intended); (2) fence estimated reimbursement buckets below the traceability promise; (3) light printable-document aesthetic — a deliberate `frontend.md` exception; (4) new detection is a *curated, data-gated* set — dim-weight becomes a size-tier upgrade (no new data), low-price/storage/3P-promo-fee (coupon + deal-fee) gated behind generator/ingest work (settlement fee-lines G1, monthly-storage report G2); Subscribe & Save deferred (semi-contract-dependent); (5) referral wedge gets a false-positive guard (D9) — the map alone can fabricate findings on heterogeneous product-groups; (6) richer multi-chart visual system (via `dataviz`); (7) Phase 6 funnel consistency (email re-hero, processing-page real-progress, upload-privacy-as-conversion). **Method decision:** built + validated on synthetic data (no real seller data); detection-vs-real-format assumptions tracked on an explicit real-data asterisk list; research-before-assuming on every Amazon mechanic. **Not changed:** the detection engine, pipeline, privacy model, ingest boundary, and all §3 contracts. Planned in `report-killer-plan.md` (+ `report-killer-referral-guard.md`, `report-killer-new-buckets.md`, `report-killer-prompts.md`). PRD stays frozen. |
| 2026-07-07 | **Success metric recalibrated OFF "median report value $30–75k" — supersedes frozen PRD §12/§13** | Report Killer Phase 5 (P5.2 / `feex-rework` Nuance 8). PRD §12/§13 make "median report value" the single most important metric and set it at $30k–$75k — a number anchored on the old FBA "$147k Amazon owes you" fantasy. Two problems: (1) the aligned tool surfaces 1–3%-of-GMV payout-integrity discrepancies, 90-day-capped — the honest headline is *smaller*; (2) all validation is synthetic, and synthetic dollar magnitudes are **generator knobs**, not a signal. **Decision:** the north star is "surfaces a specific, verifiable, high-confidence, non-commoditized discrepancy that earns the call," not raw dollar size. Applied on the admin dashboard (recalibration note) + `plan.md` funnel-page line; rationale in `real-data-asterisks.md` §C. PRD frozen — deviation captured here. |
| 2026-07-07 | **Real-data asterisk list created — detection correctness is provisional until the first real export** | Report Killer Phase 5 (P5.3). Synthetic data proves presentation + reconciliation (done: Phases 0–4 + P5.1 `tests/synthetic-brands-report.test.ts`, all four brand profiles reconcile with no object bugs), but structurally **cannot** prove detection-vs-real-Amazon-format — the generator and rules share the same format assumptions. **Decision:** every rule carries a `// REAL-DATA ASTERISK (P5.3):` comment linking to **`real-data-asterisks.md`** (repo root) — the five cross-cutting format-assumption classes (product-group codes / `amount-description` strings / disposition-reason-event code sets / date-currency formats / header drift) + a per-rule table, each keyed by the *safe-failure direction* under the asymmetric-safety rule (a false finding is catastrophic; a miss is safe). This list is the "before you trust the numbers on a real seller" checklist, walked when the first ICP CSV lands. Referenced from `.claude/rules/detection-rules.md`. |
| 2026-07-07 | **Web report re-shelled into a premium 3-zone reading UI (left ledger nav + right action dock) — reverses the "one scrolling page, no sidebars" rule for the web report only** | Owner directive (Vyshag): the report "looks like AI slop," wastes the left/right gutters, and should feel like an organised, premium SaaS product with real navigation. **Change:** `src/app/(public)/r/[uuid]/page.tsx` now renders on a flat slate "desk" with an `xl` 3-column grid — a scroll-spy contents rail (`ReportNav.tsx`, collapsible category submenus + running $, ledger-spine active tick), the document, and a sticky action dock (`ReportDock.tsx`: recoverable-now + closing-14d, Book-call CTA, PDF/CSV). Also removed the three marketing gradient blobs (they violated frontend.md's "no gradient soup"), flattened the glassy `bg-white/80 backdrop-blur` cards to solid-white hairline panels, and added numbered section eyebrows (01–05) that encode the real reading sequence. **Preserved:** the locked light-document palette, the tiered story order, and full web↔PDF parity — the new chrome is web-only and `print:hidden`, and `data-builder.ts` + both PDF renderers are untouched, so no figure can drift between surfaces. Supersedes frontend.md "What NOT to do" #1 (sidebars/tabs/nav) and the P4.2 "one scrolling report page" clause **for the web report only**; the print/PDF deliverable still obeys them. |
