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

  // P3.1 — 2026 dimensional-weight modeling. Amazon bills on max(actual, dim) weight,
  // dim = ceil(L×W×H/139) lb, EXCEPT items <12oz / >150lb (billed on actual only).
  // DW-LEGIT and DW-EXEMPT are physically identical (40×20×10, dim weight 928oz)
  // except for actual weight — the ONLY thing the exemption turns on.
  describe("dimensional weight (P3.1)", () => {
    it("does NOT flag a SKU whose higher tier is justified by dimensional weight (B1)", async () => {
      const findings = await runRuleAgainstFixtures(sizeTierMisclassification, {
        fba_fee_preview: "dim-weight-fee-preview.csv",
        settlement: "dim-weight-settlement.csv",
      });
      // DW-LEGIT: 40×20×10, actual 50oz (not exempt) → dim weight 928oz applies →
      // Extra-Large is CORRECT. The pre-dim-weight rule would have flagged it (actual
      // weight alone puts it in Large Bulky); modeling dim weight suppresses the false
      // positive. DW-LB-OK is correctly tiered → also no finding.
      const bySku = Object.fromEntries(
        findings.map((f) => [String(f.evidence.sku), f]),
      );
      expect(bySku["DW-LEGIT"]).toBeUndefined();
      expect(bySku["DW-LB-OK"]).toBeUndefined();
    });

    it("flags a sub-12oz item billed into a dim-weight-inflated tier as high confidence (B2)", async () => {
      const findings = await runRuleAgainstFixtures(sizeTierMisclassification, {
        fba_fee_preview: "dim-weight-fee-preview.csv",
        settlement: "dim-weight-settlement.csv",
      });
      // DW-EXEMPT: same 40×20×10 box, actual 8oz (<12oz → EXEMPT from dim weight).
      // Amazon billed Extra-Large as if dim weight (928oz) applied — but sub-12oz items
      // are billed on actual weight only, so the correct tier is Large Bulky. Unambiguous
      // overcharge → high confidence, no cubiscan judgement call.
      expect(findings.length).toBe(1);
      const f = findings[0];
      expect(f.evidence.sku).toBe("DW-EXEMPT");
      expect(f.evidence.amazon_tier).toBe("Extra-Large");
      expect(f.evidence.correct_tier).toBe("Large Bulky");
      expect(f.evidence.exemption_violation).toBe(true);
      // Actual 8oz preserved; dim weight surfaced for the dossier.
      expect(Number(f.evidence.weight_oz)).toBe(8);
      expect(Number(f.evidence.dim_weight_oz)).toBe(928);
      // Correct fee = Large Bulky baseline $9.50 (DW-LB-OK self-calibrates it, else the
      // schedule) → per-unit $25.00 − $9.50 = $15.50 × 20 units.
      expect(f.evidence.per_unit_overcharge_cents).toBe(1550);
      expect(f.amount_cents).toBe(31000);
      expect(f.confidence).toBe("high");
    });
  });
});
