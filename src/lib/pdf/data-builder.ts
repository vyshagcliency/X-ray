/**
 * Transforms raw findings + narrative into the structured JSON that is the SINGLE
 * source of truth for every number on the report (web page + PDF). It is built once,
 * from the complete inserted finding set, and both surfaces render from it — nothing
 * downstream re-aggregates findings for headline / confidence / category numbers (D2).
 */

import { formatDollars, formatDollarsExact } from "@/lib/format";
import { ROLLING_CATEGORIES, type NarrativeOutput } from "@/lib/llm/narrate";
import { draftDispute, type DisputeDraft } from "@/lib/llm/draft-dispute";

interface Finding {
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

const URGENCY_BANDS: Array<{ label: string; max_days: number }> = [
  { label: "≤ 7 days", max_days: 7 },
  { label: "8–14 days", max_days: 14 },
  { label: "15–30 days", max_days: 30 },
  { label: "31–60 days", max_days: 60 },
];

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
}

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  // Payout integrity (the lead wedge)
  referral_fee: "Referral Fee Overcharges",
  fba_dimension: "Size-Tier Overcharges",
  return_credit: "Credits Never Applied",
  aged_surcharge: "Aged-Stock Surcharges",
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
  // Hero urgency counts provable findings only — the estimated tier is fenced (D5).
  const provableUrgentCents = findings
    .filter((f) => isUrgent(f) && !REIMBURSEMENT_CATEGORIES.has(f.category))
    .reduce((s, f) => s + f.amount_cents, 0);

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

  // The hero (P1.1): the HIGH-confidence rolling overcharge, as a monthly run-rate.
  // Rolling = referral/size-tier (no dispute window, recurs until fixed). Filtering to
  // high-confidence keeps the headline undeniable (asymmetric-safety); a medium rolling
  // finding still shows in its category card, just not in the hero number.
  const provableForwardCents = findings
    .filter((f) => ROLLING_CATEGORIES.has(f.category) && f.confidence === "high")
    .reduce((s, f) => s + f.amount_cents, 0);
  const provableForwardMonthlyCents =
    settlementMonths && settlementMonths > 0
      ? Math.round(provableForwardCents / settlementMonths)
      : null;

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
  const urgencyBuckets: UrgencyBucket[] = URGENCY_BANDS.map((band, i) => {
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
  };

  // Guard against a future change that lets any displayed number drift out of sync.
  if (process.env.NODE_ENV !== "production") {
    assertReportDataConsistent(reportData);
  }

  return reportData;
}
