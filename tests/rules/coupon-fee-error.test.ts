import { describe, it, expect } from "vitest";
import { runRuleAgainstFixtures } from "../helpers";
import { couponFeeError } from "@/lib/rules/coupon-fee-error";

describe("coupon_fee_error", () => {
  it("flags a coupon redemption fee with no matching promotion discount", async () => {
    const findings = await runRuleAgainstFixtures(couponFeeError, {
      settlement: "coupon-settlement.csv",
    });

    // CP-OK has both a fee and an ItemPromotionDiscount → legitimate, not flagged.
    // CP-BAD has the $0.60 fee but no discount → the error.
    // CP-NONE has no coupon fee at all → not flagged.
    expect(findings.length).toBe(1);
    expect(findings[0].evidence.sku).toBe("CP-BAD");
    expect(findings[0].amount_cents).toBe(60);
    expect(findings[0].rule_id).toBe("coupon_fee_error");
    expect(findings[0].confidence).toBe("high");
  });

  it("emits a real 90-day dispute window from the charge date", async () => {
    const findings = await runRuleAgainstFixtures(couponFeeError, {
      settlement: "coupon-settlement.csv",
    });
    expect(findings[0].window_closes_on).toBe("2025-08-30"); // 2025-06-01 + 90d
  });
});
