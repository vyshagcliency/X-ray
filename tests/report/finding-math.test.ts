import { describe, it, expect } from "vitest";
import { financeMath } from "@/components/report/finding-math";

/**
 * P2.2 — "show the math." Each finding renders the computation, not just the result.
 * The result row must reconcile to the finding's amount_cents (the traceability promise:
 * the math the report shows is the same math that produced the headline dollar).
 */
describe("financeMath", () => {
  it("referral: revenue × rate, overcharge = charged − owed, reconciles to amount", () => {
    const { formula, rows } = financeMath(
      "referral_fee",
      {
        revenue_cents: 10000,
        actual_pct: 0.15,
        expected_pct: 0.08,
        referral_charged_cents: 1500,
        expected_fee_cents: 800,
      },
      700,
    );
    expect(formula).toMatch(/revenue/i);
    const labels = rows.map((r) => r.label);
    expect(labels[0]).toBe("Order revenue");
    expect(rows[0].value).toBe("$100.00");
    expect(labels[1]).toContain("15%");
    expect(rows[1].value).toBe("$15.00");
    expect(labels[2]).toContain("8%");
    expect(rows[2].value).toBe("$8.00");
    // The result line reconciles to amount_cents.
    const result = rows[rows.length - 1];
    expect(result.emphasis).toBe(true);
    expect(result.value).toBe("$7.00");
  });

  it("size-tier: per-unit difference × units, reconciles to amount", () => {
    const { rows } = financeMath(
      "fba_dimension",
      {
        actual_fee_cents: 800,
        correct_fee_cents: 400,
        per_unit_overcharge_cents: 400,
        units_sold: 229,
      },
      91600,
    );
    expect(rows[0]).toMatchObject({ label: "Charged / unit", value: "$8.00" });
    expect(rows[1]).toMatchObject({ label: "Correct / unit", value: "$4.00" });
    expect(rows[2].label).toContain("229");
    const result = rows[rows.length - 1];
    expect(result.emphasis).toBe(true);
    expect(result.value).toBe("$916.00");
  });

  it("return_credit: gap = returned − credited, result reconciles to amount", () => {
    const { rows } = financeMath(
      "return_credit",
      { returned_qty: 12, found_qty: 5, gap_qty: 7 },
      4200,
    );
    const labels = rows.map((r) => r.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/returned/i),
        expect.stringMatching(/credited/i),
        expect.stringMatching(/gap/i),
      ]),
    );
    const result = rows[rows.length - 1];
    expect(result.emphasis).toBe(true);
    expect(result.value).toBe("$42.00");
  });

  it("aged_surcharge: shows sold-in-90d and reconciles surcharge to amount", () => {
    const { rows } = financeMath(
      "aged_surcharge",
      { units_sold_prior_90d: 340, qty_charged: 20 },
      1250,
    );
    expect(rows.some((r) => r.label.match(/90/))).toBe(true);
    const result = rows[rows.length - 1];
    expect(result.emphasis).toBe(true);
    expect(result.value).toBe("$12.50");
  });

  it("estimated tier (returns/lost_inventory): honest flat-estimate single row", () => {
    for (const cat of ["returns", "lost_inventory"]) {
      const { formula, rows } = financeMath(cat, { sku: "X" }, 1500);
      expect(formula).toMatch(/estimat/i);
      expect(rows).toHaveLength(1);
      expect(rows[0].value).toBe("$15.00");
      expect(rows[0].emphasis).toBe(true);
    }
  });

  it("unknown category: falls back to a single reconciling amount row", () => {
    const { rows } = financeMath("something_new", {}, 999);
    expect(rows[rows.length - 1].value).toBe("$9.99");
    expect(rows[rows.length - 1].emphasis).toBe(true);
  });
});
