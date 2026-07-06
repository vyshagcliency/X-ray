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

  it("maps legacy product-group codes (ce → Consumer Electronics 8%) and is conservative on unknown groups", async () => {
    const findings = await runRuleAgainstFixtures(referralFeeMismatch, {
      settlement: "referral-code-settlement.csv",
      fba_fee_preview: "referral-code-preview.csv",
    });

    // CE-001: product-group "ce" → Consumer Electronics 8%. Charged 15% on $100 →
    // expected $8, overcharge $7.00.
    // MYST-001: unknown group → falls back to Everything Else 15% → charged exactly
    // 15% → no finding (conservative; never falsely flags an unmapped group).
    expect(findings.length).toBe(1);
    expect(findings[0].evidence.sku).toBe("CE-001");
    expect(findings[0].amount_cents).toBe(700);
  });

  it("caps sub-15% category mappings at review unless corroborated (P3.5 asymmetric safety)", async () => {
    const findings = await runRuleAgainstFixtures(referralFeeMismatch, {
      settlement: "referral-settlement.csv",
      fba_fee_preview: "referral-fee-preview.csv",
    });
    const bySku = Object.fromEntries(
      findings.map((f) => [String(f.evidence.sku), f]),
    );
    // TOY-002 is billed above the standard 15% Toys rate — an unambiguous overcharge that
    // doesn't rest on a sub-15% mapping → high.
    expect(bySku["TOY-002"].confidence).toBe("high");
    // PC-001 (Personal Computers 6%) and APP-001 (tiered Clothing ~6%) rest on sub-15% (▼)
    // mappings with no peer cluster to corroborate them → capped at review (low), never
    // headline. A wrong sub-15% mapping is the catastrophic false-positive class (D9).
    expect(bySku["PC-001"].confidence).toBe("low");
    expect(bySku["APP-001"].confidence).toBe("low");
  });

  // P3.5 — the false-positive guard on a heterogeneous, code-form product-group (the
  // Halcyon-class problem, distilled). All 9 SKUs carry product-group "ce": 4 accessories
  // that legitimately bill 15%, 4 devices that correctly bill 8%, and one device whose
  // rate JUMPED 8%→15% mid-history. The map alone (ce→8%) would fabricate 4 overcharges on
  // the accessories; the guard must suppress them and flag only the real, jumped device.
  describe("false-positive guard (P3.5 — D9)", () => {
    it("suppresses a legit 15% accessory cluster and flags only the jumped device", async () => {
      const findings = await runRuleAgainstFixtures(referralFeeMismatch, {
        settlement: "referral-guard-settlement.csv",
        fba_fee_preview: "referral-guard-preview.csv",
      });

      // Signal B: the 4 accessories form a substantial 15% peer cluster → suppressed.
      // Without the guard each would be a false 7% overcharge (15% billed vs ce→8% mapped).
      expect(findings.some((f) => String(f.evidence.sku).startsWith("ACC"))).toBe(false);
      // The 4 correctly-billed 8% devices produce no overcharge at all.
      expect(
        findings.some((f) => /^DEV-\d$/.test(String(f.evidence.sku))),
      ).toBe(false);

      // Signal A: DEV-BAD's within-SKU rate jump (8%→15%) is flagged high-confidence,
      // regardless of the accessory noise — no category certainty needed.
      const bad = findings.filter((f) => f.evidence.sku === "DEV-BAD");
      expect(bad.length).toBe(1);
      expect(bad[0].confidence).toBe("high");
      expect(bad[0].evidence.temporal_jump).toBe(true);
      expect(bad[0].amount_cents).toBe(700); // 15% − 8% on the $100 late order

      // Every surviving finding was reached by translating the "ce" code through the map.
      expect(
        findings.every((f) => f.evidence.product_group === "Consumer Electronics"),
      ).toBe(true);
    });
  });
});
