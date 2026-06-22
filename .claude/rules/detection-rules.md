---
paths: ["src/lib/rules/**", "src/lib/duckdb/**", "src/trigger/detect-rule.ts", "src/trigger/parse-csv.ts", "tests/rules/**"]
---

# Detection rule rules

## The contract

Every finding in this product traces to a real transaction in a real CSV. A hallucinated finding would end Baslix's credibility with a Controller. This is the file that prevents that.

**The rule:** Detection logic is pure SQL. TypeScript code wraps execution and maps result rows to `findings` inserts. It does not post-process, filter, recalculate, or adjust outputs. If you need to calculate something, do it in SQL.

## Rule file shape

```ts
// src/lib/rules/returns-gap.ts
import type { Rule } from "./index"

export const returnsGap: Rule = {
  id: "returns_gap",
  version: "1.0.0",
  requiredReports: ["returns", "reimbursements", "inventory_ledger"],
  category: "returns",

  // Pure SQL. $returns_url, $reimbursements_url, $inventory_ledger_url are substituted with file paths or signed URLs.
  // DuckDB opens CSVs via read_csv(<url>, auto_detect=true) — no Parquet conversion in Phase 1.
  sql: /* sql */ `
    WITH damaged_returns AS (
      SELECT
        "order-id" AS order_id,
        sku, fnsku,
        "return-date" AS return_date,
        quantity,
        "detailed-disposition" AS disposition,
        row_number() OVER () AS row_ref
      FROM read_csv($returns_url, auto_detect=true)
      WHERE "detailed-disposition" IN ('CUSTOMER_DAMAGED','DEFECTIVE','CARRIER_DAMAGED','DAMAGED')
    ),
    ...
  `,

  // Confidence is the only post-SQL logic allowed — it maps a row's attributes to an enum.
  confidence: (row) =>
    row.disposition === "DEFECTIVE" ? "high" : "medium",
}
```

## Mandatory fields in every SQL result set

Every rule's SELECT must return:
- `window_closes_on` — date, the last day to file, **computed in SQL** from source event date + policy window
- `row_ref` — text, derived from `row_number() OVER ()` — the source row position for the evidence trail

**Amount:** two paths. (1) **Reimbursement rules** (Bucket 3) omit an amount column → `runRule`'s `estimateAmountCents` callback fills it (default $15/finding). (2) **Payout-integrity rules** (Phase 1.5) compute the *real* recoverable overcharge in SQL and emit it as an `amount_cents` column; `runRule`/`helpers` prefer it when present. Either way the arithmetic lives in SQL — never post-process amounts in TypeScript. `window_closes_on` may be `NULL` for rolling overcharges (referral/size-tier have no hard dispute window — PRD §5.5/§5.6).

## Report types

Phase 1 (reimbursement / Bucket 3):
- `returns` — FBA Customer Returns Report (headers: `return-date`, `order-id`, `sku`, `asin`, `fnsku`, `product-name`, `quantity`, `fulfillment-center-id`, `detailed-disposition`, `reason`, `license-plate-number`, `customer-comments`; optional: `status`)
- `reimbursements` — FBA Reimbursements Report (headers: `approval-date`, `reimbursement-id`, `case-id`, `amazon-order-id`, `reason`, `sku`, `fnsku`, `asin`, `condition`, `currency-unit`, `amount-per-unit`, `amount-total`, `quantity-reimbursed-cash`, `quantity-reimbursed-inventory`, `quantity-reimbursed-total`)
- `inventory_ledger` — Inventory Ledger Detailed View (headers: `Date`, `FNSKU`, `ASIN`, `MSKU`, `Title`, `Event Type`, `Reference ID`, `Quantity`, `Fulfillment Center`, `Disposition`, `Reason`; optional: `Country`)

Phase 1.5 (payout integrity / "Settlement Truth Audit" — the lead):
- `settlement` — Payments All Statements V2 flat file. Per `(order-id, sku)`: `amount-description='Principal'` = revenue, `='Commission'` = referral fee charged. Source of truth for the referral % and per-SKU unit volume.
- `fba_fee_preview` — FBA Fee Preview. Amazon's measured `longest-side`/`median-side`/`shortest-side`/`item-package-weight`, assigned `product-size-tier`, and `estimated-fee-total`.
- `storage_fees` — FBA Aged Inventory Surcharge (`snapshot-date`, `sku`, `qty-charged`, `surcharge-type`, `surcharge-amount`).

**Reference tables** (`src/lib/rules/reference/`, versioned SQL `VALUES` CTEs composed into rule SQL):
- `referral-rates.ts` — category referral %, progressive/tiered model. Authoritative (Amazon public pricing page).
- `fba-fee-schedule.ts` — size-tier dimension/weight boundaries + a *fallback* fee per tier. Fee dollars are representative; the size-tier rule self-calibrates real dollars from the seller's own `estimated-fee-total` (median fee of correctly-classified SKUs per tier) and only falls back to the schedule when a tier has no clean sample.
- `product-group-map.ts` — bridges Fee Preview `product-group` codes (`ce`, `home_garden`, …) → referral category labels. Unmapped → "Everything Else" (15%) so a mapping miss can only *miss* an overcharge, never falsely flag one.

Bump the matching `*_VERSION` and the rule `version` when values change. **DuckDB gotcha:** `at` is a reserved keyword — alias tier joins as `amzt`, not `at`.

**Note:** Amazon deprecated "FBA Inventory Adjustments" in Jan 2023. The internal key was renamed from `adjustments` to `inventory_ledger` (2026-05-08).

## Testing — fixture first, always

Every rule ships with a test file at `tests/rules/{rule_id}.test.ts`.

```ts
// tests/rules/returns-gap.test.ts
import { describe, it, expect } from "vitest"
import { runRuleAgainstFixtures } from "../helpers"
import { returnsGap } from "@/lib/rules/returns-gap"

describe("returns_gap", () => {
  it("flags damaged returns with no corresponding reimbursement", async () => {
    const findings = await runRuleAgainstFixtures(returnsGap, {
      returns: "returns-with-gap.csv",
      reimbursements: "reimbursements-empty.csv",
      inventory_ledger: "inventory-ledger-empty.csv",
    })
    expect(findings.length).toBe(3)
    expect(findings.every(f => f.rule_id === "returns_gap")).toBe(true)
  })
})
```

Fixture CSV files live in `tests/fixtures/`. Helper `runRuleAgainstFixtures` creates an in-process DuckDB, runs the rule SQL with the fixture files, and returns typed findings. No mocking, no faking — real DuckDB against real CSV.

Smoke test datasets for 3 synthetic brands live in `tests/smoke/{brand-slug}/`. Generator script: `scripts/generate-smoke-data.mjs` (deterministic, seeded PRNG).

## Rule registry

```ts
// src/lib/rules/index.ts
export interface Rule {
  id: string
  version: string                        // semver — bump on any logic change
  requiredReports: ReportType[]
  category: string
  sql: string
  confidence: (row: Record<string, unknown>) => "high" | "medium" | "low"
}

export const RULES: Rule[] = [
  // Payout-integrity wedge (Phase 1.5) — the lead.
  referralFeeMismatch,         // PRD §5.6 — settlement + fba_fee_preview
  sizeTierMisclassification,   // PRD §5.5 — fba_fee_preview + settlement
  returnCreditUnapplied,       // PRD §5.4 — returns + inventory_ledger + settlement
  agedSurchargeOnSold,         // PRD §5.8 — storage_fees + inventory_ledger
  // Reimbursement add-ons (Phase 1) — demoted out of the lead.
  returnsGap,                  // PRD §5.1
  inventoryLost,               // PRD §5.2
  refundReimbursementMismatch, // PRD §5.3
]
```

## CSV → DuckDB patterns

DuckDB reads CSVs directly from Supabase Storage signed URLs (Phase 1) or local file paths (tests):

```ts
// src/lib/duckdb/run-rule.ts
const { connection, instance } = await createDuckDB()
let sql = rule.sql
for (const [type, url] of Object.entries(csvUrls)) {
  sql = sql.replaceAll(`$${type}_url`, `'${url}'`)
}
const result = await connection.runAndReadAll(sql)
```

Phase 2 may add CSV → Parquet conversion via `COPY ... TO 'file.parquet'` for faster re-reads on large datasets.

## Versioning

- Every rule has a semver in `version`.
- Bump patch (`1.0.0` → `1.0.1`) for bug fixes (finding an error in the join condition).
- Bump minor (`1.0.0` → `1.1.0`) for expanded detection (new disposition codes added).
- Bump major (`1.0.0` → `2.0.0`) for logic changes that would produce different findings on the same data.
- `audit-run.ts` writes `rule_versions` from the registry to each `audits` row.
- Old reports remain reproducible via the stored `rule_versions` jsonb.

## What NOT to do

- No arithmetic in TypeScript on rule outputs. Amount estimation is the one exception (via `estimateAmountCents` callback), and it does NOT modify SQL output.
- No filtering result rows by amount ("only flag if > $100"). Put that in the SQL `WHERE` clause.
- No joining SQL results with other DuckDB queries in TypeScript. Do it in a single SQL statement.
- No LLM calls inside a detection rule. LLM is downstream (`narrate.ts`, `draft-dispute.ts`).
- No side effects inside a rule SQL (no writes, no temp tables persisted).
- Don't add a rule without a fixture test. No exceptions.
