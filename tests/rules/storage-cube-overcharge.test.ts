import { describe, it, expect } from "vitest";
import { runRuleAgainstFixtures } from "../helpers";
import { storageCubeOvercharge } from "@/lib/rules/storage-cube-overcharge";

describe("storage_cube_overcharge", () => {
  it("flags a SKU billed on an inflated cube vs its measured dimensions", async () => {
    const findings = await runRuleAgainstFixtures(storageCubeOvercharge, {
      monthly_storage: "storage-cube-monthly-storage.csv",
      fba_fee_preview: "storage-cube-fee-preview.csv",
    });

    // Both SKUs measure 12×12×12 = 1728 cu in = 1.0 cu ft. ST-OK's billed item-volume is
    // 1.0 (accurate) → not flagged (within tolerance). ST-BAD's billed item-volume is 1.6
    // (60% inflated) → flagged; the overcharge is the inflated share of the billed fee:
    // $124.80 × (1.6 − 1.0)/1.6 = $46.80.
    expect(findings.length).toBe(1);
    expect(findings[0].evidence.sku).toBe("ST-BAD");
    expect(findings[0].amount_cents).toBe(4680);
    expect(Number(findings[0].evidence.measured_cuft)).toBeCloseTo(1.0, 3);
    expect(Number(findings[0].evidence.billed_cuft)).toBeCloseTo(1.6, 3);
    expect(findings[0].rule_id).toBe("storage_cube_overcharge");
  });

  it("leans review (low) confidence — unit vs packaged dims is a real exception", async () => {
    const findings = await runRuleAgainstFixtures(storageCubeOvercharge, {
      monthly_storage: "storage-cube-monthly-storage.csv",
      fba_fee_preview: "storage-cube-fee-preview.csv",
    });
    expect(findings[0].confidence).toBe("low");
  });

  it("emits a real dispute window from the month of charge", async () => {
    const findings = await runRuleAgainstFixtures(storageCubeOvercharge, {
      monthly_storage: "storage-cube-monthly-storage.csv",
      fba_fee_preview: "storage-cube-fee-preview.csv",
    });
    expect(findings[0].window_closes_on).toBe("2026-06-30"); // 2026-04-01 + 90d
  });
});
