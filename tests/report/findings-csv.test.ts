import { describe, it, expect } from "vitest";
import { findingsToCsv, type CsvFinding } from "@/lib/report/findings-csv";

/**
 * P2.4 — every finding is exportable as CSV so a Controller can file the long tail the
 * web report caps. Each row carries the identifiers, the dollar gap, the window, AND a
 * copy-ready dispute message (P2.3), so any single row is filable from the export alone.
 */
const f = (over: Partial<CsvFinding> = {}): CsvFinding => ({
  category: "referral_fee",
  rule_id: "referral_fee_mismatch",
  amount_cents: 91600,
  confidence: "high",
  window_closes_on: null,
  window_days_remaining: null,
  evidence: { order_id: "111-2223334-5556667", sku: "HA-HDP-001", product_group: "Consumer Electronics" },
  ...over,
});

function rows(csv: string): string[] {
  // Split on record boundaries that are NOT inside a quoted field.
  return csv.match(/(?:"(?:[^"]|"")*"|[^\r\n])*(?:\r\n|$)/g)!.filter((r) => r.trim() !== "");
}

describe("findingsToCsv", () => {
  it("emits a header row plus one row per finding", () => {
    const csv = findingsToCsv([f(), f({ evidence: { sku: "B" } })]);
    const recs = rows(csv);
    expect(recs).toHaveLength(3); // header + 2
    expect(recs[0]).toContain("Category");
    expect(recs[0]).toContain("Dispute message");
  });

  it("formats the Overcharge column as a plain summable decimal (no $ or thousands sep)", () => {
    const csv = findingsToCsv([f({ amount_cents: 123456 })]);
    // The Overcharge *cell* is a bare decimal (the dispute-message cell may still quote a
    // display-formatted dollar — that's the human-readable draft, not the numeric column).
    expect(csv).toContain(",1234.56,");
  });

  it("carries the finding identifiers and a dispute message for every row", () => {
    const csv = findingsToCsv([f()]);
    expect(csv).toContain("HA-HDP-001");
    expect(csv).toContain("111-2223334-5556667");
    // The dispute draft body is present (copy-ready), quoted because it is multi-line.
    expect(csv).toMatch(/"I am writing to dispute[\s\S]*"/);
  });

  it("RFC-4180-escapes commas, quotes and newlines so the file stays valid", () => {
    // A multi-line dispute body must remain a single CSV record.
    const csv = findingsToCsv([f()]);
    const recs = rows(csv);
    expect(recs).toHaveLength(2); // header + 1, despite the newlines inside the body
    // Inner double-quotes are doubled, never left bare.
    const bodyCell = csv.slice(csv.indexOf('"I am writing'));
    expect(bodyCell.startsWith('"')).toBe(true);
  });

  it("neutralizes formula-injection payloads in seller-supplied cells", () => {
    // Evidence originates from an uploaded CSV; the export is forwarded to a CFO who
    // opens it in Excel/Sheets. A leading =/+/-/@ must not execute as a formula.
    const csv = findingsToCsv([
      f({ evidence: { order_id: "=cmd|'/c calc'!A1", sku: "@SUM(1+1)", product_group: "x" } }),
    ]);
    // Each dangerous cell is prefixed with a single quote (kept inside its escaping).
    expect(csv).toContain("'=cmd");
    expect(csv).toContain("'@SUM(1+1)");
    // A benign SKU is left untouched (no spurious apostrophe).
    const clean = findingsToCsv([f({ evidence: { sku: "HA-HDP-001" } })]);
    expect(clean).toContain("HA-HDP-001");
    expect(clean).not.toContain("'HA-HDP-001");
  });

  it("renders empty window fields as blank, not 'null' or 'N/A'", () => {
    const csv = findingsToCsv([f({ window_closes_on: null, window_days_remaining: null })]);
    expect(csv).not.toContain("null");
    expect(csv).not.toContain("N/A");
  });
});
