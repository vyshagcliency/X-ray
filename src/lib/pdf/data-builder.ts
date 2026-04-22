/**
 * Transforms raw findings + narrative into the structured JSON
 * consumed by the PDF renderer.
 */

import { formatDollars, formatDollarsExact } from "@/lib/format";
import type { NarrativeOutput } from "@/lib/llm/narrate";
import type { DisputeDraft } from "@/lib/llm/draft-dispute";

interface Finding {
  id: string;
  rule_id: string;
  category: string;
  amount_cents: number;
  confidence: string;
  window_closes_on: string | null;
  window_days_remaining: number | null;
  evidence: Record<string, unknown>;
}

interface CategorySummary {
  category: string;
  display_name: string;
  count: number;
  total: string;
  total_cents: number;
  urgent_count: number;
}

export interface ReportData {
  brand_name: string;
  generated_at: string;
  total_recoverable: string;
  total_recoverable_cents: number;
  urgent_recoverable: string;
  urgent_recoverable_cents: number;
  findings_count: number;
  categories: CategorySummary[];
  top_cases: Array<{
    rank: number;
    rule_id: string;
    category: string;
    amount: string;
    amount_exact: string;
    confidence: string;
    order_id: string;
    sku: string;
    window_closes_on: string | null;
    days_remaining: number | null;
    dispute_draft: DisputeDraft | null;
  }>;
  narrative: NarrativeOutput;
}

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  returns: "Customer Return Gaps",
  inventory: "Lost & Damaged Inventory",
  refunds: "Refund/Reimbursement Mismatches",
};

export function buildReportData(
  brand_name: string,
  findings: Finding[],
  narrative: NarrativeOutput,
  disputeDrafts: Map<string, DisputeDraft>,
): ReportData {
  const now = new Date();

  // Aggregate by category
  const catMap = new Map<string, { count: number; total_cents: number; urgent_count: number }>();
  for (const f of findings) {
    const existing = catMap.get(f.category) ?? { count: 0, total_cents: 0, urgent_count: 0 };
    existing.count++;
    existing.total_cents += f.amount_cents;
    if (f.window_days_remaining !== null && f.window_days_remaining >= 0 && f.window_days_remaining <= 14) {
      existing.urgent_count++;
    }
    catMap.set(f.category, existing);
  }

  const categories: CategorySummary[] = Array.from(catMap.entries()).map(([cat, data]) => ({
    category: cat,
    display_name: CATEGORY_DISPLAY_NAMES[cat] ?? cat,
    count: data.count,
    total: formatDollars(data.total_cents),
    total_cents: data.total_cents,
    urgent_count: data.urgent_count,
  }));

  // Sort findings by amount descending, take top 25
  const sorted = [...findings].sort((a, b) => b.amount_cents - a.amount_cents);
  const top25 = sorted.slice(0, 25);

  const totalCents = findings.reduce((s, f) => s + f.amount_cents, 0);
  const urgentCents = findings
    .filter((f) => f.window_days_remaining !== null && f.window_days_remaining >= 0 && f.window_days_remaining <= 14)
    .reduce((s, f) => s + f.amount_cents, 0);

  return {
    brand_name,
    generated_at: now.toISOString(),
    total_recoverable: formatDollars(totalCents),
    total_recoverable_cents: totalCents,
    urgent_recoverable: formatDollars(urgentCents),
    urgent_recoverable_cents: urgentCents,
    findings_count: findings.length,
    categories,
    top_cases: top25.map((f, i) => ({
      rank: i + 1,
      rule_id: f.rule_id,
      category: f.category,
      amount: formatDollars(f.amount_cents),
      amount_exact: formatDollarsExact(f.amount_cents),
      confidence: f.confidence,
      order_id: String(f.evidence.order_id ?? "N/A"),
      sku: String(f.evidence.sku ?? "N/A"),
      window_closes_on: f.window_closes_on,
      days_remaining: f.window_days_remaining,
      dispute_draft: disputeDrafts.get(f.id) ?? null,
    })),
    narrative,
  };
}
