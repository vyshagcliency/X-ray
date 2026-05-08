/**
 * Smoke test: run all 3 detection rules against realistic test data.
 * Usage: npx tsx tests/smoke/run-smoke.ts
 */
import { DuckDBInstance } from "@duckdb/node-api";
import path from "path";
import { RULES } from "@/lib/rules";

const SMOKE_DIR = path.resolve(__dirname);

async function main() {
  const fixtureUrls: Record<string, string> = {
    returns: path.join(SMOKE_DIR, "returns.csv"),
    inventory_ledger: path.join(SMOKE_DIR, "inventory-ledger.csv"),
    reimbursements: path.join(SMOKE_DIR, "reimbursements.csv"),
  };

  console.log("=== Smoke Test: Detection Rules vs Realistic Data ===\n");

  let totalFindings = 0;
  let totalAmountCents = 0;

  for (const rule of RULES) {
    const instance = await DuckDBInstance.create(":memory:");
    const connection = await instance.connect();

    try {
      let sql = rule.sql;
      for (const [type, filePath] of Object.entries(fixtureUrls)) {
        sql = sql.replaceAll(`$${type}_url`, `'${filePath}'`);
      }

      const result = await connection.runAndReadAll(sql);
      const columnNames = result.columnNames();
      const rows = result.getRows();

      let highCount = 0;
      let medCount = 0;

      for (const row of rows) {
        const rowObj: Record<string, unknown> = {};
        columnNames.forEach((col, i) => {
          rowObj[col] = row[i];
        });
        const conf = rule.confidence(rowObj);
        if (conf === "high") highCount++;
        else medCount++;
      }

      // Estimate amount at $15/unit average for home goods
      const estimatedCents = rows.length * 1500;
      totalFindings += rows.length;
      totalAmountCents += estimatedCents;

      console.log(`Rule: ${rule.id} (v${rule.version})`);
      console.log(`  Findings: ${rows.length}`);
      console.log(`  High confidence: ${highCount}, Medium: ${medCount}`);
      console.log(`  Estimated recoverable: $${(estimatedCents / 100).toLocaleString()}`);
      console.log();
    } finally {
      connection.disconnectSync();
      instance.closeSync();
    }
  }

  console.log("=== TOTALS ===");
  console.log(`Total findings: ${totalFindings}`);
  console.log(`Total estimated recoverable: $${(totalAmountCents / 100).toLocaleString()}`);
  console.log(`Revenue ($1M) leakage rate: ${((totalAmountCents / 100) / 1000000 * 100).toFixed(2)}%`);
}

main().catch(console.error);
