/**
 * CSV export of every finding (P2.4) — the "yours to file, free" long tail the web
 * report caps at a few rows per category. Each row carries the identifiers, the dollar
 * gap, the dispute window, and a copy-ready dispute message (P2.3) so a Controller can
 * file any single row from the export alone.
 *
 * Amounts are plain decimals (spreadsheet-summable), not display-formatted currency.
 * The dispute message comes from the same `draftDispute` templates as the PDF.
 */

import { draftDispute } from "@/lib/llm/draft-dispute";
import { catMeta } from "@/components/report/category-meta";

export interface CsvFinding {
  category: string;
  rule_id: string;
  amount_cents: number;
  confidence: string;
  window_closes_on: string | null;
  window_days_remaining: number | null;
  evidence: Record<string, unknown>;
}

const HEADERS = [
  "Category",
  "Rule",
  "Confidence",
  "Order ID",
  "SKU",
  "Overcharge (USD)",
  "Window closes",
  "Days left",
  "Dispute subject",
  "Dispute message",
];

/** Defuse CSV formula injection: cell values originate from an uploaded CSV and the
 * export is opened in Excel/Sheets, where a leading =/+/-/@/tab/CR is executed as a
 * formula. Prefix a single quote so the spreadsheet treats it as literal text. */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** RFC 4180: quote a field only when it contains a comma, quote, CR or LF; double any
 * inner quotes. Keeps a multi-line dispute body a single valid CSV record. */
function escapeCell(value: string): string {
  const v = neutralizeFormula(value);
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function toCsv(headers: string[], records: string[][]): string {
  return [headers, ...records]
    .map((cols) => cols.map((c) => escapeCell(c)).join(","))
    .join("\r\n");
}

export function findingsToCsv(findings: CsvFinding[]): string {
  const records = findings.map((f) => {
    const draft = draftDispute({
      rule_id: f.rule_id,
      category: f.category,
      amount_cents: f.amount_cents,
      confidence: f.confidence,
      evidence: f.evidence,
    });
    return [
      catMeta(f.category).label,
      f.rule_id,
      f.confidence,
      String(f.evidence.order_id ?? f.evidence.transaction_id ?? ""),
      String(f.evidence.sku ?? ""),
      (f.amount_cents / 100).toFixed(2),
      f.window_closes_on ?? "",
      f.window_days_remaining == null ? "" : String(f.window_days_remaining),
      draft.subject,
      draft.body,
    ];
  });
  return toCsv(HEADERS, records);
}
