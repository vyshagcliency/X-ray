import { describe, it, expect } from "vitest";
import { DuckDBInstance } from "@duckdb/node-api";
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
];

const SMOKE_BASE = path.resolve(__dirname, "smoke");

async function runRuleOnBrand(rule: Rule, brandDir: string) {
  const urls: Record<string, string> = {
    returns: path.join(SMOKE_BASE, brandDir, "returns.csv"),
    reimbursements: path.join(SMOKE_BASE, brandDir, "reimbursements.csv"),
    inventory_ledger: path.join(SMOKE_BASE, brandDir, "inventory-ledger.csv"),
  };

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
        it(`${rule.id} runs without error and produces findings`, async () => {
          const findings = await runRuleOnBrand(rule, brand.dir);

          // Every brand should produce at least some findings per rule
          expect(findings.length).toBeGreaterThan(0);

          // All findings should have the correct rule_id
          expect(findings.every((f) => f.rule_id === rule.id)).toBe(true);

          // All findings should have valid confidence
          expect(
            findings.every((f) =>
              ["high", "medium", "low"].includes(f.confidence),
            ),
          ).toBe(true);

          // All findings should have a window_closes_on date
          expect(
            findings.every((f) => f.evidence.window_closes_on != null),
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
