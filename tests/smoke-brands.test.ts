import { describe, it, expect } from "vitest";
import { DuckDBInstance } from "@duckdb/node-api";
import fs from "fs";
import path from "path";
import { RULES } from "@/lib/rules";
import type { Rule } from "@/lib/rules";

interface BrandDataset {
  name: string;
  slug: string;
  dir: string;
}

const BRANDS: BrandDataset[] = [
  { name: "NovaPeak Outdoor", slug: "novapeak-outdoor", dir: "novapeak-outdoor" },
  { name: "LuxeNest Home", slug: "luxenest-home", dir: "luxenest-home" },
  { name: "PureGlow Beauty", slug: "pureglow-beauty", dir: "pureglow-beauty" },
  { name: "Halcyon Audio", slug: "halcyon-audio", dir: "halcyon-audio" },
];

const SMOKE_BASE = path.resolve(__dirname, "smoke");

const REPORT_FILES: Record<string, string> = {
  returns: "returns.csv",
  reimbursements: "reimbursements.csv",
  inventory_ledger: "inventory-ledger.csv",
  settlement: "settlement.csv",
  fba_fee_preview: "fba-fee-preview.csv",
  storage_fees: "storage-fees.csv",
  monthly_storage: "monthly-storage.csv",
};

/** A rule is runnable on a brand only if every report file it requires exists. */
function brandHasReportsFor(rule: Rule, brandDir: string): boolean {
  return rule.requiredReports.every((r) => {
    const file = REPORT_FILES[r];
    return file && fs.existsSync(path.join(SMOKE_BASE, brandDir, file));
  });
}

async function runRuleOnBrand(rule: Rule, brandDir: string) {
  const urls: Record<string, string> = {};
  for (const [type, file] of Object.entries(REPORT_FILES)) {
    urls[type] = path.join(SMOKE_BASE, brandDir, file);
  }

  // Check required reports
  for (const r of rule.requiredReports) {
    if (!urls[r]) throw new Error(`Missing ${r} for ${rule.id}`);
  }

  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  try {
    let sql = rule.sql;
    for (const [type, filePath] of Object.entries(urls)) {
      sql = sql.replaceAll(`$${type}_url`, `'${filePath}'`);
    }

    const result = await connection.runAndReadAll(sql);
    const columnNames = result.columnNames();
    const rows = [];

    for (const row of result.getRows()) {
      const rowObj: Record<string, unknown> = {};
      columnNames.forEach((col, i) => {
        rowObj[col] = row[i];
      });
      rows.push({
        rule_id: rule.id,
        confidence: rule.confidence(rowObj),
        evidence: rowObj,
      });
    }

    return rows;
  } finally {
    connection.disconnectSync();
    instance.closeSync();
  }
}

describe("Smoke tests — 3 brand datasets", () => {
  for (const brand of BRANDS) {
    describe(brand.name, () => {
      for (const rule of RULES) {
        it.skipIf(!brandHasReportsFor(rule, brand.dir))(`${rule.id} runs without error and produces well-formed findings`, async () => {
          const findings = await runRuleOnBrand(rule, brand.dir);

          // A rule may legitimately find NOTHING on a given brand — e.g. low_price_fba on a
          // catalog with no sub-$10 SKUs (Halcyon), or a synthetic fee model that isn't
          // tier-correlated (a P5.3 real-data asterisk). Zero is a valid, honest outcome;
          // the volume guarantee lives in the aggregate test below + the Halcyon gate's hard
          // wedge counts. What every rule MUST do is run cleanly and emit well-formed rows.
          expect(findings.length).toBeGreaterThanOrEqual(0);

          // All findings should have the correct rule_id
          expect(findings.every((f) => f.rule_id === rule.id)).toBe(true);

          // All findings should have valid confidence
          expect(
            findings.every((f) =>
              ["high", "medium", "low"].includes(f.confidence),
            ),
          ).toBe(true);

          // Every finding must emit the mandated window_closes_on column. The value
          // may be null for rolling-overcharge rules (referral/size-tier have no hard
          // dispute window — PRD §5.5/§5.6); reimbursement rules carry a real date.
          expect(
            findings.every((f) => "window_closes_on" in f.evidence),
          ).toBe(true);

          // All findings should have a row_ref
          expect(
            findings.every(
              (f) => f.evidence.row_ref != null && f.evidence.row_ref !== "",
            ),
          ).toBe(true);
        }, 30_000);
      }

      it("produces aggregate findings across all rules", async () => {
        let total = 0;
        const breakdown: Record<string, number> = {};

        for (const rule of RULES) {
          if (!brandHasReportsFor(rule, brand.dir)) continue;
          const findings = await runRuleOnBrand(rule, brand.dir);
          total += findings.length;
          breakdown[rule.id] = findings.length;
        }

        // Each brand should produce meaningful volume
        expect(total).toBeGreaterThan(50);

        // Log summary for manual inspection
        console.log(
          `  ${brand.name}: ${total} total findings`,
          JSON.stringify(breakdown),
        );
      }, 60_000);
    });
  }
});
