import { DuckDBInstance } from "@duckdb/node-api";
import path from "path";
import type { Rule } from "@/lib/rules";

export interface TestFinding {
  amount_cents: number;
  confidence: "high" | "medium" | "low";
  window_closes_on: string | null;
  evidence: Record<string, unknown>;
  row_ref: string;
  rule_id: string;
  rule_version: string;
  category: string;
}

/**
 * Run a detection rule against fixture CSV files using an in-process DuckDB.
 * Returns typed finding rows for assertion.
 *
 * @param rule - The detection rule to test
 * @param fixtures - Map of report type -> relative path to fixture CSV (from tests/fixtures/)
 * @param estimateAmountCents - Optional amount estimator (defaults to $15)
 */
export async function runRuleAgainstFixtures(
  rule: Rule,
  fixtures: Record<string, string>,
  estimateAmountCents: (row: Record<string, unknown>) => number = () => 1500,
): Promise<TestFinding[]> {
  // Resolve fixture paths to absolute file:// URLs
  const fixtureUrls: Record<string, string> = {};
  for (const [type, relativePath] of Object.entries(fixtures)) {
    const absPath = path.resolve(__dirname, "fixtures", relativePath);
    fixtureUrls[type] = absPath;
  }

  // Verify required reports
  for (const required of rule.requiredReports) {
    if (!fixtureUrls[required]) {
      throw new Error(
        `Rule ${rule.id} requires '${required}' but no fixture provided`,
      );
    }
  }

  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  try {
    // Substitute URLs into SQL
    let sql = rule.sql;
    for (const [type, filePath] of Object.entries(fixtureUrls)) {
      sql = sql.replaceAll(`$${type}_url`, `'${filePath}'`);
    }

    const result = await connection.runAndReadAll(sql);
    const columnNames = result.columnNames();
    const findings: TestFinding[] = [];

    for (const row of result.getRows()) {
      const rowObj: Record<string, unknown> = {};
      columnNames.forEach((col, i) => {
        rowObj[col] = row[i];
      });

      const windowClosesOn = rowObj.window_closes_on;
      const windowDate = windowClosesOn
        ? new Date(String(windowClosesOn))
        : null;

      findings.push({
        rule_id: rule.id,
        rule_version: rule.version,
        category: rule.category,
        amount_cents: estimateAmountCents(rowObj),
        confidence: rule.confidence(rowObj),
        window_closes_on: windowDate
          ? windowDate.toISOString().split("T")[0]
          : null,
        evidence: rowObj,
        row_ref: String(rowObj.row_ref ?? ""),
      });
    }

    return findings;
  } finally {
    connection.disconnectSync();
    instance.closeSync();
  }
}
