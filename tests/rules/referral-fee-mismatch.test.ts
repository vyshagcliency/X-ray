import { describe, it, expect } from "vitest";
import { runRuleAgainstFixtures } from "../helpers";
import { referralFeeMismatch } from "@/lib/rules/referral-fee-mismatch";

describe("referral_fee_mismatch", () => {
  it("flags orders charged a higher referral % than the SKU's category should pay", async () => {
    const findings = await runRuleAgainstFixtures(referralFeeMismatch, {
      settlement: "referral-settlement.csv",
      fba_fee_preview: "referral-fee-preview.csv",
    });

    // TOY-002: $50 charged $11 (22%) vs Toys flat 15% → $3.50 over.
    // APP-001: $20 charged $3.40 vs Clothing 3-tier (5%≤$15 + 10% $15-20 = $1.25) → $2.15 over.
    // PC-001:  $100 charged $15 (15%) vs Personal Computers 6% → $9.00 over.
    // TOY-001 is charged exactly 15% → no finding.
    expect(findings.length).toBe(3);
    expect(findings.every((f) => f.rule_id === "referral_fee_mismatch")).toBe(true);

    const bySku = Object.fromEntries(
      findings.map((f) => [String(f.evidence.sku), f]),
    );
    expect(bySku["TOY-001"]).toBeUndefined();
    expect(bySku["TOY-002"].amount_cents).toBe(350);
    expect(bySku["APP-001"].amount_cents).toBe(215);
    expect(bySku["PC-001"].amount_cents).toBe(900);
  });

  it("computes the recoverable overcharge from SQL, not the $15 default", async () => {
    const findings = await runRuleAgainstFixtures(referralFeeMismatch, {
      settlement: "referral-settlement.csv",
      fba_fee_preview: "referral-fee-preview.csv",
    });
    const total = findings.reduce((s, f) => s + f.amount_cents, 0);
    expect(total).toBe(1465);
    expect(findings.every((f) => f.amount_cents !== 1500)).toBe(true);
  });

  it("rates large category gaps as high confidence", async () => {
    const findings = await runRuleAgainstFixtures(referralFeeMismatch, {
      settlement: "referral-settlement.csv",
      fba_fee_preview: "referral-fee-preview.csv",
    });
    expect(findings.every((f) => f.confidence === "high")).toBe(true);
  });
});
