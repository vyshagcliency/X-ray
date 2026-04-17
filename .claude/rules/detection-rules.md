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
  requiredReports: ["returns", "reimbursements", "adjustments"],
  optionalReports: [],

  // Pure SQL. $returns_url, $reimbursements_url, etc. are parameterised signed URLs.
  // DuckDB opens Parquet via read_parquet('<url>') — no files on disk, no temp tables.
  sql: /* sql */ `
    WITH damaged_returns AS (
      SELECT order_id, sku, fnsku, return_date, refund_cents, quantity, row_ref
      FROM read_parquet($returns_url)
      WHERE disposition IN ('CUSTOMER_DAMAGED','DEFECTIVE','CARRIER_DAMAGED','DAMAGED')
    ),
    ...
    SELECT
      d.order_id,
      d.sku,
      d.refund_cents           AS amount_cents,
      d.return_date + INTERVAL 60 DAY AS window_closes_on,
      d.row_ref                AS row_ref
    FROM damaged_returns d
    LEFT JOIN ...
    WHERE ...
  `,

  // Confidence is the only post-SQL logic allowed — it maps a row's attributes to an enum.
  confidenceFn: (row) =>
    ["DEFECTIVE", "CUSTOMER_DAMAGED"].includes(row.disposition) ? "high" : "medium",
}
```

## Mandatory fields in every SQL result set

Every rule's SELECT must return:
- `amount_cents` — `bigint`, the recoverable amount, **computed entirely in SQL**
- `window_closes_on` — `date`, the last day to file, **computed in SQL** from source event date + policy window
- `row_ref` — JSON string `{ upload_id: string, row_number: number }` — the exact source row for the evidence trail

If a rule's finding involves multiple source rows (e.g., a return row + a reimbursement row that was lower), return both in `row_ref` as an array.

## Testing — fixture first, always

Every rule ships with a test file at `tests/rules/{rule_id}.test.ts`.

```ts
// tests/rules/returns-gap.test.ts
import { describe, it, expect } from "vitest"
import { runRuleAgainstFixtures } from "../helpers"
import { returnsGap } from "@/lib/rules/returns-gap"

describe("returns_gap", () => {
  it("flags a damaged return with no corresponding reimbursement", async () => {
    const findings = await runRuleAgainstFixtures(returnsGap, {
      returns: "fixtures/returns-with-gap.parquet",
      reimbursements: "fixtures/reimbursements-empty.parquet",
      adjustments: "fixtures/adjustments-empty.parquet",
    })
    expect(findings).toHaveLength(1)
    expect(findings[0].amount_cents).toBe(4999n)
    expect(findings[0].confidence).toBe("high")
    expect(findings[0].window_closes_on).toBeDefined()
  })

  it("does NOT flag a return that was already reimbursed", async () => {
    const findings = await runRuleAgainstFixtures(returnsGap, {
      returns: "fixtures/returns-with-gap.parquet",
      reimbursements: "fixtures/reimbursements-matched.parquet",
      adjustments: "fixtures/adjustments-empty.parquet",
    })
    expect(findings).toHaveLength(0)
  })
})
```

Fixture Parquet files live in `tests/fixtures/`. Helper `runRuleAgainstFixtures` creates an in-process DuckDB, runs the rule SQL with the fixture files, and returns typed findings. No mocking, no faking — real DuckDB against real Parquet.

## Rule registry

```ts
// src/lib/rules/index.ts
export interface Rule {
  id: string
  version: string                        // semver — bump on any logic change
  requiredReports: ReportType[]
  optionalReports?: ReportType[]
  sql: string
  confidenceFn: (row: RuleResultRow) => "high" | "medium" | "low"
}

export const rules: Rule[] = [
  returnsGap,        // Phase 1
  inventoryLost,     // Phase 1
  refundMismatch,    // Phase 1
  // ...
]
```

## Parquet → DuckDB patterns

DuckDB reads Parquet directly from Supabase Storage signed URLs. No download, no temp files:

```ts
// src/lib/duckdb/run-rule.ts
const db = await DuckDBInstance.create(":memory:")
const conn = await db.connect()
await conn.run(`
  INSTALL httpfs; LOAD httpfs;
  SET s3_region='...'; -- if needed
`)
const stmt = await conn.prepare(rule.sql)
const result = await stmt.run({
  returns_url: signedUrls.returns,
  reimbursements_url: signedUrls.reimbursements,
  // ...
})
```

## Versioning

- Every rule has a semver in `version`.
- Bump patch (`1.0.0` → `1.0.1`) for bug fixes (finding an error in the join condition).
- Bump minor (`1.0.0` → `1.1.0`) for expanded detection (new disposition codes added).
- Bump major (`1.0.0` → `2.0.0`) for logic changes that would produce different findings on the same data.
- All Trigger.dev `detect.rule` tasks write `rule_version` from the registry — not hardcoded in the task.
- Old reports remain reproducible via the stored `rule_versions` jsonb on each `audits` row.

## What NOT to do

- No arithmetic in TypeScript on rule outputs. Amount is `amount_cents` from SQL.
- No filtering result rows by amount ("only flag if > $100"). Put that in the SQL `WHERE` clause.
- No joining SQL results with other DuckDB queries in TypeScript. Do it in a single SQL statement.
- No LLM calls inside a detection rule. LLM is downstream (`narrate.llm`, `draft.disputes`).
- No side effects inside a rule SQL (no writes, no temp tables persisted).
- Don't add a rule without a fixture test. No exceptions.
