import { describe, it, expect } from "vitest";
import { deriveClosingSoon } from "@/components/report/urgent-cases";

const f = (over: Partial<Record<string, unknown>>) => ({
  id: "x",
  rule_id: "r",
  category: "referral_fee",
  amount_cents: 100,
  confidence: "high",
  window_days_remaining: 5,
  window_closes_on: null,
  narrative_summary: null,
  evidence: { sku: "HA-1" },
  ...over,
});

describe("deriveClosingSoon", () => {
  it("keeps only provable findings within the window, sorted by days then amount", () => {
    const rows = deriveClosingSoon(
      [
        f({ window_days_remaining: 10, amount_cents: 100, evidence: { sku: "A" } }),
        f({ window_days_remaining: 3, amount_cents: 200, evidence: { sku: "B" } }),
        f({ window_days_remaining: 3, amount_cents: 900, evidence: { sku: "C" } }),
        f({ window_days_remaining: 40, amount_cents: 500, evidence: { sku: "D" } }), // too far
        f({ window_days_remaining: -1, amount_cents: 500, evidence: { sku: "E" } }), // closed
        f({ category: "returns", window_days_remaining: 2, evidence: { sku: "F" } }), // estimated
      ],
      new Set(["returns"]),
      14,
    );
    expect(rows.map((r) => r.sku)).toEqual(["C", "B", "A"]);
    expect(rows[0]).toMatchObject({
      category: "referral_fee",
      amountCents: 900,
      daysRemaining: 3,
    });
  });
  it("returns [] when nothing qualifies", () => {
    expect(deriveClosingSoon([f({ window_days_remaining: null })], new Set(), 14)).toEqual([]);
  });
});
