import { describe, it, expect } from "vitest";
import {
  buildReportData,
  assertReportDataConsistent,
} from "@/lib/pdf/data-builder";
import { generateNarrative } from "@/lib/llm/narrate";

/**
 * P0.2 (D2): report_data is the single computed summary, derived from the complete
 * inserted finding set. Every displayed number must reconcile: category totals sum
 * to the headline, confidence buckets sum to findings_count, recurring is one number.
 */
type BuilderFinding = Parameters<typeof buildReportData>[1][number];

function finding(
  category: string,
  amount_cents: number,
  confidence: "high" | "medium" | "low",
  sku: string,
  extra: Record<string, unknown> = {},
): BuilderFinding {
  return {
    id: `${category}-${sku}`,
    rule_id: `${category}_rule`,
    category,
    amount_cents,
    confidence,
    window_closes_on: null,
    window_days_remaining: null,
    evidence: { sku, ...extra },
  };
}

// Complete finding set (what actually got inserted, uncapped).
const FINDINGS: BuilderFinding[] = [
  finding("referral_fee", 1000, "high", "A"),
  finding("referral_fee", 2000, "high", "B"),
  finding("fba_dimension", 3000, "high", "C"),
  finding("return_credit", 5000, "medium", "D"),
  finding("returns", 1500, "low", "E"), // reimbursement add-on
];

const narrative = generateNarrative({
  brand_name: "Test",
  total_recoverable_cents: 12500,
  urgent_recoverable_cents: 0,
  findings_count: FINDINGS.length,
  settlement_months: 12,
  categories: [],
});

function build() {
  return buildReportData("Test Brand", FINDINGS, narrative, 12);
}

describe("buildReportData (P0.2 — single source of truth)", () => {
  it("headline equals the sum of category totals", () => {
    const r = build();
    expect(r.total_recoverable_cents).toBe(12500);
    const catSum = r.categories.reduce((s, c) => s + c.total_cents, 0);
    expect(catSum).toBe(r.total_recoverable_cents);
  });

  it("confidence buckets sum to findings_count", () => {
    const r = build();
    expect(r.findings_count).toBe(5);
    expect(r.confidence.high + r.confidence.medium + r.confidence.low).toBe(5);
    expect(r.confidence).toEqual({ high: 3, medium: 1, low: 1 });
  });

  it("per-category counts and confidence sum to the totals", () => {
    const r = build();
    const countSum = r.categories.reduce((s, c) => s + c.count, 0);
    expect(countSum).toBe(r.findings_count);
    const perCatConf = r.categories.reduce(
      (s, c) => s + c.high + c.medium + c.low,
      0,
    );
    expect(perCatConf).toBe(r.findings_count);
  });

  it("splits recurring vs one-time from one definition (ROLLING_CATEGORIES)", () => {
    const r = build();
    // referral_fee (3000) + fba_dimension (3000) are rolling.
    expect(r.recurring_cents).toBe(6000);
    expect(r.one_time_cents).toBe(6500);
    expect(r.recurring_cents + r.one_time_cents).toBe(r.total_recoverable_cents);
    expect(r.recurring_monthly_cents).toBe(500); // 6000 / 12 months
  });

  it("orders by confidence×punch: high-confidence wedge first, soft giant demoted, estimated last (P1.3)", () => {
    const r = build();
    const keys = r.categories.map((c) => c.category);
    // referral_fee (3000 high) and fba_dimension (3000 high) lead on high-confidence
    // dollars; the all-medium return_credit (5000) is demoted below them despite its
    // bigger total — this inverts the old "$ desc" ordering (D4).
    expect(keys.slice(0, 2).sort()).toEqual(["fba_dimension", "referral_fee"]);
    expect(keys[2]).toBe("return_credit"); // all-medium, $ bigger but not sharp
    expect(keys[keys.length - 1]).toBe("returns"); // estimated add-on, always last
  });

  it("counts distinct SKUs affected across all findings", () => {
    const r = build();
    expect(r.skus_affected).toBe(5);
  });

  it("generates a dispute draft for every top case", () => {
    const r = build();
    expect(r.top_cases).toHaveLength(5);
    expect(r.top_cases[0].amount_cents).toBe(5000); // sorted $ desc
    expect(r.top_cases.every((c) => c.dispute_draft !== null)).toBe(true);
  });

  it("passes its own consistency invariant", () => {
    expect(() => build()).not.toThrow();
  });
});

describe("estimated tier fencing (P0.3 — D3)", () => {
  it("splits provable (real per-row $) from estimated (flat-$15 reimbursement) buckets", () => {
    const r = build();
    // returns (1500) is the only estimated bucket here; the rest are provable.
    expect(r.estimated_cents).toBe(1500);
    expect(r.provable_cents).toBe(11000);
    expect(r.provable_cents + r.estimated_cents).toBe(r.total_recoverable_cents);
  });

  it("flags estimated categories so the page can fence them below the fold", () => {
    const r = build();
    const returns = r.categories.find((c) => c.category === "returns");
    const referral = r.categories.find((c) => c.category === "referral_fee");
    expect(returns?.estimated).toBe(true);
    expect(referral?.estimated).toBe(false);
  });

  it("computes the provable one-time figure the hero shows (provable − recurring)", () => {
    const r = build();
    // provable 11000 − recurring 6000 = 5000 (return_credit), estimated excluded.
    expect(r.provable_one_time_cents).toBe(5000);
  });
});

describe("provable urgency (P0.4 — D5)", () => {
  it("excludes the fenced estimated tier from the hero's urgent figure", () => {
    const provableUrgent = finding("return_credit", 1000, "medium", "P");
    provableUrgent.window_days_remaining = 5;
    provableUrgent.window_closes_on = "2027-01-01";
    const estimatedUrgent = finding("returns", 1500, "low", "E");
    estimatedUrgent.window_days_remaining = 3;
    estimatedUrgent.window_closes_on = "2027-01-01";

    const r = buildReportData("T", [provableUrgent, estimatedUrgent], narrative, 12);
    expect(r.urgent_recoverable_cents).toBe(2500); // both are within 14 days
    expect(r.provable_urgent_cents).toBe(1000); // but the hero counts provable only
  });
});

describe("provable-forward hero (P1.1)", () => {
  it("heroes the HIGH-confidence rolling overcharge as a monthly run-rate", () => {
    // referral_fee 1000+2000 high, fba_dimension 3000 high → 6000 high rolling / 12 mo.
    const r = build();
    expect(r.provable_forward_cents).toBe(6000);
    expect(r.provable_forward_monthly_cents).toBe(500);
  });

  it("excludes medium-confidence rolling findings from the hero (undeniable-only)", () => {
    const set: BuilderFinding[] = [
      finding("referral_fee", 1900, "high", "A"), // provable-forward
      finding("fba_dimension", 500, "medium", "B"), // rolling but NOT high → excluded
    ];
    const r = buildReportData("T", set, narrative, 10);
    expect(r.recurring_cents).toBe(2400); // both are rolling
    expect(r.provable_forward_cents).toBe(1900); // only the high-confidence one
    expect(r.provable_forward_monthly_cents).toBe(190); // 1900 / 10 months
  });

  it("returns a null monthly rate when the settlement window is unknown", () => {
    const r = buildReportData("T", FINDINGS, narrative, null);
    expect(r.provable_forward_monthly_cents).toBeNull();
  });
});

describe("spotlight — the sharpest finding (P1.2)", () => {
  it("selects the largest high-confidence wedge finding", () => {
    const r = build();
    // High rolling: referral 1000/2000, fba_dimension 3000 → biggest is fba_dimension.
    expect(r.spotlight).not.toBeNull();
    expect(r.spotlight?.category).toBe("fba_dimension");
    expect(r.spotlight?.amount_cents).toBe(3000);
    expect(r.spotlight?.sku).toBe("C");
    expect(r.spotlight?.confidence).toBe("high");
  });

  it("prefers a wedge finding over a bigger non-wedge one", () => {
    const set: BuilderFinding[] = [
      finding("return_credit", 9000, "high", "BIG"), // bigger, but not a rolling wedge
      finding("referral_fee", 2000, "high", "SHARP"), // the wedge
    ];
    const r = buildReportData("T", set, narrative, 12);
    expect(r.spotlight?.category).toBe("referral_fee");
    expect(r.spotlight?.sku).toBe("SHARP");
  });

  it("is null when there are no findings", () => {
    const r = buildReportData("T", [], narrative, 12);
    expect(r.spotlight).toBeNull();
  });
});

describe("chart aggregates: confidence×dollars + urgency (P1.6)", () => {
  it("sums provable dollars by confidence (excludes the estimated tier)", () => {
    const r = build();
    // provable: referral 3000 high, fba_dimension 3000 high, return_credit 5000 medium.
    expect(r.provable_confidence_cents).toEqual({ high: 6000, medium: 5000, low: 0 });
    const s =
      r.provable_confidence_cents.high +
      r.provable_confidence_cents.medium +
      r.provable_confidence_cents.low;
    expect(s).toBe(r.provable_cents);
  });

  it("buckets provable windowed findings by days-to-close, estimated tier excluded", () => {
    const soon = finding("return_credit", 4000, "high", "S"); // provable, ≤7d
    soon.window_days_remaining = 3;
    soon.window_closes_on = "2027-01-01";
    const later = finding("aged_surcharge", 2000, "medium", "L"); // provable, 15–30d
    later.window_days_remaining = 20;
    later.window_closes_on = "2027-02-01";
    const estimated = finding("returns", 1500, "low", "E"); // estimated → excluded
    estimated.window_days_remaining = 5;
    estimated.window_closes_on = "2027-01-01";
    const rolling = finding("referral_fee", 3000, "high", "R"); // no window → excluded

    const r = buildReportData("T", [soon, later, estimated, rolling], narrative, 12);
    const byLabel = Object.fromEntries(
      r.urgency_buckets.map((b) => [b.label, b]),
    );
    expect(byLabel["≤ 7 days"]?.cents).toBe(4000);
    expect(byLabel["≤ 7 days"]?.count).toBe(1);
    expect(byLabel["15–30 days"]?.cents).toBe(2000);
    // No bucket contains the estimated or the windowless rolling finding.
    const bucketTotal = r.urgency_buckets.reduce((s, b) => s + b.cents, 0);
    expect(bucketTotal).toBe(6000);
  });
});

describe("per-category high-confidence dollars (P1.3 ordering key)", () => {
  it("carries high_cents so the page/PDF can rank by confidence×punch", () => {
    const r = build();
    const referral = r.categories.find((c) => c.category === "referral_fee");
    const returns = r.categories.find((c) => c.category === "return_credit");
    expect(referral?.high_cents).toBe(3000); // both referral findings are high
    expect(returns?.high_cents).toBe(0); // all-medium
  });
});

describe("assertReportDataConsistent", () => {
  it("throws when category totals do not sum to the headline", () => {
    const good = build();
    const broken = {
      ...good,
      total_recoverable_cents: good.total_recoverable_cents + 1,
    };
    expect(() => assertReportDataConsistent(broken)).toThrow();
  });

  it("throws when confidence buckets do not sum to findings_count", () => {
    const good = build();
    const broken = {
      ...good,
      confidence: { ...good.confidence, high: good.confidence.high + 1 },
    };
    expect(() => assertReportDataConsistent(broken)).toThrow();
  });
});
