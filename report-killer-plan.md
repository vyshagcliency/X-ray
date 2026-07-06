# Report Killer Plan — Making the X-Ray Report a High-Value Lead Magnet

**Created:** 2026-07-05
**Owner:** Vyshag
**Status:** Proposed — ready to execute in a fresh session
**Scope:** The *report deliverable* (web `/r/[uuid]`, PDF, narrative). NOT the strategy pivot (done) and NOT the detection engine's existence (built).
**Companion docs:** `feex-rework.md` (strategy alignment — mostly shipped), `plan.md` (build phases), `prd.md` (frozen), Baslix wiki (`synthesis/give-the-finding-sell-the-system`, `synthesis/the-wedge-correction-2026`, `concepts/payout-integrity`).
**Test data:** `tests/smoke/halcyon-audio/` (42-SKU audio brand, 19-month window — the dataset behind the report Vyshag reviewed).

---

## 0. Why this plan exists

The strategy pivot (FBA-reimbursement → payout-integrity) already shipped: the four wedge rules exist, the CTA already sells the system, categories are re-ordered. **The buckets got repointed; the credibility engineering and information hierarchy did not catch up.** A real run (Halcyon Audio) produced a report that is ~80% right structurally but carries defects that specifically kill a *finance* buyer — the one persona this magnet targets, who verifies every number.

The target buyer is a CEO/CFO/Controller who "verifies everything" (`teardown-led-acquisition`). For them, a rendering bug or a headline that doesn't reconcile is not a polish issue — it is the whole credibility of a forensic tool collapsing. This plan makes the report **undeniable**: every number reconciles, every figure traces to a row, the sharpest evidence leads, and the recurring system is what's sold.

### The bar (from the wiki — non-negotiable)

1. **Lead with payout integrity** — "your settlement report is lying to you, and we can prove it." The "you found *what*?" moment.
2. **Give the finding, sell the system** — the report gives the finding away; the CTA sells continuous monitoring + cross-channel + backward claims they can't self-serve. Never pitch one-shot recovery on a self-fixable, 90-day-capped bucket.
3. **Be undeniably right** — every `$X` traces to a `findings.amount_cents` → a real row. One wrong number and the deal is dead.
4. **Honest magnitude** — 1–3% of GMV; lead with "stop the bleeding *forward*," not an inflated backward total.
5. **Contract-free scope only; sell the breadth** — the free tool reads the seller's own Seller Central reports. Cross-channel (Walmart/Target) is the *pitch*, delivered as a service — not built into the free tool.

### The locked design decisions (Vyshag, 2026-07-05)

| Lever | Decision |
|---|---|
| **Headline** | **Tiered — hard number first.** Hero = the provable, high-confidence, *forward* overcharge. The big total is a secondary "total surfaced" line, honestly framed. |
| **Depth** | **Both.** Deeper per-finding *dossiers* AND 2–3 selective new *sharp* buckets (chosen for "you found what?" punch, never dollar-padding). |
| **Shape** | **Tiered — punch on top, depth below.** One-screen verdict (sharpest finding + forward bleed + one CTA) → trust strip → full forensic body → sell-the-system close. |

### Resolved open decisions (Vyshag, 2026-07-05)

These were §6 open decisions; now locked so the execution session runs uninterrupted:

- **Q1 — Estimated reimbursement buckets:** **Fence below the fold now.** Move returns_gap / inventory_lost into a labeled "Estimated — needs confirmation" tier below the wedge; exclude from the hero and the traceability claim. Compute real per-item values as a fast-follow (not a Phase 0 blocker).
- **Q3 — New buckets (Phase 3):** **Low-Price FBA tier not applied + weight/dim rounding overcharge + storage fee on wrong cubic footage.** The three most-provable contract-free additions.
- **Q4 — Aesthetic:** **Light printable-document** for the report — a deliberate exception to `frontend.md` (which governs product surfaces like upload/processing). Document the exception in `frontend.md`; do NOT move the report to near-black.
- **Consequence acknowledged:** the tiered hero makes the headline number *smaller and more honest* (on Halcyon, a provable-forward figure of a few hundred $/month, not the $62,760 total). The big total stays on the page, demoted to a secondary "total surfaced" line. This is intended.

Still open (decide when reached, defaults in §6): Q2 (required vs optional reports — default: **optional-with-strong-nudge** for lower self-serve friction) and Q5 (reference-table maintenance cadence).

---

## 1. What does NOT change (the anchor)

Bound the blast radius. These stay exactly as built:

- The DuckDB + pure-SQL detection engine, the `Rule` registry, and the "detection rules are pure SQL" hard rule.
- The Trigger.dev pipeline (`audit-run.ts` monolithic parent), Typst PDF + React-PDF fallback, admin review queue, single transactional email.
- CSV-upload-only / Amazon-3P-only / no-SP-API v1 ingest boundary.
- Privacy architecture: no login, UUID report URLs, raw-CSV auto-purge at 30d, no LLM ever sees raw rows.
- `bigint` cents internally, format at display; LLM narrates never calculates; every finding carries `rule_id` + `rule_version` + `row_ref`.

If a change touches these, it's out of scope.

---

## 1.5 Validation reality — synthetic data (what it proves, what it can't)

**We build and validate on synthetic data (`tests/smoke/halcyon-audio/` + the generator in `PLAN.tmp.md`), not real Amazon exports.** That is fine for most of this plan, and dangerous for one part. Be explicit about which is which, because the two failure modes are opposite.

**Synthetic data is the RIGHT tool for Phases 0, 1, 2, 4 (presentation + reconciliation).** These phases ask "given a set of findings, does the report render truthfully, reconcile across surfaces, lead with the sharp evidence, and match in PDF?" Halcyon's realistic *scale* (8,133 settlement rows, 1,746 ledger events, 42 SKUs, 19 months) stress-tests rendering and number-reconciliation at production size. You do NOT need real data to prove the hero reconciles with the category cards, or that dates stop rendering as `[object Object]`. Use Halcyon as the visual acceptance fixture throughout.

**Synthetic data structurally CANNOT validate detection-vs-reality (Phase 3 + the D6 class).** The generator and the rules share the same authors' assumptions, so "the rule fires on the smoke data" proves the rule *runs*, not that it's *correct against how Amazon actually formats data*. **Proven, not theoretical:** Halcyon's `fba-fee-preview.csv` uses `product-group = "Consumer Electronics"` (the label) for all 42 SKUs — but real exports emit the *code* `ce`. So the referral wedge passes every smoke test and would silently under-fire on the first real CSV (see the phase-independent gate below). The same blind spot covers header variants, disposition/reason code sets, date/currency formats, and settlement `amount-description` string variants.

**Two consequences baked into the phases:**

1. **Harden the generator to be adversarial about *format*, not just volume (P0.6).** Make the synthetic data emit real Amazon quirks — product-group *codes* (`ce`, `home_garden`, …) instead of clean labels, and any known header/code variants — so a format mismatch surfaces as a *loud smoke-test failure now* instead of a silent real-data landmine later. This converts the D6 class from "invisible until a real seller uploads" into "caught in CI." It cannot fully eliminate the blind spot (Amazon's code enum isn't published, so the generator encodes our *best guess* of reality), but it strictly beats matching the rules' own assumptions.
2. **Every detection rule keeps a "real-data asterisk" (Phase 5).** Dollar *magnitudes* are artifacts of the generator's leakage-rate knobs — meaningless as a success metric (kills the old "median report value $30–75k" north star, P5.2). Detection *correctness* stays provisional until the first real Fee Preview + Settlement export confirms the format assumptions. Phase 5 is not "wait for real data" — it's "everything synthetic-validatable is DONE and gated; here is the explicit list of what remains unverified until one real CSV lands."

---

## ⚠️ Phase-independent gate (D6) — the referral-category taxonomy problem

**This is not tied to a phase. It can silently break the lead wedge at any moment.** The referral-fee-mismatch rule needs each SKU's *correct* referral rate, which it derives from the Fee-Preview `product-group` column via `reference/product-group-map.ts`. Halcyon's fixtures use clean labels (`Consumer Electronics`) that identity-map perfectly, so every test passes — but real exports use *codes*, and the true rate determinant is a different, non-public taxonomy. On a real CSV the sharpest "you found what?" finding silently fails to fire (or, worse if done carelessly, fires falsely).

**Research findings (2026-07-05, web) — what is and isn't knowable without real data:**

- Amazon does **not** publish the enumerated `product-group`/GL code list; it drifts over time. (Confirms the code comment.)
- The referral fee category is set by Amazon's internal **GL code** (`gl_home`, `gl_biss`, …), *not* cleanly by `product-group` — "internal to Amazon, not seller-visible, determined by A9." And **"fee categories do not always match storefront categories"** → any code→category map has irreducible error.
- The **common codes ARE semi-discoverable** now (inventory flat-file "Valid Values" tabs, seller-forum lists, integration-vendor docs) — enough to seed a high-confidence subset without real data.

**Asymmetric safety rule (governs any map edit):** the rule flags when `charged > expected`. Mapping a code to a rate *higher* than reality → a missed finding (safe). Mapping to a rate *lower* than reality → a **false finding** (catastrophic for a verify-everything CFO). So: only map codes at **high confidence**; when uncertain, **leave unmapped** (falls back to `Everything Else` 15% = high expected = safe under-fire). Never assign a sub-15% category on a guess.

**Resolution path (can start now via research; confirmed later on real data) — tracked as P3.5:**
1. **Research-seed a conservative map** — extend `product-group-map.ts` with the well-known code→category rows we're confident of (electronics/CE, home, kitchen, sporting goods, pet, beauty, baby, toys, office, automotive, grocery, etc.), obeying the asymmetric safety rule. Bump `PRODUCT_GROUP_MAP_VERSION`.
2. **Add a false-positive guard to the rule (hybrid, mirrors size-tier v1.1.0 self-calibration)** — before flagging, cross-check the SKU's charged rate against the *dominant rate its in-account category-peers pay*; if it matches the peer norm, suppress (our map is likelier wrong than Amazon is internally inconsistent). The external map catches *systematic* category-wide overcharges (the flagship case self-calibration alone misses); the peer-rate guard kills false positives from map errors.
3. **Confidence-tier by mapping certainty** — findings on high-confidence mapped codes = high; findings that hinge on a shaky mapping = medium/review, never headline.
4. **Confirm on the first real Fee Preview export** — the map's actual coverage and correctness stays provisional (real-data asterisk, §1.5 / P5.3) until one real export validates the code values in the wild.

This converts D6 from "invisible landmine until a real seller uploads" into "research-seeded, safe-by-construction now; confirmed on first real data." Do step 1–3 in the build (P3.5); step 4 the moment a real export is in hand, whatever phase you're in.

**Sources:** [Amazon SP-API FBA report types](https://developer-docs.amazon.com/sp-api/docs/report-type-values-fba) · [Seller Central: Referral fees](https://sellercentral.amazon.com/help/hub/reference/external/GTG4BAWSY39Z98Z3) · [Amalytix: Amazon categories & product type (GL codes)](https://www.amalytix.com/en/knowledge/seo/amazon-categories-product-type/) · [Amazon: create inventory templates / Valid Values](https://sellercentral.amazon.com/gp/help/external/200956770)

## 2. Verified defect ledger (the evidence)

Each is confirmed against current code and/or the real Halcyon run. `file:line` anchors are current as of this plan.

| # | Defect | Root cause (verified) | Where | Severity |
|---|---|---|---|---|
| **D1** | **`[object Object]`** in every Month (Credits Never Applied) and Snapshot (Aged-Stock) column | DuckDB returns temporal columns as `DuckDBTimestampValue`/`DuckDBDateValue` objects (only own-prop `micros`). They `toString()` fine in JS, but Supabase serializes `evidence` jsonb via `JSON.stringify`, which drops the toString → stored as `{"micros":…}` → rendered as `[object Object]`. **Verified 2026-07-05 by running the rule against Halcyon data.** | `run-rule.ts:63-66` (row→evidence), surfaces in `CategoryDeepDive.tsx:20-25,86,103` | **Fatal** — reads as unfinished software on a forensic report |
| **D2** | **Headline doesn't reconcile.** Recurring shown as 3 numbers ($319/mo vs $6,052 accrued vs $5,035 chart). Referral shows 280 orders/$3,094 in the narrative but 158 cases/$2,077 in the detail box. `findings_count` 1,122 but confidence widget sums to 1,000. | Numbers are computed in **three independent places** from **two different finding sets**: narrative + hero from `allFindings` (pre-insert, in `audit-run.ts`), category cards + confidence widget re-aggregated from DB `findings` on the report page. Any divergence (dropped inserts, retries, filtering) shows as contradictory numbers. | `audit-run.ts:150-190`, `data-builder.ts`, `r/[uuid]/page.tsx:95-108`, `narrate.ts:60-75` | **Fatal** — a verifier notices immediately |
| **D3** | **"Every figure traces to a row" is contradicted on the page** — Customer Returns (590) and Lost & Damaged (27) render flat **`$15` each, labeled "(est.)"** | `run-rule.ts:24` default estimator `() => 1500` ($15 flat) for rules that don't emit `amount_cents` (returns_gap, inventory_lost). ~$9k of the headline is a round placeholder sitting *above* the traceability promise. | `run-rule.ts:24,84-88`, `CategoryDeepDive.tsx:112-128` (FALLBACK "est.") | **High** — promise vs estimate can't coexist for this buyer |
| **D4** | **Softest bucket is the hero.** *Credits Never Applied* = ~75% of headline, 100% medium-confidence, was buggy (D1). The two sharpest wedges (referral 15%-vs-8%, size-tier) are highest-confidence but tiny and buried below. | Categories ordered by `$ desc` within wedge/reimbursement split (`r/[uuid]/page.tsx:88-92`); hero = `total_recoverable_cents` (everything). Report leads with soft evidence, buries sharp evidence. | `r/[uuid]/page.tsx:88-92,140-142` | **High** — inverts the "you found what?" strategy |
| **D5** | **Window/urgency inconsistent** — real countdowns for Lost & Damaged, "N/A" for Customer Returns; urgency bar credibility suffers | returns_gap emits `window_closes_on` but the FALLBACK renderer shows "N/A" when `window_days_remaining` is absent from evidence; urgency math in `data-builder`/page uses `<=14d` on a subset | `CategoryDeepDive.tsx:123-126`, `data-builder.ts:92-99` | **Medium** |
| **D6** | **Product-group mapping gap** — referral rule joins Fee-Preview `product-group` directly to referral-category labels. Real Amazon exports use *codes* ("ce", "home_garden"), not labels. Halcyon fixtures use matching labels so tests pass, masking it. | `referral-rates.ts` header warning; `product-group-map.ts` bridges some but "VERIFY and EXTEND against a real Fee Preview export before relying on coverage." | `referral-fee-mismatch.ts:36-40`, `reference/product-group-map.ts` | **Medium** — silent under-fire on real data (the lead wedge) |
| **D7** | **BigInt in evidence** — DuckDB `SUM()`/HUGEINT returns JS BigInt; not JSON-safe (companion to D1) | Same serialization path as D1; currently survives only because display helpers coerce with `Number()` | `run-rule.ts:63-66` | **Low** (defensive) |
| **D9** | **Latent false positives in the referral map** — `product-group-map.ts` maps `wireless→Consumer Electronics (8%)` and `shoes→Clothing (tiered <15%)`, both *below* the true rate → correctly-billed SKUs flagged as overcharges. Plus the heterogeneity problem: `Consumer Electronics` product-group spans 8% devices and 15% accessories (**Halcyon: 13 of 42 SKUs are 15% accessories under the CE label**), so even the correct `ce→8%` row fabricates findings without a per-SKU guard. | Verified 2026-07-05 against `referral-rates.ts` + Halcyon SKU families. Fix + guard spec in **`report-killer-referral-guard.md`**. | `reference/product-group-map.ts:51-75`, `referral-fee-mismatch.ts` | **High** — false findings are the worst outcome for a verify-everything buyer |
| **D8** | **Report page violates `frontend.md` aesthetic** — mandated "near-black premium financial tool," actual is light gradient (`from-slate-50 via-white`) | `r/[uuid]/page.tsx:125-128` + all card styling | **Decision needed** (see §6) — a printable-document look may be an intentional deviation |

---

## 3. Target design (the shape we're building)

```
┌─ TIER 1 — THE VERDICT (one screen) ───────────────────────────┐
│  HERO:  "$X/mo in provable overcharge, billed today"          │
│         (high-confidence, forward, traces to rows)            │
│  sub:   "+ $Y surfaced across N categories, high→review       │
│          confidence — detailed below"                         │
│  SPOTLIGHT: the single sharpest finding, real rows shown      │
│  CTA (one): 15 minutes, no pitch                              │
├─ TIER 2 — WHY YOU CAN TRUST THIS (thin strip) ────────────────┤
│  how computed · traceability promise · confidence legend      │
├─ TIER 3 — THE FORENSIC BODY (the depth) ──────────────────────┤
│  Categories ordered by CONFIDENCE × PUNCH (not raw $).        │
│  Each finding = a DOSSIER:                                    │
│    1. What happened (plain English)                          │
│    2. The evidence (exact rows, traceable, no object bugs)   │
│    3. The math, shown (how $X was computed)                  │
│    4. How to file it (Amazon case path + window + days left) │
│    5. Confidence & why (honest)                              │
│  Reimbursement/estimated buckets fenced in a labeled         │
│  "lower-confidence / may be auto-reimbursed" tier.           │
├─ TIER 4 — SELL THE SYSTEM (close) ────────────────────────────┤
│  finding is yours free · what recurs & needs our hands:       │
│  continuous monitoring · cross-channel · backward claims      │
└───────────────────────────────────────────────────────────────┘
```

---

## 4. Phases

Ordered by dependency and by **fix-what's-broken before add-new**. Phases 0–1 are the non-negotiable core that makes the report defensible *immediately*; 2–5 build the depth. Check off items the moment they're done (per CLAUDE.md).

### Phase 0 — Credibility foundation (the data-truth layer)

No new features. Make every number true and reconciled. Highest ROI; unblocks trust for everything else.

- [x] **P0.1 — Kill `[object Object]` (D1/D7).** In `run-rule.ts`, normalize DuckDB row values as they land in `evidence`: coerce `DuckDBTimestampValue`/`DuckDBDateValue`/`DuckDBTimeValue` → ISO strings (`YYYY-MM-DD` for dates, ISO for timestamps), and BigInt → Number (guard the 2^53 range). Do it once, centrally, so every rule benefits. Add a regression test that inserts a temporal evidence value and asserts it round-trips as a string. *Alt considered: cast to VARCHAR in each rule's SQL — rejected; the central fix is DRY and covers future rules.* **DONE 2026-07-06:** central `normalizeDuckDBValue`/`normalizeDuckDBRow` in `src/lib/duckdb/normalize.ts`, applied in both `run-rule.ts` and `tests/helpers.ts`. Probe found the bug is worse than D1's framing: `date_trunc` yields a **TIMESTAMP** (`micros: bigint`) and `SUM()` a **HUGEINT** (`bigint`), so `JSON.stringify(evidence)` *threw outright* — any rule emitting a SUM beside a temporal column could fail its whole insert (a latent D2 cause), not just render `[object Object]`. Regression test `tests/rules/evidence-serialization.test.ts` (temporal→date-string, bigint→number, full JSON round-trip) + unit test `tests/duckdb/normalize.test.ts` (2^53 guard). 74 tests green, lint clean.
- [x] **P0.2 — Single source of truth for every number (D2).** Make `report_data` (built in `data-builder.ts`) the **only** computed summary, derived from the **inserted** findings (post-DB, one set). The report page and PDF both render *from `report_data`* — the page stops independently re-aggregating `findings` for headline/confidence/category numbers. Guarantee: `findings_count` == rendered rows == confidence-widget sum; category narrative counts == category card counts; recurring is one number with one definition. Add a builder-level invariant check (sum of category totals == total; confidence buckets sum == findings_count) that throws in dev. **DONE 2026-07-06:** Root cause was the **PostgREST 1000-row cap** — `audit-run` built `report_data`/drafts from `insert().select()` (capped at 1000) and the report page re-aggregated a capped `findings` fetch, so on Halcyon (1,122 findings) the confidence widget summed to 1,000 and the referral card showed 158/$2,077 vs the narrative's 280/$3,094. Fix: `buildReportData` now takes the **complete in-memory `allFindings`** set, generates the top-25 drafts inline (dropping the capped `insertedFindings` dependency), and carries per-category count/total/urgent + **confidence breakdown**, top-level `confidence`, `skus_affected`, `recurring_cents`/`one_time_cents`, and the canonical category ordering. Exported `assertReportDataConsistent` (Σcategory==total, confidence==findings_count) runs in non-prod. The report page renders every headline/confidence/category number from `report_data`; `CategoryDeepDive` takes a `summary` prop for the cross-checkable header/count/confidence; the findings fetch is **paginated to completeness** so small-$ categories aren't dropped. New tests: `tests/pdf/data-builder.test.ts` (10) + `tests/halcyon-report.test.ts` (2, the P0.5 acceptance gate — Halcyon reconciles: 1,122/$62,760, confidence 845/277/0, referral 280/$3,094, zero object/bigint leaks). 86 tests green, build + lint clean.
- [x] **P0.3 — No estimate above the traceability promise (D3). LOCKED: fence now.** Keep returns_gap/inventory_lost estimated, but **move them below the fold into a fenced "Estimated — needs confirmation" tier**, exclude them from the hero and from the "traces to a row" claim, relabel honestly. Do NOT let the flat-$15 value sit above the traceability promise. (Fast-follow, not this phase: compute a real per-item recoverable in SQL — avg reimbursement / avg selling price, like `return_credit`.) **DONE 2026-07-06:** The flat-$15 rules are `returns_gap` + `refund_reimbursement_mismatch` (both `category:"returns"`, hence Halcyon's 590 = 57+533) + `inventory_lost` (`lost_inventory`) — i.e. exactly `REIMBURSEMENT_CATEGORIES`. `report_data` now carries `provable_cents` (real per-row amounts) / `estimated_cents` (flat-$15) / `provable_one_time_cents` + a per-category `estimated` flag; invariant extended (`provable + estimated == total`). The hero big number is now the **provable** figure ($53,505 on Halcyon, not $62,760); the traceability line describes the provable findings; the estimated tier renders in a dashed-border "Estimated — needs confirmation" section below with an honest disclaimer ("not counted in the $53,505 above; Amazon may have auto-reimbursed some"). Charts show the provable breakdown so they reconcile with the hero. *(Note: the `refunds` key in `CATEGORY_DISPLAY_NAMES` is dead — no rule emits that category; left as-is per surgical-change rule.)*
- [x] **P0.4 — Window/urgency consistency (D5).** Ensure `window_days_remaining` is always present in evidence when a window exists; render a real countdown or omit the urgency claim — never "N/A" next to an urgency bar that counts it. Reconcile the `<=14d` urgent total across hero + bar + category. **DONE 2026-07-06:** The "N/A vs countdown" split was closed/absent windows rendered as "N/A" — `CategoryDeepDive`'s window cell now uses a `windowLabel` helper: `null → "—"` (rolling, no deadline), `<0 → "closed"`, `≥0 → "Nd left"`, never "N/A". The hero's urgent badge now reads `provable_urgent_cents` (≤14d window among **provable** findings only — the fenced estimated tier's windows show in their own table, never in the headline), so it reconciles with the provable hero. All urgency numbers single-source from `report_data`. Test: `data-builder.test.ts` "provable urgency" asserts the estimated tier is excluded from the hero urgent figure.
- [x] **P0.5 — Re-run on Halcyon + eyeball.** Run the full pipeline against `tests/smoke/halcyon-audio/`, open the report, confirm: zero `[object Object]`, every number reconciles, the "traces to a row" line is literally true for everything above it. **DONE 2026-07-06:** encoded as `tests/halcyon-report.test.ts` — runs the full rule set on the real Halcyon dataset (~8k settlement rows, 42 SKUs), builds `report_data` exactly as the pipeline does, and asserts all three gate conditions on production-scale data: **zero object/bigint leaks** + no `"[object Object]"` in the report JSON; **every number reconciles** (invariant + Σcategory==total + confidence==1,122 + provable+estimated==total); **traceability literally true** (hero = provable $53,505, the flat-$15 $9,255 estimated tier fenced below/excluded). Eyeballed numbers: 1,122 findings · $62,760 surfaced · **$53,505 provable hero** · $319/mo recurring · confidence 845/277/0. ⚠️ *The literal in-browser render of the deployed page was NOT performed — it needs the live Supabase + Trigger.dev pipeline + a deploy (out of scope for a local session). The numeric/serialization acceptance is proven at production scale via the test above.*
- [x] **P0.6 — Harden the synthetic generator to be adversarial about format (see §1.5).** Update the generator (`PLAN.tmp.md` spec / wherever it lives) and regenerate Halcyon so `fba-fee-preview.csv` emits real Amazon product-group *codes* (`ce`, `home_garden`, …) instead of clean labels, plus any known header/code variants. This forces `reference/product-group-map.ts` to actually be exercised (surfacing the D6 class in CI instead of on the first real CSV). Ensure the smoke test asserts the referral wedge still fires *through the map*, not the identity path. Keep the generated dollar magnitudes explicitly labeled as artifacts (not a success metric). **DONE 2026-07-06:** generator is `scripts/generate-smoke-data.mjs` (deterministic — verified it reproduces the committed smoke files byte-for-byte before touching it). Added `PRODUCT_GROUP_CODE_BY_SLUG` (halcyon→`ce`, novapeak→`sporting_goods`, luxenest→`home_garden`, pureglow→`hpc`); `generateFeePreview` now writes the **code** while `generateSettlement` keeps the label for rate computation. Regenerated all 4 brands — the ONLY diff is the `product-group` column (175/175 cells). Referral counts are unchanged (Halcyon still 280, etc.), proving the code→category translation reconciles; a broken map would drop Halcyon to ~0. New CI guards in `tests/halcyon-report.test.ts`: assert the fee-preview value is `ce` (catches a revert to labels) and that referral findings carry the **mapped** `product_group="Consumer Electronics"` (catches a broken map). The unit test `referral-fee-mismatch.test.ts` already covers `ce → 8%` + the conservative unknown-code fallback.

**Exit gate:** ✅ **MET 2026-07-06.** `pnpm build` (✓ compiled, 0 errors) + `pnpm lint` (clean) + `pnpm test` (92 pass, +27 this phase, zero regressions). Halcyon `report_data` builds with no object bugs and fully-reconciled numbers (proven by `tests/halcyon-report.test.ts`). The traceability promise is literally true (provable hero, estimated tier fenced). The referral wedge fires against *code-form* product-groups (D6 caught in CI). *Awaiting user go-ahead before Phase 1. Note: live in-browser render pending deploy — see P0.5.*

### Phase 1 — Re-hero + information hierarchy (the tiered shape)

Reshape existing content into the approved tiered structure. No new detection.

- [x] **P1.1 — Tiered hero (D4).** Hero = the **provable-forward** figure: the high-confidence recurring overcharge as a monthly run-rate ("Amazon is overbilling you ~$X/month right now, and it compounds until fixed"). Demote `total_recoverable_cents` to a secondary "total surfaced" line with its confidence mix. Requires a `report_data` field for the high-confidence-forward number. **DONE 2026-07-06:** `buildReportData` now emits `provable_forward_cents` (Σ high-confidence rolling) + `provable_forward_monthly_cents` (÷ settlement_months; null if unknown). The hero big number on `r/[uuid]/page.tsx` is that monthly run-rate ($281/mo on Halcyon, not $53,505); `total_recoverable` demoted to a "$62,760 surfaced across 6 categories · $53,505 provable / $9,255 estimated · 845 high · 277 medium" sub-line. Filtering to **high-confidence** rolling keeps the headline undeniable (asymmetric-safety); a medium rolling finding still shows in its category card, just not in the hero. One monthly number everywhere (hero + forward-bleed chart + close) — no reconciliation drift.
- [x] **P1.2 — Spotlight the sharpest finding.** Above the forensic body, feature the single most-provable "you found what?" case (referral 15%-charged-where-8%-owed, or a 2+-tier size-tier miss) with its actual row(s) shown inline — undeniable in 30 seconds. **DONE 2026-07-06:** `report_data.spotlight` = the largest high-confidence rolling wedge (fallbacks: largest high-confidence, then largest finding). New `Spotlight.tsx` renders the plain-English claim + the **shown math** (referral: revenue × charged% vs owed%; size-tier: charged/unit − correct/unit × units) + a "traces to order/SKU" line. On Halcyon it picks size-tier `HA-HDP-001` — Large Bulky billed where Large Standard measured, $4.00/unit × 229 units = $916.
- [x] **P1.3 — Reorder by confidence × punch, fence the soft tier.** Replace the `$ desc` ordering with a rank that leads on high-confidence wedge findings; move reimbursement/estimated categories into a visually-fenced lower tier with an honest header. **DONE 2026-07-06:** categories now carry `high_cents`; `buildReportData` sorts the provable tier by **(high_cents desc, then total_cents desc)** — so referral ($3,094 all-high) and size-tier ($2,958 mostly-high) lead, and the $47,255 all-medium *Credits Never Applied* giant is demoted below them (inverts D4). Estimated reimbursement tier stays fenced below the fold (P0.3). The category bar honours this order (does NOT re-sort by $).
- [x] **P1.4 — Trust strip (Tier 2).** Between verdict and body: how it was computed, the traceability promise, the confidence legend (high/medium/review with meanings). Disarms the verifier before they doubt. **DONE 2026-07-06:** a 3-cell strip on the page — "Recomputed, not guessed" · "Every figure traces to a row" · "Honest confidence" (the high/medium/review legend). The duplicated legend paragraph was removed from the close's methodology box.
- [x] **P1.5 — Sell-the-system close (Tier 4).** Keep the existing CTA posture (already correct), tighten copy to name what recurs and what needs our hands. One CTA. **DONE 2026-07-06:** the close now names the recurring number explicitly (the `$X/mo` overcharge that compounds), cross-channel leakage, and the backward claims that need account access — one Calendly CTA. A restrained primary CTA also sits in the hero verdict (Tier 1) per §3.
- [x] **P1.6 — Visual system: better + more graph types (invoke the `dataviz` skill first).** Build a coherent, forensic-grade visual system — NOT chart soup. **DONE 2026-07-06:** `RecoveryVisuals.tsx` (2 charts) replaced by `ForensicVisuals.tsx` — **four** charts, each earning its place: **forward-bleed projection** (area — the $281/mo run-rate compounding to $3,369 over 12mo, reinforces the hero), **category bar** (confidence×punch order to match the body), **confidence×dollars** (high $5,334 vs medium $48,171 — proves the sharp-vs-soft hierarchy visually), and **dispute-window urgency timeline** (provable findings banded by days-to-close, replacing the weak urgency bar). New `report_data` aggregates feed them (`provable_confidence_cents`, `urgency_buckets`, forward-monthly). Per-SKU Pareto dropped (leakage is diffuse — 280 orders / 212 SKU-months). **dataviz applied:** the old category palette FAILED the CVD validator (referral-blue ↔ size-tier-violet ΔE 1.7 under deuteranopia — the two adjacent lead wedges); recolored to a validated set (referral blue `#2a78d6`, size-tier orange `#eb6834`, warm/cool distinct) in `category-meta.ts`; charts obey mark specs (thin bars, 4px rounded ends, hairline grid, direct labels, tooltips, `isAnimationActive={false}` per frontend.md "stillness"). Report is light-only by locked §3 Q4 (a deliberate single-theme choice, not an omission). Every chart value traces to a finding. **PDF (Typst) parity deferred to P4.1** (the plan's own assignment) — numbers already reconcile from `report_data`; only the PDF's visual/hero *emphasis* lags until Phase 4.

**Exit gate:** ✅ **MET 2026-07-06.** Report reads verdict → trust → forensic body → close. Sharpest finding leads; the $47k soft giant is correctly framed (medium) and ranked below the sharp wedge; hero is the provable-forward number ($281/mo). The visual system reads as one coherent forensic tool (4 charts, CVD-validated palette, every value traces to findings). `pnpm build` + `pnpm lint` clean + `pnpm test` 101 pass (+10 this phase). Halcyon eyeballed via a full report_data-driven render (Artifact preview). *Web/PDF "same story": numbers reconcile from the single `report_data`; PDF hero+visual re-alignment is P4.1 (Phase 4) per the plan's own split — flagged, not silently deviated. Awaiting user go-ahead before Phase 2/3.*

### Phase 2 — Finding dossiers (depth, per finding)

Turn each category table into a dispute-ready dossier. Surfaces content the pipeline already computes (`draft-dispute.ts` drafts, windows, evidence) but currently hides.

- [ ] **P2.1 — Dossier template** in `CategoryDeepDive` (or a new `FindingDossier` component): the 5-part structure (what happened / evidence rows / math shown / how-to-file + window / confidence & why). Extract per-category "how to file" (Amazon case path) into `category-meta.ts`.
- [ ] **P2.2 — Show the math.** For each finding, render the computation, not just the result (e.g. referral: "charged 15% × $X revenue = $A; category rate 8% = $B; overcharge $A−$B"). All figures already in `evidence`.
- [ ] **P2.3 — Surface the dispute draft.** The top-25 `draft-dispute` output is computed and stored but not shown on the web report — expose it per finding (copy-ready), or link to it in the PDF/CSV.
- [ ] **P2.4 — CSV export** of all findings (the report references "CSV export" but verify it exists; if not, add it — it's part of "yours to file, free").

**Exit gate:** each finding is independently understandable and filable from the report alone; a Controller could act on any single row without asking a question.

### Phase 3 — Selective new buckets (breadth, sharp not padding)

Add new **contract-free** sharp findings. **Research spike done 2026-07-05 → recommendation reshaped: see `report-killer-new-buckets.md`.** Honest finding: the gate is **data availability, not SQL** — current ingest has no actually-billed fulfillment-fee line (settlement = only Principal/Commission) and `storage_fees` is the Aged-Surcharge report (no cubic-foot basis). So the picks are re-sequenced by data cost, and one becomes a rule *upgrade* not a new bucket:
- [ ] **P3.1 — Dim-weight upgrade to size-tier (do first; NO new data).** Fold dimensional weight (`ceil(L×W×H/139)`, `max(actual,dim)`, respecting the <12oz / >150lb exemption) into `size_tier_misclassification` so the flagship rule is 2026-correct, AND surface the **sub-12oz dim-weight-exemption violation** as a high-confidence sub-finding. Runs on the fee-preview already in ingest. Ship as a **version bump** to the existing rule. Fixtures: dim-weight-inflated SKU + sub-12oz exemption. *(Replaces the old standalone "weight-rounding" bucket — post-2026 it mostly duplicated size-tier.)*
- [ ] **P3.2 — Low-Price FBA discount not applied (after G1).** ~$0.86/unit sub-$10 discount, detected by self-calibration (sub-$10 SKU billed fee vs same-tier ≥$10 peer median). **Blocked on G1.** Then pure SQL + fixture + registry + dossier + `category-meta`.
- [ ] **P3.3 — Storage cube overcharge (after G2; lowest priority).** Billed cube vs measured dims. **Blocked on G2** (needs new `monthly_storage` report type). Lower-confidence (unit vs packaged dims) → leans `review`. Defer unless cheap.
- [ ] **G1 — Generator/ingest: settlement fee lines.** Emit `FBAPerUnitFulfillmentFee` (+ ideally `FBAStorageFee`) in synthetic `settlement.csv` with a discount-missed/dim-weight-inflated knob; extend `headers.ts`. **Unblocks P3.2 + real dollars for P3.1.** The real Phase-3 long pole.
- [ ] **G2 — Generator/ingest: Monthly Storage Fees report.** New `monthly_storage` type (cu-ft + billed fee), header signature, upload tile, generator with inflated-cube knob. **Unblocks P3.3.**
- [ ] **P3.6 — Promo-fee buckets D + E (ride on G1; see `report-killer-new-buckets.md` §7).** Contract-free 3P promotion-fee leakage, founder-selected: **(D) Coupon redemption fee errors** — flag an order with a `CouponRedemptionFee` ($0.60) line but no matching promo discount → high-confidence; **(E) Deal fee double-booking** — flag ≥2 deal fees (Lightning/Best-Deal) for the same ASIN in one deal window → high-confidence. Both live as settlement `amount-description` fee lines → **blocked on G1**, then buildable alongside P3.2 (shared data work). Each = pure SQL + fixture + registry + dossier + `category-meta`. *(Subscribe & Save is DEFERRED — semi-contract-dependent, needs the seller's S&S funding config; belongs with co-op/Walmart post-~5-logos, not this build.)*
- [ ] Each new rule = versioned reference data (`reference_version`) + pure SQL + Vitest CSV fixture + registry entry + dossier rendering + `category-meta` entry. Follow `detection-rules.md`. **Note:** fee-preview `estimated-fee-total` is a *quote, not a charge* — a fulfillment-fee finding must reconcile against a billed fee line or be labelled hypothesis (never headline).
- [ ] **P3.5 — Resolve D6 + D9 (referral taxonomy & false positives). Research-built draft ready: `report-killer-referral-guard.md`.** Apply as ONE change (map + guard together — the map alone makes false positives worse): (1) drop in the improved `product-group-map.ts` (fixes the D9 rows, adds safe `gl_*` stems, bump `PRODUCT_GROUP_MAP_VERSION` → 2026.2); (2) add the two-signal false-positive guard to `referral-fee-mismatch.ts` — within-SKU temporal rate-change (Signal A, high-conf, no category needed) + peer-cluster suppression (Signal B); (3) confidence-tier by mapping certainty, with the interim one-liner (cap `expected_pct < 0.15` findings at `review`) if the full guard slips; (4) fixtures first, with a **heterogeneous, code-form** product-group (per P0.6) asserting accessories are NOT flagged and a mis-billed device IS. Bump the rule `version`. Real-export confirmation stays on the asterisk (P5.3). *Design conclusion: the map is necessary but not sufficient — the guard is required, not optional. Runs independently of P3.1–P3.3.*
- [ ] **P3.4 — Deploy the worker** after any `src/trigger/**`, `src/lib/rules/**` change: `npx trigger.dev@4.4.4 deploy` (CLI must match SDK). Migrate any new `finding_category` enum values (see memory: enum-migration-gotcha) or inserts silently drop.

**Exit gate:** new rules pass fixtures; render in dossier format; enum values migrated; worker deployed; they add "you found what?" punch without diluting the wedge.

### Phase 4 — Web/PDF parity + aesthetic

- [ ] **P4.1 — PDF parity.** `templates/report.typ` + `data-builder.ts` render the same tiered story: verdict (provable-forward hero) → categories by confidence×punch → dossiers → sell-the-system. PDF currently leads with `total_recoverable` on the cover — align to the tiered hero.
- [ ] **P4.2 — Aesthetic (D8). LOCKED: light printable-document.** Keep the report light (reads as a forensic audit you download/print/forward). Treat as a deliberate exception to `frontend.md` (which governs product surfaces) and **document the exception in `frontend.md`**. Do NOT move the report to near-black. Make web + PDF visually consistent with each other.
- [ ] **P4.3 — Share/OG readiness.** Report + landing OG tags read "Settlement Truth Audit" (payout integrity), never "FBA reimbursement" — for the LinkedIn pin (`feex-rework` R3.3).

**Exit gate:** PDF and web tell the same story with reconciled numbers; aesthetic is consistent and intentional.

### Phase 5 — Synthetic validation complete + the real-data asterisk list

Not "wait for real data." Everything synthetic-validatable is finished and gated here; then an explicit list of what stays provisional until one real CSV lands (see §1.5).

- [ ] **P5.1 — Run across the synthetic brands** (generator profiles in `PLAN.tmp.md` / `tests/smoke/brands/` if present, + Halcyon, all in code-form product-groups after P0.6) — confirm no `[object Object]`, reconciled numbers, sane hierarchy across varied brand profiles (high-return, low-leakage, large-catalog, etc.).
- [ ] **P5.2 — Recalibrate success metric** (`feex-rework` Nuance 8): the north star is NOT "median report value $30–75k" (an old FBA fantasy, and synthetic magnitudes are generator artifacts anyway). It's "surfaces a specific, verifiable, high-confidence, non-commoditized discrepancy that earns the call." Update admin + `plan.md`.
- [ ] **P5.3 — Write the explicit real-data asterisk list** — the format assumptions that synthetic data cannot confirm and that must be checked against the first real Fee Preview + Settlement export: (a) **D6** product-group code coverage/correctness [research-seeded in P3.5; confirm the actual code values + that no false positives appear]; (b) settlement `amount-description` string variants beyond `Principal`/`Commission`; (c) returns `detailed-disposition` + inventory-ledger `Reason`/`Event Type` code sets; (d) date/timestamp + currency formats; (e) header-name drift across export vintages. Each detection rule links to its asterisk. This list IS the "before you trust the numbers on a real seller" checklist.

**Exit gate:** the report is defensible on synthetic data at scale and across brand profiles; the metric measures the right thing; the real-data asterisk list exists and every rule points to it. (Full real-data confirmation happens when the first ICP CSV arrives — independent of this build.)

### Phase 6 — Funnel consistency (the surfaces around the report)

The report is not the whole lead magnet — the prospect walks landing → start → upload → processing → email → report. The report plan fixes the report; these items stop the *other* surfaces from contradicting it. **Verified 2026-07-05.** Small, but the email one specifically undoes Phase 0–1 if left alone.

- [ ] **P6.1 — Processing page: wire real progress (confirmed by Vyshag).** `run/[id]/page.tsx` currently runs **simulated** stages (`useState` + `setInterval`, comment: "will be replaced with useRealtimeRun"). Wire it to `useRealtimeRun()` from `@trigger.dev/react-hooks` reading `metadata.stage`/`progress` that `audit-run.ts` already emits (per `frontend.md` streaming rules: show real numbers like "Cross-referencing 8,133 settlement lines…", `aria-live="polite"`, no fake timers). Makes the work visible and honest.
- [ ] **P6.2 — Email re-hero to match the report (HIGH — it currently contradicts the plan).** `email/templates/report-ready.ts` subject + body still say *"$X Amazon may **owe** you"* — the old reimbursement framing AND the soft big-total hero Phase 0–1 removes. Re-hero to the **provable-forward number** + payout-integrity framing + a sell-the-system line, consistent with the report. This is the first thing every prospect sees; leaving it stale reintroduces the exact problem the report plan fixes.
- [ ] **P6.3 — Upload page: privacy as a conversion device.** `upload/[id]/page.tsx` privacy is a one-liner ("Encrypted… auto-deleted after 30 days"). The wiki calls the data-trust cliff the **#1 self-serve conversion risk** (`feex-rework` Nuance 2 / R3.1). Promote it to a prominent, scannable trust block: no login · raw CSVs auto-purged at 30d · **no LLM ever sees your rows** · never shared/trained · one-click deletion. Turns "overseas, no logo" into "we literally can't keep or misuse your data."

**Exit gate:** every surface a prospect touches (landing → upload → processing → email → report) tells one consistent payout-integrity, provable-forward, sell-the-system story with reconciled numbers and real progress. No surface still says "Amazon owes you."

---

## 5. Sequencing

```
Phase 0 (credibility) ─┬─> Phase 1 (re-hero/hierarchy/visuals) ─┬─> Phase 2 (dossiers) ─> Phase 4 (parity/aesthetic) ─> Phase 5 (validate)
                       │                                        └─> Phase 3 (new buckets; P3.1 no-data, P3.2/3/6 need G1/G2) ┘
     the gate ─────────┘  Phases 0+1 make it defensible NOW; 2–5 build depth.   Phase 6 (funnel) runs any time after Phase 1.
```

- **Phase 0 is the gate.** Nothing else matters until numbers reconcile and object bugs are gone. It's also the fastest to real impact.
- **Phase 1** can start copy/layout in parallel with Phase 0's tail, but renders correctly only once 0 lands. Visuals (P1.6) invoke the `dataviz` skill.
- **Phase 3** is the long pole — but the pole is **generator/ingest (G1/G2), not SQL**. P3.1 (dim-weight) needs no new data; P3.2/P3.3/P3.6 wait on G1/G2.
- **Phase 6 (funnel)** is independent — run it any time after Phase 1 lands the report hero (so the email can mirror it). P6.2 (email) is the highest-value funnel item; don't ship the new report with the old email.
- **Ship 0+1 first** even if 2–6 aren't done: a reconciled, object-bug-free, correctly-heroed report is already a killer leap over what Vyshag reviewed.

---

## 6. Open decisions

**Resolved 2026-07-05** (see §3 "Resolved open decisions"): Q1 estimated buckets → **fence now**; Q3 new buckets → originally Low-Price FBA + weight-rounding + storage-cube, **reshaped by the research spike** (`report-killer-new-buckets.md`): dim-weight becomes a size-tier *upgrade* (P3.1, no new data), low-price/storage/promo-fee (P3.2/3/6) are gated behind generator work G1/G2; Q4 aesthetic → **light printable-document**. Founder later added the **3P promo-fee buckets** (coupon + deal-fee, P3.6) and confirmed the **processing-page fix + funnel consistency** (Phase 6) and a **richer multi-chart visual system** (P1.6).

**Still open — decide when reached, defaults below are safe to proceed on:**

1. **Required vs optional reports (Q2)** — the wedge needs Settlement + Fee-Preview, which the original 3-report flow didn't require. Required (more friction, real findings) vs optional-with-nudge (less friction, weaker default). *Default: optional-with-strong-nudge for self-serve conversion.* Affects P1 empty-state copy only; not a Phase 0 blocker.
2. **Reference-table maintenance (Q5)** — who refreshes referral rates + fee schedules, how often? (Long pole; drifts when Amazon changes fees.) Only bites at P3/P5.

---

## 7. Doc maintenance (per CLAUDE.md — do in the same session as the code)

**Pre-execution alignment — DONE 2026-07-05** (so the canonical docs already point at this rework):
- [x] `plan.md` — pointer added at the top (the "Active in-flight rework" callout) so the source-of-truth plan references `report-killer-plan.md`. Fold shipped changes back into the relevant Phase 1.5/§4 lines as they land.
- [x] `decisions.md` — change-log rows added for the Report Killer approach (2026-07-05) and, retroactively, the FEEX rework (2026-06-13) to close the gap.
- [x] `report-killer-prompts.md` — per-phase execution prompts written.

**During execution — as each phase ships (don't defer):**
- [ ] `plan.md` — check items off / fold shipped report-surface changes into Phase 1.5/§4; keep it the source of truth.
- [ ] `architecture.md` — if `report_data` shape changes (P0.2) or new report types/reference tables land (P3/G1/G2), rewrite the affected lines (don't append).
- [ ] `decisions.md` — the 2026-07-05 row records the plan; add follow-up rows only if execution *supersedes* a locked choice (e.g. a §6 default is overturned).
- [ ] `.claude/rules/detection-rules.md` — add each new rule + new report type (G1/G2) when it lands.
- [ ] `.claude/rules/frontend.md` — document the light printable-document report exception (P4.2).
- [ ] Baslix wiki (`/wiki-update`) — capture the "credibility engineering as the real work" learning once 0+1 ship.

---

## 8. First actions in the execution session

1. Read this plan + `feex-rework.md` + `CLAUDE.md` + `.claude/rules/detection-rules.md` + `.claude/rules/frontend.md`.
2. The core decisions are already locked (§3 "Resolved open decisions"). Only §6 items 1–2 remain, and both have safe defaults — do NOT re-ask them to start; they only affect P1/P3.
3. Start **Phase 0**, TDD: write the temporal-serialization regression test first (P0.1), watch it fail, fix `run-rule.ts`, watch it pass.
4. Run the pipeline on `tests/smoke/halcyon-audio/` and use it as the visual acceptance fixture throughout.
5. Check items off here the moment they're done.
