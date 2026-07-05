import { DuckDBInstance } from "@duckdb/node-api";

/**
 * Number of whole months the settlement report spans, from its date range.
 *
 * Used to turn a *cumulative* recurring overcharge (referral / size-tier fees,
 * accrued across the whole settlement history) into an honest per-month run-rate:
 * `recurring_cents / months`. Returns `null` when the file carries no usable date
 * column (e.g. a minimal export) — callers then avoid quoting a monthly figure at
 * all rather than fabricating one.
 *
 * Date column is discovered at runtime because Settlement V2 exports vary in which
 * date fields they include. Preference order favours a date-only column (clean cast).
 */
const DATE_COLUMN_CANDIDATES = [
  "posted-date",
  "settlement-end-date",
  "settlement-start-date",
  "deposit-date",
  "posted-date-time",
];

export async function getSettlementMonths(settlementUrl: string): Promise<number | null> {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  try {
    // httpfs is only needed to read remote signed URLs (prod). Local paths (tests)
    // skip it — installing the extension needs network the test sandbox lacks.
    if (/^https?:\/\//i.test(settlementUrl)) {
      await connection.run("SET home_directory = '/tmp';");
      await connection.run("INSTALL httpfs; LOAD httpfs;");
    }

    // The URL is bound as a query parameter, never interpolated: a Supabase signed
    // URL contains the user-chosen filename, so string-concatenating it into SQL would
    // be injectable. Discover the columns present in this export.
    const headStmt = await connection.prepare(
      "SELECT * FROM read_csv($1, auto_detect=true) LIMIT 0",
    );
    headStmt.bindVarchar(1, settlementUrl);
    const head = await headStmt.runAndReadAll();
    const cols = head.columnNames();
    const lower = cols.map((c) => c.toLowerCase());
    const idx = DATE_COLUMN_CANDIDATES.map((c) => lower.indexOf(c)).find((i) => i >= 0);
    if (idx === undefined) return null;
    const dateCol = cols[idx];
    // A column identifier can't be bound, only interpolated. It's already constrained
    // to a case-variant of a known-safe candidate above; guard the shape anyway so no
    // quote/metacharacter from an odd CSV header can reach the SQL.
    if (!/^[A-Za-z0-9_-]+$/.test(dateCol)) return null;

    // Whole-month span between the earliest and latest parseable date, inclusive.
    const stmt = await connection.prepare(
      `SELECT date_diff('month', min(d), max(d)) + 1 AS months
       FROM (
         SELECT try_cast("${dateCol}" AS TIMESTAMP) AS d
         FROM read_csv($1, auto_detect=true)
       )
       WHERE d IS NOT NULL`,
    );
    stmt.bindVarchar(1, settlementUrl);
    const result = await stmt.runAndReadAll();
    const rows = result.getRows();
    const months = rows.length ? Number(rows[0][0]) : NaN;
    return Number.isFinite(months) && months > 0 ? months : null;
  } catch (err) {
    console.error("getSettlementMonths failed:", err);
    return null;
  } finally {
    connection.disconnectSync();
    instance.closeSync();
  }
}
