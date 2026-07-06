import { describe, it, expect } from "vitest";
import { runRuleAgainstFixtures } from "../helpers";
import { lowPriceFba } from "@/lib/rules/low-price-fba";

describe("low_price_fba", () => {
  it("flags a sub-$10 SKU billed the full (undiscounted) fulfillment fee", async () => {
    const findings = await runRuleAgainstFixtures(lowPriceFba, {
      settlement: "low-price-settlement.csv",
      fba_fee_preview: "low-price-fee-preview.csv",
    });

    // Peer baseline (≥$10 SKUs in Small Standard) = $3.06/unit. A correctly-discounted
    // sub-$10 SKU should pay ~$0.86 less ($2.20). LP-CHEAP1 pays the full $3.06 → discount
    // missed; LP-CHEAP2 pays $2.20 → correctly discounted, not flagged. The ≥$10 peers are
    // the baseline and never flag themselves.
    expect(findings.length).toBe(1);
    expect(findings.every((f) => f.rule_id === "low_price_fba")).toBe(true);

    const f = findings[0];
    expect(f.evidence.sku).toBe("LP-CHEAP1");
    // Missed discount recovered = $0.86/unit × 10 units.
    expect(f.evidence.per_unit_overcharge_cents).toBe(86);
    expect(f.amount_cents).toBe(860);
    expect(Number(f.evidence.avg_price_cents)).toBe(800);
    expect(Number(f.evidence.peer_fee_cents)).toBe(306);
  });

  it("computes the recoverable in SQL, not the $15 default", async () => {
    const findings = await runRuleAgainstFixtures(lowPriceFba, {
      settlement: "low-price-settlement.csv",
      fba_fee_preview: "low-price-fee-preview.csv",
    });
    expect(findings.every((f) => f.amount_cents !== 1500)).toBe(true);
  });

  it("rolls with no dispute deadline (window is null)", async () => {
    const findings = await runRuleAgainstFixtures(lowPriceFba, {
      settlement: "low-price-settlement.csv",
      fba_fee_preview: "low-price-fee-preview.csv",
    });
    expect(findings[0].window_closes_on).toBeNull();
  });
});
