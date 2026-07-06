import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { RULES } from "@/lib/rules";
import { referralFeeMismatch } from "@/lib/rules/referral-fee-mismatch";
import { runRuleAgainstFixtures } from "./helpers";
import {
  buildReportData,
  assertReportDataConsistent,
} from "@/lib/pdf/data-builder";
import { generateNarrative } from "@/lib/llm/narrate";

/**
 * P0.5 exit gate, encoded: run the whole rule set against the real Halcyon dataset,
 * build report_data exactly as the pipeline does, and prove (a) every number reconciles
 * (the single-source invariant) and (b) no evidence value leaks as a raw object or
 * bigint — the "[object Object]" / JSON-throw class (D1/D7). Production scale: ~8k
 * settlement rows, 42 SKUs, 19 months.
 */
const SMOKE_DIR = "../smoke/halcyon-audio";
const REPORT_FILES: Record<string, string> = {
  returns: "returns.csv",
  reimbursements: "reimbursements.csv",
  inventory_ledger: "inventory-ledger.csv",
  settlement: "settlement.csv",
  fba_fee_preview: "fba-fee-preview.csv",
  storage_fees: "storage-fees.csv",
  monthly_storage: "monthly-storage.csv",
};

interface BuiltFinding {
  rule_id: string;
  category: string;
  amount_cents: number;
  confidence: "high" | "medium" | "low";
  window_closes_on: string | null;
  window_days_remaining: number | null;
  evidence: Record<string, unknown>;
}

async function buildHalcyonReport() {
  const all: BuiltFinding[] = [];
  const now = Date.now();

  for (const rule of RULES) {
    const fixtures: Record<string, string> = {};
    let runnable = true;
    for (const r of rule.requiredReports) {
      const file = REPORT_FILES[r];
      const abs = path.resolve(__dirname, "smoke/halcyon-audio", file ?? "");
      if (!file || !fs.existsSync(abs)) runnable = false;
      fixtures[r] = `${SMOKE_DIR}/${file}`;
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

  const narrative = generateNarrative({
    brand_name: "Halcyon Audio",
    total_recoverable_cents: all.reduce((s, f) => s + f.amount_cents, 0),
    urgent_recoverable_cents: 0,
    findings_count: all.length,
    settlement_months: 19,
    categories: [],
  });

  return { all, report: buildReportData("Halcyon Audio", all, narrative, 19) };
}

describe("Halcyon report (P0.5 acceptance)", () => {
  it("builds report_data whose numbers all reconcile", async () => {
    const { report } = await buildHalcyonReport();

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

    // Provable (real per-row $) + estimated (flat-$15) == total; hero shows provable (D3).
    expect(report.provable_cents + report.estimated_cents).toBe(
      report.total_recoverable_cents,
    );

    // Phase 1: the hero is the high-confidence forward run-rate, and it reconciles —
    // provable-confidence dollars sum to provable_cents, and the sharpest finding is a
    // high-confidence wedge (referral / size-tier), not the all-medium soft giant (D4).
    expect(report.provable_forward_monthly_cents).not.toBeNull();
    expect(report.provable_forward_monthly_cents!).toBeGreaterThan(0);
    expect(
      report.provable_confidence_cents.high +
        report.provable_confidence_cents.medium +
        report.provable_confidence_cents.low,
    ).toBe(report.provable_cents);
    expect(report.spotlight).not.toBeNull();
    expect(["referral_fee", "fba_dimension"]).toContain(
      report.spotlight!.category,
    );
    expect(report.spotlight!.confidence).toBe("high");
    // The confidence×punch ordering leads with a high-confidence wedge, not the biggest $.
    expect(report.categories[0].high_cents).toBeGreaterThan(0);

    // Demo property (P3.5 / Signal A): a planted rate-jump SKU makes the referral wedge
    // demonstrate HIGH confidence — not stuck all-medium on steady-state overcharges. The
    // guard still keeps the medium findings medium (asymmetric safety), so both tiers show.
    const referral = report.categories.find((c) => c.category === "referral_fee");
    expect(referral).toBeDefined();
    expect(referral!.high).toBeGreaterThan(0);
    expect(referral!.medium).toBeGreaterThan(0);

    const fmt = (c: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(c / 100);
    console.log(
      `  Halcyon report_data: ${report.findings_count} findings · ${report.total_recoverable} total ` +
        `(${report.categories.length} categories) · confidence ${report.confidence.high}/${report.confidence.medium}/${report.confidence.low}`,
    );
    console.log(
      `    HERO (forward): ${report.provable_forward_monthly_cents ? fmt(report.provable_forward_monthly_cents) : "—"}/mo high-confidence · forward-cumulative ${fmt(report.provable_forward_cents)} · total surfaced ${report.total_recoverable} · provable ${fmt(report.provable_cents)}`,
    );
    console.log(
      `    SPOTLIGHT: ${report.spotlight?.display_name} · ${report.spotlight?.amount} · ${report.spotlight?.confidence} · sku ${report.spotlight?.sku}`,
    );
    console.log(
      `    CONFIDENCE×$: high ${fmt(report.provable_confidence_cents.high)} · medium ${fmt(report.provable_confidence_cents.medium)} · review ${fmt(report.provable_confidence_cents.low)}`,
    );
    console.log(
      `    URGENCY buckets: ${report.urgency_buckets.map((b) => `${b.label} ${fmt(b.cents)} (${b.count})`).join(" · ") || "none"}`,
    );
    console.log(
      `    FENCED estimated (needs confirmation): ${fmt(report.estimated_cents)}`,
    );
    for (const c of report.categories) {
      console.log(
        `    ${c.display_name}: ${c.count} · ${c.total} · ${c.high}/${c.medium}/${c.low}${c.recurring ? " · recurring" : ""}`,
      );
    }
  }, 60_000);

  it("leaks no raw object or bigint into any finding's evidence (D1/D7)", async () => {
    const { all, report } = await buildHalcyonReport();

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

    // The whole report serializes cleanly and contains no "[object Object]".
    const json = JSON.stringify(report);
    expect(json).not.toContain("[object Object]");
  }, 60_000);
});

/**
 * P0.6 (D6): the smoke data emits real product-group CODES, so the referral wedge must
 * fire *through* product-group-map.ts — not the identity/label path. Two failure modes
 * are guarded: (1) generator reverting to clean labels, (2) the map failing to translate.
 */
describe("referral wedge fires through the product-group map (P0.6 — D6)", () => {
  it("Halcyon fee-preview carries code-form product-groups, not identity labels", () => {
    const csv = fs.readFileSync(
      path.resolve(__dirname, "smoke/halcyon-audio/fba-fee-preview.csv"),
      "utf8",
    );
    const header = csv.split("\n")[0].split(",");
    const pgCol = header.indexOf("product-group");
    const firstValue = csv.split("\n")[1].split(",")[pgCol];
    expect(firstValue).toBe("ce"); // the Amazon code, not "Consumer Electronics"
  });

  it("detects overcharges only by translating the code through the map", async () => {
    const findings = await runRuleAgainstFixtures(referralFeeMismatch, {
      settlement: "../smoke/halcyon-audio/settlement.csv",
      fba_fee_preview: "../smoke/halcyon-audio/fba-fee-preview.csv",
    });
    // A broken map would leave every SKU at the 15% fallback → zero overcharges found.
    expect(findings.length).toBeGreaterThan(0);
    // Evidence carries the MAPPED category, proving "ce" was translated (not passed through).
    expect(findings.every((f) => f.evidence.product_group === "Consumer Electronics")).toBe(true);
    expect(findings.some((f) => f.evidence.product_group === "ce")).toBe(false);
  }, 30_000);
});
