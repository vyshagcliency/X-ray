import { describe, it, expect } from "vitest";
import { runRuleAgainstFixtures } from "../helpers";
import { agedSurchargeOnSold } from "@/lib/rules/aged-surcharge-on-sold";

describe("aged_surcharge_on_sold", () => {
  it("flags aged surcharges on SKUs that were actively selling, not genuinely dead stock", async () => {
    const findings = await runRuleAgainstFixtures(agedSurchargeOnSold, {
      storage_fees: "aged-surcharge-storage.csv",
      inventory_ledger: "aged-surcharge-ledger.csv",
    });

    // AGE-SOLD sold 55 units in the prior 90 days → suspicious surcharge.
    // AGE-DEAD's only sale was 9 months earlier → genuinely aged, no finding.
    expect(findings.length).toBe(1);
    const f = findings[0];
    expect(f.rule_id).toBe("aged_surcharge_on_sold");
    expect(f.evidence.sku).toBe("AGE-SOLD");
    expect(Number(f.evidence.units_sold_prior_90d)).toBe(55);
  });

  it("recovers the full surcharge amount ($38.00)", async () => {
    const findings = await runRuleAgainstFixtures(agedSurchargeOnSold, {
      storage_fees: "aged-surcharge-storage.csv",
      inventory_ledger: "aged-surcharge-ledger.csv",
    });
    expect(findings[0].amount_cents).toBe(3800);
  });

  it("rates a SKU that outsold its surcharged qty as medium confidence", async () => {
    const findings = await runRuleAgainstFixtures(agedSurchargeOnSold, {
      storage_fees: "aged-surcharge-storage.csv",
      inventory_ledger: "aged-surcharge-ledger.csv",
    });
    expect(findings[0].confidence).toBe("medium");
  });
});
