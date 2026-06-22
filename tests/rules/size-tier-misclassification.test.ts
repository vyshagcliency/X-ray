import { describe, it, expect } from "vitest";
import { runRuleAgainstFixtures } from "../helpers";
import { sizeTierMisclassification } from "@/lib/rules/size-tier-misclassification";

describe("size_tier_misclassification", () => {
  it("flags SKUs Amazon placed in a costlier tier than their dimensions warrant", async () => {
    const findings = await runRuleAgainstFixtures(sizeTierMisclassification, {
      fba_fee_preview: "size-tier-fee-preview.csv",
      settlement: "size-tier-settlement.csv",
    });

    // SZ-OK is correctly tiered → no finding.
    // SZ-BAD1: Small Standard dims charged as Large Standard ($2.00/unit × 50).
    // SZ-BAD2: Large Standard dims charged as Large Bulky ($4.00/unit × 30).
    expect(findings.length).toBe(2);
    expect(
      findings.every((f) => f.rule_id === "size_tier_misclassification"),
    ).toBe(true);

    const bySku = Object.fromEntries(
      findings.map((f) => [String(f.evidence.sku), f]),
    );
    expect(bySku["SZ-OK"]).toBeUndefined();
    expect(bySku["SZ-BAD1"].amount_cents).toBe(10000);
    expect(bySku["SZ-BAD2"].amount_cents).toBe(12000);
  });

  it("derives the correct tier from dimensions, not Amazon's label", async () => {
    const findings = await runRuleAgainstFixtures(sizeTierMisclassification, {
      fba_fee_preview: "size-tier-fee-preview.csv",
      settlement: "size-tier-settlement.csv",
    });
    const bad1 = findings.find((f) => f.evidence.sku === "SZ-BAD1");
    expect(bad1?.evidence.amazon_tier).toBe("Large Standard");
    expect(bad1?.evidence.correct_tier).toBe("Small Standard");
    expect(bad1?.evidence.per_unit_overcharge_cents).toBe(200);
  });

  it("rates a large per-unit overcharge as high confidence", async () => {
    const findings = await runRuleAgainstFixtures(sizeTierMisclassification, {
      fba_fee_preview: "size-tier-fee-preview.csv",
      settlement: "size-tier-settlement.csv",
    });
    // SZ-BAD1 $2.00/unit → medium; SZ-BAD2 $4.00/unit → high.
    const bySku = Object.fromEntries(
      findings.map((f) => [String(f.evidence.sku), f]),
    );
    expect(bySku["SZ-BAD1"].confidence).toBe("medium");
    expect(bySku["SZ-BAD2"].confidence).toBe("high");
  });
});
