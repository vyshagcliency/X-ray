import {
  DuckDBDateValue,
  DuckDBTimeValue,
  DuckDBTimeTZValue,
  DuckDBTimeNSValue,
  DuckDBTimestampValue,
  DuckDBTimestampSecondsValue,
  DuckDBTimestampMillisecondsValue,
  DuckDBTimestampNanosecondsValue,
  DuckDBTimestampTZValue,
} from "@duckdb/node-api";

/**
 * DuckDB returns temporal columns as value objects (DuckDBDateValue carries an own
 * `days`; DuckDBTimestampValue an own `micros: bigint`) and SUM()/HUGEINT results as
 * JS `bigint`. Both are jsonb-hostile: temporal objects serialize to `{"days":…}` /
 * `{"micros":…}` (rendered as "[object Object]"), and a bigint makes JSON.stringify
 * throw outright — failing the whole findings insert.
 *
 * This coerces a single raw DuckDB value into a JSON-safe primitive, once, centrally,
 * so every rule's `evidence` is defensible. Applied where result rows land in evidence
 * (run-rule.ts and the test harness) — never touches the SQL, so detection stays pure.
 */
const TEMPORAL_VALUE_CLASSES = [
  DuckDBDateValue,
  DuckDBTimeValue,
  DuckDBTimeTZValue,
  DuckDBTimeNSValue,
  DuckDBTimestampValue, // = DuckDBTimestampMicrosecondsValue
  DuckDBTimestampSecondsValue,
  DuckDBTimestampMillisecondsValue,
  DuckDBTimestampNanosecondsValue,
  DuckDBTimestampTZValue,
];

export function normalizeDuckDBValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    // Within the safe integer range, a Number is exact and jsonb-native. Outside it,
    // keep the full precision as a string (a huge bigint is neither safe nor JSON-able).
    return value >= BigInt(Number.MIN_SAFE_INTEGER) &&
      value <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(value)
      : value.toString();
  }

  if (
    value !== null &&
    typeof value === "object" &&
    TEMPORAL_VALUE_CLASSES.some((cls) => value instanceof cls)
  ) {
    // DuckDB stringifies dates as "YYYY-MM-DD" and timestamps as "YYYY-MM-DD HH:MM:SS".
    // Swap the timestamp separator for a "T" so the result is ISO-8601, and — crucially —
    // build the string from DuckDB's own toString(), never via `new Date()`, so no
    // timezone conversion can shift the day.
    const s = String(value);
    return s.includes(" ") ? s.replace(" ", "T") : s;
  }

  return value;
}

/** Coerce every value in a DuckDB result row to a JSON-safe primitive. */
export function normalizeDuckDBRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    out[key] = normalizeDuckDBValue(row[key]);
  }
  return out;
}
