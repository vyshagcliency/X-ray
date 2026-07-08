/**
 * Transforms raw findings + narrative into the structured JSON that is the SINGLE
 * source of truth for every number on the report (web page + PDF). It is built once,
 * from the complete inserted finding set, and both surfaces render from it — nothing
 * downstream re-aggregates findings for headline / confidence / category numbers (D2).
 */

import { formatDollars, formatDollarsExact, formatPct } from "@/lib/format";
import { ROLLING_CATEGORIES, type NarrativeOutput } from "@/lib/llm/narrate";
import { draftDispute, type DisputeDraft } from "@/lib/llm/draft-dispute";
import { catMeta } from "@/components/report/category-meta";
import { financeMath } from "@/components/report/finding-math";

export interface Finding {
  /** Present when built from DB rows; absent when built from the in-memory set. */
  id?: string;
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
  high: number;
  medium: number;
  low: number;
  /** Dollars from high-confidence findings only — the confidence×punch ranking key (P1.3). */
  high_cents: number;
  /** Rolling overcharge with no dispute deadline (keeps accruing until fixed). */
  recurring: boolean;
  /** Flat-$15 reimbursement estimate (no real per-row amount) — fenced below the fold. */
  estimated: boolean;
}

/** The single sharpest "you found what?" finding, featured above the forensic body (P1.2). */
export interface SpotlightFinding {
  rule_id: string;
  category: string;
  display_name: string;
  amount_cents: number;
  amount: string;
  confidence: string;
  order_id: string;
  sku: string;
  /** Raw evidence for the inline row + the shown math (traces to a real source row). */
  evidence: Record<string, unknown>;
}

/** Provable findings grouped into days-to-window-close bands for the urgency timeline (P1.6). */
export interface UrgencyBucket {
  label: string;
  max_days: number;
  cents: number;
  count: number;
}

// Bands span the full provable filing timeline, not just the near term: return-credit
// carries an 18-month window, so a 60-day cap made the largest recovery invisible on the
// timeline. Long bands read as calm (plenty of runway), near-term as urgent.
const URGENCY_BANDS: Array<{ label: string; max_days: number }> = [
  { label: "≤ 7 days", max_days: 7 },
  { label: "8–14 days", max_days: 14 },
  { label: "15–30 days", max_days: 30 },
  { label: "31–90 days", max_days: 90 },
  { label: "3–6 months", max_days: 180 },
  { label: "6–18 months", max_days: 550 },
];

/**
 * Bucket provable, windowed findings by days-to-close across the full timeline. Shared by
 * `buildReportData` (baked into report_data for the PDF + new audits) and the web report
 * page (recomputed from the live finding set so existing reports get the fuller timeline
 * without a re-run). Pass only the PROVABLE tier; the estimated tier is fenced elsewhere.
 */
export function bucketByWindow(
  provableFindings: Array<{ window_days_remaining: number | null; amount_cents: number }>,
): UrgencyBucket[] {
  return URGENCY_BANDS.map((band, i) => {
    const prevMax = i === 0 ? -1 : URGENCY_BANDS[i - 1].max_days;
    const inBand = provableFindings.filter(
      (f) =>
        f.window_days_remaining !== null &&
        f.window_days_remaining >= 0 &&
        f.window_days_remaining > prevMax &&
        f.window_days_remaining <= band.max_days,
    );
    return {
      label: band.label,
      max_days: band.max_days,
      cents: inBand.reduce((s, f) => s + f.amount_cents, 0),
      count: inBand.length,
    };
  }).filter((b) => b.count > 0);
}

/**
 * Precomputed, print-ready view (P4.1). The PDF renderers (Typst + React-PDF) cannot
 * format currency or run `financeMath`, so we compute every display string here — with
 * the SAME helpers the web uses — and both PDFs render straight from this. That is what
 * keeps web ↔ PDF ↔ the two PDFs telling one tiered story with reconciled numbers.
 */
export interface PdfMathRow {
  label: string;
  value: string;
  /** The result line (overcharge / recoverable) — rendered emphasized. */
  emphasis: boolean;
}

export interface PdfSpotlight {
  display_name: string;
  color: string;
  amount: string;
  confidence: string;
  trace_label: string;
  trace_value: string;
  /** Plain-English "you found what?" claim (mirrors the web Spotlight headline). */
  claim: string;
  formula: string;
  math_rows: PdfMathRow[];
}

export interface PdfCategory {
  category: string;
  color: string;
  display_name: string;
  total: string;
  count: number;
  urgent_count: number;
  /** e.g. "12 high · 5 medium · 1 review" — omits zero buckets. */
  confidence_line: string;
  recurring: boolean;
  estimated: boolean;
  mechanism: string;
  /** LLM category narrative when present, else null (renderer falls back to mechanism). */
  narrative: string | null;
  file_path: string;
  dispute_window: string;
  confidence_why: string;
  /** Worked from the category's largest case (as the web dossier does); null if empty. */
  math: { formula: string; rows: PdfMathRow[] } | null;
}

export interface PdfView {
  subtitle: string;
  /** The cover hero: provable-forward monthly run-rate, or the provable total fallback. */
  hero_amount: string;
  hero_is_forward: boolean;
  hero_headline: string;
  /** The demoted "total surfaced" line with the provable/estimated + confidence mix. */
  surfaced_line: string;
  provable: string;
  estimated: string;
  estimated_note: string | null;
  recurring_monthly: string | null;
  /** Provable dollars whose dispute window closes ≤14 days — the cover urgency badge. */
  urgent: string | null;
  spotlight: PdfSpotlight | null;
  provable_categories: PdfCategory[];
  estimated_categories: PdfCategory[];
}

export interface ReportData {
  brand_name: string;
  generated_at: string;
  total_recoverable: string;
  total_recoverable_cents: number;
  urgent_recoverable: string;
  urgent_recoverable_cents: number;
  findings_count: number;
  /** Whole months the settlement report spans; null when no date column was present. */
  settlement_months: number | null;
  /** Recurring overcharge per month (cumulative recurring ÷ settlement_months); null if unknown. */
  recurring_monthly_cents: number | null;
  /** Cumulative recurring (rolling-category) overcharge across the whole window. */
  recurring_cents: number;
  /** Everything that is not a rolling overcharge (total − recurring). */
  one_time_cents: number;
  /** Findings with a real per-row amount (excludes the flat-$15 estimated tier) — the
   * hero and the "traces to a row" promise describe this figure, not the total (D3). */
  provable_cents: number;
  /** Flat-$15 reimbursement estimate subtotal, fenced below the fold. */
  estimated_cents: number;
  /** Provable, non-recurring recoverable (provable − recurring) — the "recoverable now" tile. */
  provable_one_time_cents: number;
  /** Urgent (≤14d window) recoverable among provable findings only — the hero badge (D5). */
  provable_urgent_cents: number;
  /** Cumulative HIGH-confidence rolling overcharge — the undeniable forward figure (P1.1). */
  provable_forward_cents: number;
  /** The hero number: high-confidence forward overcharge as a monthly run-rate
   * (provable_forward_cents ÷ settlement_months); null when the window is unknown. */
  provable_forward_monthly_cents: number | null;
  /** Provable dollars split by confidence — feeds the confidence×dollars chart (P1.6).
   * Sums to provable_cents (the estimated tier is excluded). */
  provable_confidence_cents: { high: number; medium: number; low: number };
  /** Provable windowed findings bucketed by days-to-close — the urgency timeline (P1.6). */
  urgency_buckets: UrgencyBucket[];
  /** The single sharpest finding, featured above the forensic body (P1.2); null if none. */
  spotlight: SpotlightFinding | null;
  /** Distinct SKUs touched by any finding. */
  skus_affected: number;
  /** Confidence tally across all findings — the widget renders straight from this. */
  confidence: { high: number; medium: number; low: number };
  /** Ordered for display: payout-integrity wedge first, reimbursement add-ons last. */
  categories: CategorySummary[];
  top_cases: Array<{
    rank: number;
    rule_id: string;
    category: string;
    amount: string;
    amount_exact: string;
    amount_cents: number;
    confidence: string;
    order_id: string;
    sku: string;
    window_closes_on: string | null;
    days_remaining: number | null;
    dispute_draft: DisputeDraft | null;
  }>;
  narrative: NarrativeOutput;
  /** Precomputed print-ready view — the single source for both PDF renderers (P4.1). */
  pdf: PdfView;
}

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  // Payout integrity (the lead wedge)
  referral_fee: "Referral Fee Overcharges",
  fba_dimension: "Size-Tier Overcharges",
  return_credit: "Credits Never Applied",
  aged_surcharge: "Aged-Stock Surcharges",
  // Fee-line wedge additions (Phase 3)
  low_price_fee: "Low-Price Discount Missed",
  coupon_fee: "Coupon Fee Errors",
  deal_fee: "Deal Fee Double-Bookings",
  storage_cube: "Storage Cube Overcharges",
  // Reimbursement add-ons
  returns: "Customer Return Gaps",
  lost_inventory: "Lost & Damaged Inventory",
  refunds: "Refund/Reimbursement Mismatches",
};

/**
 * Reimbursement add-ons sort after the payout-integrity wedge. Kept in sync with the
 * report page; P0.3 fences these below the fold as the "estimated" tier.
 */
export const REIMBURSEMENT_CATEGORIES = new Set(["returns", "lost_inventory"]);

const isUrgent = (f: Finding) =>
  f.window_days_remaining !== null &&
  f.window_days_remaining >= 0 &&
  f.window_days_remaining <= 14;

export interface NarrativeFigures {
  /** Provable-tier total (row-level amounts; the estimated reimbursement tier is fenced
   *  out). This is what the exec summary leads with, not the soft all-in total. */
  provable_cents: number;
  /** High-confidence rolling overcharge, cumulative across the settlement window. */
  provable_forward_cents: number;
  /** …as a monthly run-rate; null when the settlement window is unknown. */
  provable_forward_monthly_cents: number | null;
  /** Urgent dollars in the PROVABLE tier only (the estimated tier is fenced out). */
  provable_urgent_cents: number;
}

/**
 * The reconciled figures the hero leads with: the high-confidence rolling run-rate
 * (referral/size-tier, no dispute window) and the provable-only urgent total. Exported so
 * the narrative — generated before the full view in `audit-run` — can quote the SAME
 * numbers as the headline and never diverge (fixes the recurring/urgent "two bases on one
 * page" bug, decisions.md 2026-07-07). `buildReportData` derives its hero figures from
 * this exact helper, so there is one definition, not two.
 */
export function computeNarrativeFigures(
  findings: Finding[],
  settlementMonths: number | null,
): NarrativeFigures {
  const provable_cents = findings
    .filter((f) => !REIMBURSEMENT_CATEGORIES.has(f.category))
    .reduce((s, f) => s + f.amount_cents, 0);
  const provable_forward_cents = findings
    .filter((f) => ROLLING_CATEGORIES.has(f.category) && f.confidence === "high")
    .reduce((s, f) => s + f.amount_cents, 0);
  const provable_forward_monthly_cents =
    settlementMonths && settlementMonths > 0
      ? Math.round(provable_forward_cents / settlementMonths)
      : null;
  const provable_urgent_cents = findings
    .filter((f) => isUrgent(f) && !REIMBURSEMENT_CATEGORIES.has(f.category))
    .reduce((s, f) => s + f.amount_cents, 0);
  return {
    provable_cents,
    provable_forward_cents,
    provable_forward_monthly_cents,
    provable_urgent_cents,
  };
}

/**
 * The sharpest finding to spotlight (P1.2): prefer the largest high-confidence rolling
 * wedge (referral/size-tier — the "you found what?" cases), fall back to the largest
 * high-confidence finding, then the largest finding overall.
 */
function pickSpotlight(findings: Finding[]): Finding | null {
  if (findings.length === 0) return null;
  const byAmount = (a: Finding, b: Finding) => b.amount_cents - a.amount_cents;
  const wedgeHigh = findings
    .filter((f) => ROLLING_CATEGORIES.has(f.category) && f.confidence === "high")
    .sort(byAmount);
  if (wedgeHigh.length > 0) return wedgeHigh[0];
  const anyHigh = findings.filter((f) => f.confidence === "high").sort(byAmount);
  if (anyHigh.length > 0) return anyHigh[0];
  return [...findings].sort(byAmount)[0];
}

const numE = (v: unknown) => Number(v ?? 0);

/** "12 high · 5 medium · 1 review" — omits zero buckets. */
function confidenceLine(high: number, medium: number, low: number): string {
  const parts: string[] = [];
  if (high > 0) parts.push(`${high} high`);
  if (medium > 0) parts.push(`${medium} medium`);
  if (low > 0) parts.push(`${low} review`);
  return parts.length ? parts.join(" · ") : "0 findings";
}

/** Plain-English spotlight claim — mirrors the web Spotlight.headlineFor, as a string. */
function spotlightClaim(s: SpotlightFinding): string {
  const e = s.evidence;
  const amount = formatDollars(s.amount_cents);
  if (s.category === "referral_fee") {
    const group = String(e.product_group ?? "this category");
    return `Amazon charged ${s.sku} a ${formatPct(numE(e.actual_pct))} referral fee where ${group} publishes ${formatPct(
      numE(e.expected_pct),
    )}. On this one order that is a ${amount} overcharge — and it repeats on every ${group} sale until the category is fixed.`;
  }
  if (s.category === "fba_dimension") {
    return `Amazon billed ${s.sku} at the ${String(e.amazon_tier)} size tier when its measured dimensions place it in ${String(
      e.correct_tier,
    )} — overcharging ${formatDollars(numE(e.per_unit_overcharge_cents))} on every one of ${numE(
      e.units_sold,
    ).toLocaleString()} units shipped, a ${amount} overcharge in total.`;
  }
  return `The single largest discrepancy we found: ${amount} on ${s.sku}.`;
}

const toPdfMathRows = (rows: { label: string; value: string; emphasis?: boolean }[]) =>
  rows.map((r) => ({ label: r.label, value: r.value, emphasis: !!r.emphasis }));

/**
 * Assemble the print-ready view (P4.1). Every string is computed with the same helpers
 * the web renders from (`formatDollars`, `catMeta`, `financeMath`), worked from the same
 * "largest case per category" the web dossier uses — so the PDF cannot drift from the web.
 */
function buildPdfView(
  brand_name: string,
  categories: CategorySummary[],
  spotlight: SpotlightFinding | null,
  largestByCategory: Map<string, Finding>,
  narrative: NarrativeOutput,
  totals: {
    total_recoverable: string;
    provable_cents: number;
    estimated_cents: number;
    confidence: { high: number; medium: number; low: number };
    provable_forward_monthly_cents: number | null;
    recurring_monthly_cents: number | null;
    provable_urgent_cents: number;
  },
): PdfView {
  const provable = formatDollars(totals.provable_cents);
  const estimated = formatDollars(totals.estimated_cents);

  const heroIsForward =
    totals.provable_forward_monthly_cents !== null &&
    totals.provable_forward_monthly_cents > 0;
  const heroAmount = heroIsForward
    ? formatDollars(totals.provable_forward_monthly_cents!)
    : provable;
  const heroHeadline = heroIsForward
    ? `Amazon is overbilling ${brand_name} about ${heroAmount} every month in high-confidence, provable overcharges — and it compounds until the wrong referral category and size-tier are corrected.`
    : `Provable overcharges and missing credits we found in ${brand_name}'s own Seller Central data — every figure below traces to a specific row.`;

  const surfacedLine = `${totals.total_recoverable} surfaced across ${categories.length} ${
    categories.length === 1 ? "category" : "categories"
  } · ${provable} provable${
    totals.estimated_cents > 0 ? ` / ${estimated} estimated` : ""
  } · ${totals.confidence.high} high · ${totals.confidence.medium} medium confidence.`;

  const estimatedNote =
    totals.estimated_cents > 0
      ? `The estimated figure is a flat per-item placeholder for reimbursement buckets, not counted in the ${provable} provable number — Amazon may have already auto-reimbursed some.`
      : null;

  const toPdfCategory = (c: CategorySummary): PdfCategory => {
    const meta = catMeta(c.category);
    const lead = largestByCategory.get(c.category);
    const math = lead ? financeMath(c.category, lead.evidence, lead.amount_cents) : null;
    return {
      category: c.category,
      color: meta.color,
      display_name: c.display_name,
      total: c.total,
      count: c.count,
      urgent_count: c.urgent_count,
      confidence_line: confidenceLine(c.high, c.medium, c.low),
      recurring: c.recurring,
      estimated: c.estimated,
      mechanism: meta.mechanism,
      narrative: narrative.category_narratives?.[c.category] ?? null,
      file_path: meta.filePath,
      dispute_window: meta.disputeWindow,
      confidence_why: meta.confidenceWhy,
      math: math ? { formula: math.formula, rows: toPdfMathRows(math.rows) } : null,
    };
  };

  let spotlightView: PdfSpotlight | null = null;
  if (spotlight) {
    const meta = catMeta(spotlight.category);
    const m = financeMath(spotlight.category, spotlight.evidence, spotlight.amount_cents);
    const hasOrder = spotlight.order_id !== "" && spotlight.order_id !== "N/A";
    spotlightView = {
      display_name: spotlight.display_name,
      color: meta.color,
      amount: spotlight.amount,
      confidence: spotlight.confidence,
      trace_label: hasOrder ? "order" : "SKU",
      trace_value: hasOrder ? spotlight.order_id : spotlight.sku,
      claim: spotlightClaim(spotlight),
      formula: m.formula,
      math_rows: toPdfMathRows(m.rows),
    };
  }

  return {
    subtitle: "Settlement Truth Audit",
    hero_amount: heroAmount,
    hero_is_forward: heroIsForward,
    hero_headline: heroHeadline,
    surfaced_line: surfacedLine,
    provable,
    estimated,
    estimated_note: estimatedNote,
    recurring_monthly:
      totals.recurring_monthly_cents !== null
        ? formatDollars(totals.recurring_monthly_cents)
        : null,
    urgent:
      totals.provable_urgent_cents > 0
        ? formatDollars(totals.provable_urgent_cents)
        : null,
    spotlight: spotlightView,
    provable_categories: categories.filter((c) => !c.estimated).map(toPdfCategory),
    estimated_categories: categories.filter((c) => c.estimated).map(toPdfCategory),
  };
}

/**
 * Dev/test invariant: guarantees the report can never display numbers that contradict
 * each other. Every path that produces a ReportData runs this so a future change that
 * breaks reconciliation fails loudly in CI instead of silently on a real report.
 */
export function assertReportDataConsistent(data: ReportData): void {
  const categoryTotal = data.categories.reduce((s, c) => s + c.total_cents, 0);
  if (categoryTotal !== data.total_recoverable_cents) {
    throw new Error(
      `report_data invariant: category totals (${categoryTotal}) != total_recoverable_cents (${data.total_recoverable_cents})`,
    );
  }
  const categoryCount = data.categories.reduce((s, c) => s + c.count, 0);
  if (categoryCount !== data.findings_count) {
    throw new Error(
      `report_data invariant: category counts (${categoryCount}) != findings_count (${data.findings_count})`,
    );
  }
  const confTotal =
    data.confidence.high + data.confidence.medium + data.confidence.low;
  if (confTotal !== data.findings_count) {
    throw new Error(
      `report_data invariant: confidence buckets (${confTotal}) != findings_count (${data.findings_count})`,
    );
  }
  const perCategoryConf = data.categories.reduce(
    (s, c) => s + c.high + c.medium + c.low,
    0,
  );
  if (perCategoryConf !== data.findings_count) {
    throw new Error(
      `report_data invariant: per-category confidence (${perCategoryConf}) != findings_count (${data.findings_count})`,
    );
  }
  if (data.provable_cents + data.estimated_cents !== data.total_recoverable_cents) {
    throw new Error(
      `report_data invariant: provable (${data.provable_cents}) + estimated (${data.estimated_cents}) != total (${data.total_recoverable_cents})`,
    );
  }
  const provableConf =
    data.provable_confidence_cents.high +
    data.provable_confidence_cents.medium +
    data.provable_confidence_cents.low;
  if (provableConf !== data.provable_cents) {
    throw new Error(
      `report_data invariant: provable confidence dollars (${provableConf}) != provable_cents (${data.provable_cents})`,
    );
  }
  // The PDF view must render the exact same category set as the web (P4.1 parity).
  const pdfCatCount =
    data.pdf.provable_categories.length + data.pdf.estimated_categories.length;
  if (pdfCatCount !== data.categories.length) {
    throw new Error(
      `report_data invariant: pdf categories (${pdfCatCount}) != categories (${data.categories.length})`,
    );
  }
}

/**
 * Deploy-safety guard: a report_data row built before the Phase-4 `pdf` view existed has
 * no `pdf` block, which would make both PDF renderers throw. This reconstructs the view
 * from the report_data fields that DO exist (spotlight keeps its evidence, so spotlight
 * math survives; per-category dossier math has no per-row evidence to work from, so it
 * degrades to omitted). Every renderer normalizes through this, so a legacy report
 * downloads a coherent PDF instead of failing. Fresh reports keep their precomputed view.
 */
export function ensurePdfView(data: ReportData): PdfView {
  if (data.pdf) return data.pdf;
  const totalCents = data.total_recoverable_cents ?? 0;
  const provableCents = data.provable_cents ?? totalCents;
  return buildPdfView(
    data.brand_name,
    data.categories ?? [],
    data.spotlight ?? null,
    // No per-row evidence in a stored report_data → no per-category math (renderers skip it).
    new Map<string, Finding>(),
    data.narrative,
    {
      total_recoverable: formatDollars(totalCents),
      provable_cents: provableCents,
      estimated_cents: data.estimated_cents ?? 0,
      confidence: data.confidence ?? { high: 0, medium: 0, low: 0 },
      provable_forward_monthly_cents: data.provable_forward_monthly_cents ?? null,
      recurring_monthly_cents: data.recurring_monthly_cents ?? null,
      provable_urgent_cents:
        data.provable_urgent_cents ?? data.urgent_recoverable_cents ?? 0,
    },
  );
}

export function buildReportData(
  brand_name: string,
  findings: Finding[],
  narrative: NarrativeOutput,
  settlementMonths: number | null,
): ReportData {
  const now = new Date();

  const totalCents = findings.reduce((s, f) => s + f.amount_cents, 0);
  const urgentCents = findings
    .filter(isUrgent)
    .reduce((s, f) => s + f.amount_cents, 0);
  // The hero figures (high-confidence forward run-rate + provable-only urgent), from the
  // one shared helper the narrative also uses — so the headline and the exec summary
  // quote identical numbers (D5; decisions.md 2026-07-07).
  const figs = computeNarrativeFigures(findings, settlementMonths);
  const provableUrgentCents = figs.provable_urgent_cents;

  // Recurring overcharges (referral %, size-tier) accrued across the settlement
  // history. Divide by the window to get an honest per-month run-rate.
  const recurringCents = findings
    .filter((f) => ROLLING_CATEGORIES.has(f.category))
    .reduce((s, f) => s + f.amount_cents, 0);
  const recurringMonthlyCents =
    settlementMonths && settlementMonths > 0
      ? Math.round(recurringCents / settlementMonths)
      : null;

  // Estimated tier = reimbursement add-ons billed a flat $15 placeholder (no real
  // per-row amount). Fenced out of the hero + the "traces to a row" claim (D3); the
  // provable figure is everything with a computed-from-the-row amount.
  const estimatedCents = findings
    .filter((f) => REIMBURSEMENT_CATEGORIES.has(f.category))
    .reduce((s, f) => s + f.amount_cents, 0);
  const provableCents = totalCents - estimatedCents;

  // Aggregate by category — counts, dollars, urgency and confidence together, so the
  // category cards and the confidence widget can render without re-touching findings.
  const catMap = new Map<
    string,
    {
      count: number;
      total_cents: number;
      urgent_count: number;
      high: number;
      medium: number;
      low: number;
      high_cents: number;
    }
  >();
  for (const f of findings) {
    const c = catMap.get(f.category) ?? {
      count: 0,
      total_cents: 0,
      urgent_count: 0,
      high: 0,
      medium: 0,
      low: 0,
      high_cents: 0,
    };
    c.count++;
    c.total_cents += f.amount_cents;
    if (isUrgent(f)) c.urgent_count++;
    if (f.confidence === "high") {
      c.high++;
      c.high_cents += f.amount_cents;
    } else if (f.confidence === "medium") c.medium++;
    else c.low++;
    catMap.set(f.category, c);
  }

  const categories: CategorySummary[] = Array.from(catMap.entries())
    .map(([cat, data]) => ({
      category: cat,
      display_name: CATEGORY_DISPLAY_NAMES[cat] ?? cat,
      count: data.count,
      total: formatDollars(data.total_cents),
      total_cents: data.total_cents,
      urgent_count: data.urgent_count,
      high: data.high,
      medium: data.medium,
      low: data.low,
      high_cents: data.high_cents,
      recurring: ROLLING_CATEGORIES.has(cat),
      estimated: REIMBURSEMENT_CATEGORIES.has(cat),
    }))
    // Confidence × punch (P1.3): estimated tier always last; within the provable tier,
    // lead on high-confidence dollars (the sharp wedge), then raw $ — so an all-medium
    // giant is demoted below a smaller undeniable finding (inverts D4).
    .sort((a, b) => {
      const ra = REIMBURSEMENT_CATEGORIES.has(a.category) ? 1 : 0;
      const rb = REIMBURSEMENT_CATEGORIES.has(b.category) ? 1 : 0;
      if (ra !== rb) return ra - rb;
      if (b.high_cents !== a.high_cents) return b.high_cents - a.high_cents;
      return b.total_cents - a.total_cents;
    });

  const confidence = {
    high: findings.filter((f) => f.confidence === "high").length,
    medium: findings.filter((f) => f.confidence === "medium").length,
    low: findings.filter((f) => f.confidence !== "high" && f.confidence !== "medium")
      .length,
  };

  const skusAffected = new Set(
    findings.map((f) => f.evidence.sku).filter(Boolean) as string[],
  ).size;

  // The hero (P1.1): the HIGH-confidence rolling overcharge, as a monthly run-rate —
  // computed once in `computeNarrativeFigures` (above, as `figs`) so the narrative and the
  // headline can never diverge. Rolling = referral/size-tier (no dispute window, recurs
  // until fixed); high-confidence-only keeps the headline undeniable (asymmetric-safety).
  const provableForwardCents = figs.provable_forward_cents;
  const provableForwardMonthlyCents = figs.provable_forward_monthly_cents;

  // Provable dollars by confidence (P1.6 confidence×dollars chart). Provable = every
  // finding with a real per-row amount (non-estimated); this sums to provable_cents.
  const provableFindings = findings.filter(
    (f) => !REIMBURSEMENT_CATEGORIES.has(f.category),
  );
  const provableConfidenceCents = {
    high: provableFindings
      .filter((f) => f.confidence === "high")
      .reduce((s, f) => s + f.amount_cents, 0),
    medium: provableFindings
      .filter((f) => f.confidence === "medium")
      .reduce((s, f) => s + f.amount_cents, 0),
    low: provableFindings
      .filter((f) => f.confidence !== "high" && f.confidence !== "medium")
      .reduce((s, f) => s + f.amount_cents, 0),
  };

  // Provable findings with a live dispute window, banded by days-to-close (P1.6 timeline).
  // Estimated-tier windows are shown in their own fenced table, never here.
  const urgencyBuckets: UrgencyBucket[] = bucketByWindow(provableFindings);

  // The single sharpest "you found what?" finding (P1.2): the largest high-confidence
  // wedge, else the largest high-confidence finding, else the largest finding.
  const spotlightFinding = pickSpotlight(findings);
  const spotlight: SpotlightFinding | null = spotlightFinding
    ? {
        rule_id: spotlightFinding.rule_id,
        category: spotlightFinding.category,
        display_name:
          CATEGORY_DISPLAY_NAMES[spotlightFinding.category] ??
          spotlightFinding.category,
        amount_cents: spotlightFinding.amount_cents,
        amount: formatDollars(spotlightFinding.amount_cents),
        confidence: spotlightFinding.confidence,
        order_id: String(
          spotlightFinding.evidence.order_id ??
            spotlightFinding.evidence.transaction_id ??
            "N/A",
        ),
        sku: String(spotlightFinding.evidence.sku ?? "N/A"),
        evidence: spotlightFinding.evidence,
      }
    : null;

  // Top 25 by amount, each with a copy-ready dispute draft (was previously generated
  // in audit-run against the DB-returned rows, which PostgREST caps at 1000 — building
  // it here from the full in-memory set keeps top_cases and the drafts complete).
  const top25 = [...findings]
    .sort((a, b) => b.amount_cents - a.amount_cents)
    .slice(0, 25);

  // Largest case per category — the dossier math + how-to-file work from this exact row,
  // matching the web CategoryDeepDive (which reads findings[0] of an amount-desc fetch).
  const largestByCategory = new Map<string, Finding>();
  for (const f of findings) {
    const cur = largestByCategory.get(f.category);
    if (!cur || f.amount_cents > cur.amount_cents) largestByCategory.set(f.category, f);
  }

  const pdf = buildPdfView(brand_name, categories, spotlight, largestByCategory, narrative, {
    total_recoverable: formatDollars(totalCents),
    provable_cents: provableCents,
    estimated_cents: estimatedCents,
    confidence,
    provable_forward_monthly_cents: provableForwardMonthlyCents,
    recurring_monthly_cents: recurringMonthlyCents,
    provable_urgent_cents: provableUrgentCents,
  });

  const reportData: ReportData = {
    brand_name,
    generated_at: now.toISOString(),
    total_recoverable: formatDollars(totalCents),
    total_recoverable_cents: totalCents,
    urgent_recoverable: formatDollars(urgentCents),
    urgent_recoverable_cents: urgentCents,
    findings_count: findings.length,
    settlement_months: settlementMonths,
    recurring_monthly_cents: recurringMonthlyCents,
    recurring_cents: recurringCents,
    one_time_cents: totalCents - recurringCents,
    provable_cents: provableCents,
    estimated_cents: estimatedCents,
    provable_one_time_cents: provableCents - recurringCents,
    provable_urgent_cents: provableUrgentCents,
    provable_forward_cents: provableForwardCents,
    provable_forward_monthly_cents: provableForwardMonthlyCents,
    provable_confidence_cents: provableConfidenceCents,
    urgency_buckets: urgencyBuckets,
    spotlight,
    skus_affected: skusAffected,
    confidence,
    categories,
    top_cases: top25.map((f, i) => ({
      rank: i + 1,
      rule_id: f.rule_id,
      category: f.category,
      amount: formatDollars(f.amount_cents),
      amount_exact: formatDollarsExact(f.amount_cents),
      amount_cents: f.amount_cents,
      confidence: f.confidence,
      order_id: String(f.evidence.order_id ?? "N/A"),
      sku: String(f.evidence.sku ?? "N/A"),
      window_closes_on: f.window_closes_on,
      days_remaining: f.window_days_remaining,
      dispute_draft: draftDispute({
        rule_id: f.rule_id,
        category: f.category,
        amount_cents: f.amount_cents,
        confidence: f.confidence,
        evidence: f.evidence,
      }),
    })),
    narrative,
    pdf,
  };

  // Guard against a future change that lets any displayed number drift out of sync.
  if (process.env.NODE_ENV !== "production") {
    assertReportDataConsistent(reportData);
  }

  return reportData;
}
