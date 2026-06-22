import { describe, it, expect } from "vitest";
import { runRuleAgainstFixtures } from "../helpers";
import { returnCreditUnapplied } from "@/lib/rules/return-credit-unapplied";

describe("return_credit_unapplied", () => {
  it("flags sellable returns that were never credited back to inventory", async () => {
    const findings = await runRuleAgainstFixtures(returnCreditUnapplied, {
      returns: "return-credit-returns.csv",
      inventory_ledger: "return-credit-ledger.csv",
      settlement: "return-credit-settlement.csv",
    });

    // RC-OK: 2 sellable returns, 2 credited back → no gap.
    // RC-BAD: 3 sellable returns, 1 credited back → gap of 2 units.
    expect(findings.length).toBe(1);
    const f = findings[0];
    expect(f.rule_id).toBe("return_credit_unapplied");
    expect(f.evidence.sku).toBe("RC-BAD");
    expect(Number(f.evidence.gap_qty)).toBe(2);
  });

  it("values the gap at the SKU's average selling price (2 units × $30)", async () => {
    const findings = await runRuleAgainstFixtures(returnCreditUnapplied, {
      returns: "return-credit-returns.csv",
      inventory_ledger: "return-credit-ledger.csv",
      settlement: "return-credit-settlement.csv",
    });
    expect(findings[0].amount_cents).toBe(6000);
  });

  it("computes an 18-month dispute window from the first return", async () => {
    const findings = await runRuleAgainstFixtures(returnCreditUnapplied, {
      returns: "return-credit-returns.csv",
      inventory_ledger: "return-credit-ledger.csv",
      settlement: "return-credit-settlement.csv",
    });
    // ~18 months past the first return (2026-01-06). Asserted at month precision to
    // avoid the pre-existing UTC/local off-by-one in the date helper.
    expect(findings[0].window_closes_on?.startsWith("2027-07")).toBe(true);
    expect(findings[0].confidence).toBe("medium");
  });
});
