import { describe, it, expect } from "vitest";
import { runRuleAgainstFixtures } from "../helpers";
import { returnCreditUnapplied } from "@/lib/rules/return-credit-unapplied";

/**
 * P0.1 (D1/D7): DuckDB returns temporal columns as DuckDBTimestampValue/
 * DuckDBDateValue objects and SUM()/HUGEINT as JS bigint. Both land in a
 * finding's `evidence`, which is serialized to jsonb on insert. Un-normalized,
 * the temporal objects render as "[object Object]" and the bigint makes
 * JSON.stringify throw outright — failing the whole findings insert.
 *
 * This locks the contract: every value in `evidence` is a JSON-safe primitive.
 */
describe("evidence serialization (P0.1 — D1/D7)", () => {
  it("normalizes temporal + bigint evidence to JSON-safe primitives", async () => {
    const findings = await runRuleAgainstFixtures(returnCreditUnapplied, {
      returns: "return-credit-returns.csv",
      inventory_ledger: "return-credit-ledger.csv",
      settlement: "return-credit-settlement.csv",
    });

    expect(findings.length).toBeGreaterThan(0);
    const evidence = findings[0].evidence;

    // Temporal column (date_trunc → TIMESTAMP) renders as a date string, never an object.
    expect(typeof evidence.month).toBe("string");
    expect(evidence.month).toMatch(/^\d{4}-\d{2}-\d{2}/);

    // HUGEINT/BIGINT aggregates coerce to JS numbers, not bigint.
    expect(typeof evidence.returned_qty).toBe("number");
    expect(typeof evidence.gap_qty).toBe("number");

    // The whole evidence object survives the JSON round-trip the DB insert performs.
    expect(() => JSON.stringify(evidence)).not.toThrow();
    expect(JSON.parse(JSON.stringify(evidence))).toEqual(evidence);
  });
});
