import { describe, it, expect } from "vitest";
import { runRuleAgainstFixtures } from "../helpers";
import { dealFeeDoubleBooked } from "@/lib/rules/deal-fee-double-booked";

describe("deal_fee_double_booked", () => {
  it("flags two deal fees on the same SKU in the same window, not a single fee", async () => {
    const findings = await runRuleAgainstFixtures(dealFeeDoubleBooked, {
      settlement: "deal-settlement.csv",
    });

    // DL-OK: one deal fee → legitimate, not flagged.
    // DL-BAD: two $150 fees on 2025-06-15 → double-booked, excess = one $150 fee.
    // DL-DIFF: two fees but on different dates (different windows) → not flagged.
    expect(findings.length).toBe(1);
    expect(findings[0].evidence.sku).toBe("DL-BAD");
    expect(Number(findings[0].evidence.fee_count)).toBe(2);
    expect(findings[0].amount_cents).toBe(15000);
    expect(findings[0].rule_id).toBe("deal_fee_double_booked");
    expect(findings[0].confidence).toBe("high");
  });

  it("emits a real 90-day dispute window from the deal date", async () => {
    const findings = await runRuleAgainstFixtures(dealFeeDoubleBooked, {
      settlement: "deal-settlement.csv",
    });
    expect(findings[0].window_closes_on).toBe("2025-09-13"); // 2025-06-15 + 90d
  });
});
