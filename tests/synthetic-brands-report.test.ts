import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { RULES } from "@/lib/rules";
import { runRuleAgainstFixtures } from "./helpers";
import {
  buildReportData,
  assertReportDataConsistent,
} from "@/lib/pdf/data-builder";
import { getSettlementMonths } from "@/lib/duckdb/settlement-window";
import { generateNarrative } from "@/lib/llm/narrate";

/**
 * P5.1 exit gate, encoded: run the whole rule set + report build across ALL synthetic
 * brand profiles (not just Halcyon), in code-form product-groups (post-P0.6), and prove
 * the report is defensible on every profile:
 *   (a) no evidence value leaks as a raw object / bigint (the "[object Object]" class);
 *   (b) every number reconciles (single-source invariant);
 *   (c) the hierarchy is sane (a high-confidence wedge leads and spotlights; the flat-$15
 *       estimated tier is fenced below the provable tier).
 *
 * The four generator profiles vary the wedge: NovaPeak/LuxeNest are flat-15% categories
 * (Sports / Home), PureGlow is an 8%≤$10 / 15% split (Beauty), Halcyon is flat-8%
 * (Consumer Electronics). Halcyon's DEEP, profile-specific assertions (exact spotlight SKU,
 * referral medium tier, code-form map translation) live in `halcyon-report.test.ts`; this
 * file asserts only the invariants that must hold on EVERY profile.
 *
 * Dollar MAGNITUDES are deliberately not asserted — they are generator artifacts (§1.5 /
 * P5.2), not a success metric. Detection *correctness* against real Amazon formats stays on
 * the real-data asterisk list (`real-data-asterisks.md`, P5.3).
 */

const SMOKE_DIR = "smoke";
const REPORT_FILES: Record<string, string> = {
  returns: "returns.csv",
  reimbursements: "reimbursements.csv",
  inventory_ledger: "inventory-ledger.csv",
  settlement: "settlement.csv",
  fba_fee_preview: "fba-fee-preview.csv",
  storage_fees: "storage-fees.csv",
  monthly_storage: "monthly-storage.csv",
};

const BRANDS = [
  { name: "NovaPeak Outdoor", dir: "novapeak-outdoor" }, // Sports & Outdoors — flat 15%
  { name: "LuxeNest Home", dir: "luxenest-home" }, // Home & Kitchen — flat 15%
  { name: "PureGlow Beauty", dir: "pureglow-beauty" }, // Beauty — 8%≤$10 / 15% split
  { name: "Halcyon Audio", dir: "halcyon-audio" }, // Consumer Electronics — flat 8%
];

interface BuiltFinding {
  rule_id: string;
  category: string;
  amount_cents: number;
  confidence: "high" | "medium" | "low";
  window_closes_on: string | null;
  window_days_remaining: number | null;
  evidence: Record<string, unknown>;
}

async function buildBrandReport(brandName: string, brandDir: string) {
  const all: BuiltFinding[] = [];
  const now = Date.now();

  for (const rule of RULES) {
    const fixtures: Record<string, string> = {};
    let runnable = true;
    for (const r of rule.requiredReports) {
      const file = REPORT_FILES[r];
      const abs = path.resolve(__dirname, SMOKE_DIR, brandDir, file ?? "");
      if (!file || !fs.existsSync(abs)) runnable = false;
      fixtures[r] = `../${SMOKE_DIR}/${brandDir}/${file}`;
    }
    if (!runnable) continue;

    const findings = await runRuleAgainstFixtures(rule, fixtures);
    for (const f of findings) {
      const wd = f.window_closes_on
        ? Math.ceil((new Date(f.window_closes_on).getTime() - now) / 86_400_000)
        : null;
      all.push({
        rule_id: f.rule_id,
        category: f.category,
        amount_cents: f.amount_cents,
        confidence: f.confidence,
        window_closes_on: f.window_closes_on,
        window_days_remaining: wd,
        evidence: f.evidence,
      });
    }
  }

  const months = await getSettlementMonths(
    path.resolve(__dirname, SMOKE_DIR, brandDir, "settlement.csv"),
  );

  const narrative = generateNarrative({
    brand_name: brandName,
    total_recoverable_cents: all.reduce((s, f) => s + f.amount_cents, 0),
    urgent_recoverable_cents: 0,
    findings_count: all.length,
    settlement_months: months ?? 0,
    categories: [],
  });

  return { all, months, report: buildReportData(brandName, all, narrative, months) };
}

describe("synthetic brands report (P5.1 — defensible across every profile)", () => {
  for (const brand of BRANDS) {
    describe(brand.name, () => {
      it("leaks no raw object or bigint into any finding's evidence (D1/D7)", async () => {
        const { all, report } = await buildBrandReport(brand.name, brand.dir);

        expect(all.length).toBeGreaterThan(0);
        for (const f of all) {
          for (const [key, value] of Object.entries(f.evidence)) {
            expect(
              typeof value,
              `evidence.${key} on ${f.rule_id} is a bigint`,
            ).not.toBe("bigint");
            if (value !== null && typeof value === "object") {
              throw new Error(
                `evidence.${key} on ${f.rule_id} is a raw object (${value.constructor?.name}) — would render [object Object]`,
              );
            }
          }
        }
        expect(JSON.stringify(report)).not.toContain("[object Object]");
      }, 90_000);

      it("builds report_data whose numbers all reconcile", async () => {
        const { report } = await buildBrandReport(brand.name, brand.dir);

        // The builder runs the invariant in non-prod; assert it explicitly too.
        expect(() => assertReportDataConsistent(report)).not.toThrow();

        const catTotal = report.categories.reduce((s, c) => s + c.total_cents, 0);
        expect(catTotal).toBe(report.total_recoverable_cents);

        const catCount = report.categories.reduce((s, c) => s + c.count, 0);
        expect(catCount).toBe(report.findings_count);

        expect(
          report.confidence.high + report.confidence.medium + report.confidence.low,
        ).toBe(report.findings_count);

        expect(report.recurring_cents + report.one_time_cents).toBe(
          report.total_recoverable_cents,
        );

        // Provable (real per-row $) + estimated (flat-$15) == total (D3).
        expect(report.provable_cents + report.estimated_cents).toBe(
          report.total_recoverable_cents,
        );
        expect(
          report.provable_confidence_cents.high +
            report.provable_confidence_cents.medium +
            report.provable_confidence_cents.low,
        ).toBe(report.provable_cents);
      }, 90_000);

      it("has a sane, defensible hierarchy (wedge leads, estimated fenced below)", async () => {
        const { report } = await buildBrandReport(brand.name, brand.dir);

        // Hero = a real, high-confidence forward run-rate (every synthetic brand has a
        // dated settlement, so months is known and the monthly number exists).
        expect(report.provable_forward_monthly_cents).not.toBeNull();
        expect(report.provable_forward_monthly_cents!).toBeGreaterThan(0);

        // The single sharpest finding is a HIGH-confidence wedge (referral / size-tier) —
        // never the all-medium soft giant (inverts D4).
        expect(report.spotlight).not.toBeNull();
        expect(["referral_fee", "fba_dimension"]).toContain(
          report.spotlight!.category,
        );
        expect(report.spotlight!.confidence).toBe("high");

        // Confidence×punch ordering: a PROVABLE wedge with high-confidence dollars leads,
        // not the estimated tier.
        expect(report.categories[0].estimated).toBe(false);
        expect(report.categories[0].high_cents).toBeGreaterThan(0);

        // The estimated (flat-$15) tier is fenced strictly BELOW the provable tier:
        // once an estimated category appears, no provable category follows it.
        const firstEstimated = report.categories.findIndex((c) => c.estimated);
        if (firstEstimated !== -1) {
          expect(
            report.categories
              .slice(firstEstimated)
              .every((c) => c.estimated),
          ).toBe(true);
        }

        // The referral wedge demonstrates HIGH confidence on every profile — the planted
        // rate-jump SKU (Signal A, P3.5) keeps the lead wedge from stalling all-medium.
        const referral = report.categories.find(
          (c) => c.category === "referral_fee",
        );
        expect(referral).toBeDefined();
        expect(referral!.high).toBeGreaterThan(0);
      }, 90_000);
    });
  }
});
