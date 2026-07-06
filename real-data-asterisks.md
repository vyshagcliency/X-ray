# Real-Data Asterisk List — what synthetic data cannot confirm

**Created:** 2026-07-07 (Report Killer P5.3) · **Owner:** Vyshag
**Companion:** `report-killer-plan.md` §1.5 + the D6 phase-independent gate · `.claude/rules/detection-rules.md`

## What this is

Every finding this tool emits is validated **only against synthetic data** (`tests/smoke/` + the generator `scripts/generate-smoke-data.mjs`). Synthetic data proves **presentation + reconciliation** at production scale (rendering, single-source-of-truth numbers, hierarchy — Phases 0/1/2/4/5.1, all done). It **structurally cannot** prove **detection-vs-reality**, because the generator and the rules share the same authors' assumptions about how Amazon formats its exports (`report-killer-plan.md` §1.5). "The rule fires on the smoke data" proves the rule *runs*, not that it's *correct against a real Amazon CSV*.

**This file is the checklist to walk the first time a real Fee Preview + Settlement (+ Returns + Inventory Ledger + Monthly Storage) export lands.** Until then, detection *correctness* is provisional. Every detection rule links here from a `// REAL-DATA ASTERISK (P5.3):` comment; every asterisk below names the safe-failure direction so you know which way an error breaks.

**The one asymmetric-safety rule that governs all of this** (`report-killer-plan.md` D6): a **false finding is catastrophic** (a verify-everything CFO dismisses the whole tool), a **missed finding is merely a smaller report**. So every assumption below is engineered to fail *toward under-firing*. When you confirm on real data, the priority order is: **(1) kill any false positives, then (2) recover any missed findings.**

## How to use it (when the first real export arrives)

1. Diff the real CSV headers against the signatures in `src/lib/csv/headers.ts` → resolves class **(E)**.
2. For each rule below, pull the distinct values of the columns it keys on from the real export (`SELECT DISTINCT "amount-description" …`, `… "detailed-disposition" …`, `… "product-group" …`) and compare to the literal sets the rule matches. A value present in reality but absent from the rule = a **missed** finding (safe, fix later); a value the rule matches that means something different in reality = a possible **false** finding (fix first).
3. Spot-check the highest-$ findings of each rule against the seller's own Seller Central case log — do they reconcile to a real overcharge?
4. Update the rule + bump its `version` (and any `*_VERSION` reference table), then delete or narrow the asterisk here.

---

## A. Cross-cutting format-assumption classes

These are the five classes flagged in `report-killer-plan.md` P5.3. Individual rules (§B) reference them by letter.

### (a) Product-group code coverage & correctness — the D6 gate
- **Assumption:** the Fee Preview `product-group` column carries codes (`ce`, `home_garden`, `hpc`, `sporting_goods`, …) that `src/lib/rules/reference/product-group-map.ts` (v2026.2) maps to the correct referral category, and the seller's real codes are within the mapped subset.
- **Why synthetic can't confirm it:** Amazon does **not** publish the enumerated `product-group`/GL-code list, and it drifts. The generator emits our *best guess* of the codes (P0.6) — the same guess the map decodes, so the smoke test proves the map *runs*, not that it matches Amazon's live enum. The true rate determinant is Amazon's internal GL code, "not always matching storefront categories."
- **Confirm on real data:** every distinct `product-group` value appears in the map; no mapped code sits *below* the SKU's true referral rate (would fabricate an overcharge).
- **Safe-failure direction:** unmapped → `Everything Else` (15%, the max) → can only *miss*, never falsely flag. Research-seeded + guarded in P3.5; **the map's real-world coverage stays provisional until this step.**
- **Rules affected:** `referral_fee_mismatch`.

### (b) Settlement `amount-description` string variants
- **Assumption:** the Payments/Settlement V2 flat file labels line items exactly `Principal`, `Commission`, `FBAPerUnitFulfillmentFee`, `CouponRedemptionFee`, `ItemPromotionDiscount` / `Promotion` / `PromotionShipping`, `LightningDealFee` / `BestDealFee` / `DealFee`; and revenue rows carry `transaction-type = 'Order'` with a `quantity-purchased` column.
- **Why synthetic can't confirm it:** the generator writes these exact strings; real V2 exports have historically varied fee-group names across vintages and marketplaces (see the Webgility fee-name reference cited in `report-killer-new-buckets.md`).
- **Confirm on real data:** `SELECT DISTINCT "amount-description"` — every fee a rule keys on is present under the expected string; no revenue/fee is hiding under an unmatched label.
- **Safe-failure direction:** an unmatched fee label → the rule sees zero of that fee → **misses** (safe). Exception: `Commission`/`Principal` mislabeling would distort the referral rate itself — check these two first.
- **Rules affected:** `referral_fee_mismatch`, `size_tier_misclassification`, `return_credit_unapplied`, `low_price_fba`, `coupon_fee_error`, `deal_fee_double_booked`.

### (c) Disposition / event-type / reason code sets
- **Assumption:** Returns `detailed-disposition` uses `SELLABLE` / `CUSTOMER_DAMAGED` / `DEFECTIVE` / `CARRIER_DAMAGED` / `DAMAGED` and a `status` of `Refunded`; the Inventory Ledger uses `Event Type` ∈ `CustomerReturns` / `Adjustments` / `Shipments` with single-letter `Reason` codes (`G`, `R`, `M`, `E`, `D`, `U`) and `Disposition = SELLABLE`.
- **Why synthetic can't confirm it:** the generator emits exactly this set; Amazon's real disposition/reason enumerations are larger and drift, and the single-letter Reason codes are only semi-documented.
- **Confirm on real data:** `SELECT DISTINCT "detailed-disposition"`, `… "Event Type"`, `… "Reason"`, `… "Disposition"` against the literal `IN (…)` lists in each rule.
- **Safe-failure direction:** a real damage/adjustment code the rule doesn't list → **missed** finding (safe). A code the rule lists that in reality means "already reimbursed" → possible **false** finding — verify the reason codes on the highest-$ hits first.
- **Rules affected:** `return_credit_unapplied`, `aged_surcharge_on_sold`, `returns_gap`, `inventory_lost`, `refund_reimbursement_mismatch`.

### (d) Date / timestamp / currency formats
- **Assumption:** dates parse as `YYYY-MM-DD`, amounts are a plain decimal in the account's single currency, and settlement rows carry a `posted-date` from which the settlement-month span (the hero's `÷ months` denominator) is derived.
- **Why synthetic can't confirm it:** the generator writes clean ISO dates + USD; real exports vary by marketplace locale (thousands separators, `DD.MM.YYYY`, currency symbols, multi-currency accounts). Note the DuckDB `DATE + INTERVAL` → TIMESTAMP shift already bit us once (memory: cast `::DATE`).
- **Confirm on real data:** the window countdowns render real dates (not "—"/"closed" everywhere), the settlement-month count is plausible, and no amount parses to `NULL`/`0` from a locale mismatch.
- **Safe-failure direction:** an unparseable date → `window_closes_on = NULL` → rolling framing, no false urgency (safe). A currency-parse failure would zero a finding → **miss** (safe) — but a *multi-currency* account could sum across currencies incorrectly; flag multi-currency accounts as out-of-scope until handled.
- **Rules affected:** all (window/urgency + the forward-monthly hero denominator).

### (e) Header-name drift across export vintages
- **Assumption:** column names match `src/lib/csv/headers.ts` signatures exactly (`quantity-purchased`, `product-size-tier`, `item-volume`, `snapshot-date`, `longest-side`/`median-side`/`shortest-side`/`item-package-weight`, `detailed-disposition`, `Event Type`, …).
- **Why synthetic can't confirm it:** the generator writes today's header names; Amazon renames columns and report types over time (e.g. "FBA Inventory Adjustments" → "Inventory Ledger", Jan 2023; settlement V1 → V2).
- **Confirm on real data:** the CSV validator accepts the real export without a header mismatch; every column a rule quotes exists under that exact name.
- **Safe-failure direction:** a renamed column → DuckDB errors or reads `NULL` → the rule fails loudly or emits nothing → no silent false finding. Header validation is the first line of defense (upload-time).
- **Rules affected:** all.

---

## B. Per-rule asterisks

Each rule carries a `// REAL-DATA ASTERISK (P5.3):` pointer to this file.

| Rule (`version`) | The specific assumption only a real export confirms | Classes | If wrong, it… |
|---|---|---|---|
| `referral_fee_mismatch` (2.0.0) | The `product-group` code→referral-category map is complete & correct for this seller's codes; the two-signal guard (temporal rate-jump + peer cluster) suppresses map-error false positives. The lead wedge. | (a)(b) | **misses** if a code is unmapped (→15% fallback); the guard exists precisely because a *wrong* map row could **falsely flag** — verify no mapped code sits below its true rate. |
| `size_tier_misclassification` (2.0.0) | The Fee Preview carries Amazon's measured dims (`longest/median/shortest-side`, `item-package-weight`) and a `product-size-tier` label from the real tier enum; the dim-weight divisor (139) + sub-12oz exemption are current; self-calibration finds enough correctly-classified peers per tier. | (b)(e) | **misses** if dims/tier labels differ; self-calibration falls back to the schedule fee when a tier has no clean peer sample. |
| `return_credit_unapplied` (1.0.0) | `SELLABLE` returns + ledger `CustomerReturns`/`Adjustments` with `Reason IN ('G','R')` reliably mark restocked-but-uncredited units; settlement `Principal` per-unit price is the right credit basis. | (b)(c) | **misses** on unlisted restock codes; a mis-scoped reason code could **falsely** flag a unit already credited — check reason codes first. |
| `aged_surcharge_on_sold` (1.0.0) | The Aged-Inventory Surcharge report's `surcharge-type` + ledger `Event Type = 'Shipments'` (Qty<0) identify a surcharge billed on already-sold stock. | (c)(e) | **misses** if surcharge-type/event strings differ. |
| `low_price_fba` (1.0.0) | Real FBA per-unit fulfillment fees are **tier-correlated**, so a sub-$10 SKU billed a non-discounted fee vs its same-tier ≥$10 peers = a missed Low-Price discount (~$0.86/unit). **Known not to fire on synthetic smoke** (the generator's fee is price-banded, not tier-correlated) — this rule is validated *only* on real data. | (b) | emits **nothing** on synthetic (by design); on real data, confirm real fulfillment fees cluster by tier and the ~$0.86 discount magnitude is current. |
| `coupon_fee_error` (1.0.0) | A `CouponRedemptionFee` line with **no** matching `ItemPromotionDiscount`/`Promotion` line on the same order = an erroneously-charged coupon fee (i.e. a real coupon always books both). | (b) | **falsely flags** if Amazon legitimately books the fee and discount on *different rows/dates* than the rule pairs — verify the pairing on real orders before trusting the count. |
| `deal_fee_double_booked` (1.0.0) | ≥2 `LightningDealFee`/`BestDealFee`/`DealFee` lines for one SKU on one posted-date = a double-book (a legitimate deal bills once per window). | (b)(d) | **falsely flags** if a real multi-day deal legitimately bills the fee on multiple days — confirm the once-per-window billing cadence. |
| `storage_cube_overcharge` (1.0.0) | Monthly Storage `item-volume` (billed cu ft) is comparable to the cube recomputed from Fee Preview dims; the 1.25× tolerance absorbs packaged-vs-bare-item dims. Already low-confidence (leans `review`). | (b)(d)(e) | **misses** within tolerance; **falsely flags** only if real packaged dims exceed bare dims by >25% systematically — never headlines (review-tier by design). |
| `returns_gap` (1.0.0) | Damaged-return dispositions (`CUSTOMER_DAMAGED`/`DEFECTIVE`/`CARRIER_DAMAGED`/`DAMAGED`) + ledger `Adjustments` reasons (`G`/`M`/`R`) identify a damaged unit with no reimbursement. **Amount is a flat-$15 estimate** (fenced below the fold, excluded from the hero). | (c) | **misses** on unlisted codes; the $15 magnitude is a placeholder, not a traced number (real per-item value is a fast-follow). |
| `inventory_lost` (1.0.0) | Ledger `Adjustments` with `Reason IN ('E','M','D','U'[,'G','R'])` identify lost/damaged units without reimbursement. **Flat-$15 estimate**, fenced. | (c) | **misses** on unlisted reason codes; $15 is a placeholder. |
| `refund_reimbursement_mismatch` (1.0.0) | Returns with `status='Refunded'` + a damage disposition, absent from reimbursements, = a customer refund never reimbursed. **Flat-$15 estimate**, fenced. | (c) | **misses** on unlisted status/disposition; $15 is a placeholder. |

---

## C. Magnitude & estimator asterisks (the metric, not the format)

Distinct from format-correctness: even where a rule is *correct*, its **dollar magnitudes on synthetic data are meaningless** as a success signal.

- **Synthetic dollars are generator knobs.** Every leakage rate in `scripts/generate-smoke-data.mjs` is a dial we set. A "$64,478 Halcyon report" measures the generator, not the tool. This is why the north-star metric was recalibrated off "median report value $30–75k" (P5.2 / `feex-rework` Nuance 8): the gate is **"surfaces a specific, verifiable, high-confidence, non-commoditized discrepancy that earns the call,"** not raw dollar size.
- **The three reimbursement rules use a flat $15/finding placeholder** (`returns_gap`, `inventory_lost`, `refund_reimbursement_mismatch`). This is honest-fenced (below the fold, excluded from the provable hero and the traceability claim — P0.3), but the real per-item recoverable (avg reimbursement ÷ avg selling price, like `return_credit`) is a fast-follow to compute in SQL once real reimbursement data confirms the ratio.
- **The referral rate jump is a planted demo property.** The generator plants one rate-jump SKU per brand (`RATE_JUMP_SKU_INDEX`) so Signal A demonstrates a HIGH-confidence referral finding. Real data will show whatever it shows — do not read the synthetic high/medium split as a real-world base rate.

---

## D. Status

Everything **synthetic-validatable is done and gated** (Phases 0–4 + P5.1: `tests/synthetic-brands-report.test.ts` proves reconciliation + no object bugs + sane hierarchy on all four profiles at production scale). What remains is **real-data confirmation of the format assumptions above** — which happens the moment the first ICP CSV lands, independent of any build phase. Walk §A + §B against that export, kill false positives first, then recover misses.
