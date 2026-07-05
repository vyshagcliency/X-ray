import { createDuckDB } from "./client";
import type { Rule } from "@/lib/rules";

export interface FindingRow {
  rule_id: string;
  rule_version: string;
  category: string;
  amount_cents: number;
  confidence: "high" | "medium" | "low";
  window_closes_on: string | null;
  evidence: Record<string, unknown>;
  row_ref: string;
}

/**
 * Execute a detection rule's SQL against Parquet files via DuckDB.
 * Returns an array of finding rows ready for insertion.
 *
 * @param rule - The detection rule to run
 * @param parquetUrls - Map of report type -> signed Parquet URL
 * @param estimateAmountCents - Function to estimate $ amount per row (from listing prices or defaults)
 */
export async function runRule(
  rule: Rule,
  parquetUrls: Record<string, string>,
  estimateAmountCents: (row: Record<string, unknown>) => number = () => 1500, // $15 default
): Promise<FindingRow[]> {
  // Verify all required reports are available
  for (const required of rule.requiredReports) {
    if (!parquetUrls[required]) {
      throw new Error(
        `Rule ${rule.id} requires '${required}' report but it's not available`,
      );
    }
  }

  const { connection, instance } = await createDuckDB();

  try {
    // Bind report URLs as query parameters rather than interpolating them: a signed
    // URL embeds the user-chosen filename, so string-concatenation would be injectable.
    // Each $<type>_url placeholder present in the SQL maps to a positional parameter.
    const urlTypes = Object.keys(parquetUrls).filter((type) =>
      rule.sql.includes(`$${type}_url`),
    );
    let sql = rule.sql;
    urlTypes.forEach((type, i) => {
      // Function replacement avoids `$` being read as a replacement pattern.
      sql = sql.replaceAll(`$${type}_url`, () => `$${i + 1}`);
    });

    const prepared = await connection.prepare(sql);
    urlTypes.forEach((type, i) => {
      prepared.bindVarchar(i + 1, parquetUrls[type]);
    });
    const result = await prepared.runAndReadAll();

    const columnNames = result.columnNames();
    const rows: FindingRow[] = [];

    for (const row of result.getRows()) {
      const rowObj: Record<string, unknown> = {};
      columnNames.forEach((col, i) => {
        rowObj[col] = row[i];
      });

      const windowClosesOn = rowObj.window_closes_on;
      const windowDate = windowClosesOn ? new Date(String(windowClosesOn)) : null;
      const now = new Date();
      const windowDaysRemaining = windowDate
        ? Math.ceil((windowDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      rows.push({
        rule_id: rule.id,
        rule_version: rule.version,
        category: rule.category,
        // Payout-integrity rules compute the real recoverable overcharge in SQL and
        // emit it as `amount_cents`. Reimbursement rules omit it and fall back to the
        // downstream estimator. All arithmetic still lives in SQL.
        amount_cents:
          rowObj.amount_cents != null
            ? Math.round(Number(rowObj.amount_cents))
            : estimateAmountCents(rowObj),
        confidence: rule.confidence(rowObj),
        window_closes_on: windowDate ? windowDate.toISOString().split("T")[0] : null,
        evidence: {
          ...rowObj,
          window_days_remaining: windowDaysRemaining,
        },
        row_ref: String(rowObj.row_ref ?? ""),
      });
    }

    return rows;
  } finally {
    connection.disconnectSync();
    instance.closeSync();
  }
}
