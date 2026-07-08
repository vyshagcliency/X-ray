import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/db/supabase";
import { type SpotlightProps } from "@/components/report/Spotlight";
import { ReportShell, type ReportModel } from "@/components/report/ReportShell";
import { deriveClosingSoon } from "@/components/report/urgent-cases";
import { stripEmDashes } from "@/lib/report/text";
import { catMeta } from "@/components/report/category-meta";
import { REIMBURSEMENT_CATEGORIES } from "@/lib/pdf/data-builder";

interface Finding {
  id: string;
  rule_id: string;
  category: string;
  amount_cents: number;
  confidence: string;
  window_days_remaining: number | null;
  window_closes_on: string | null;
  narrative_summary: string | null;
  evidence: Record<string, unknown>;
}

interface AuditData {
  id: string;
  brand_name: string;
  total_recoverable_cents: number;
  urgent_recoverable_cents: number;
  findings_count: number;
  completed_at: string | null;
}

/** Per-category summary as computed once in report_data (the single source of truth). */
export interface CategorySummary {
  category: string;
  display_name: string;
  count: number;
  total_cents: number;
  urgent_count: number;
  high: number;
  medium: number;
  low: number;
  high_cents?: number;
  recurring: boolean;
  estimated: boolean;
}

interface UrgencyBucket {
  label: string;
  max_days: number;
  cents: number;
  count: number;
}

interface ReportDataShape {
  total_recoverable_cents?: number;
  urgent_recoverable_cents?: number;
  findings_count?: number;
  recurring_monthly_cents?: number | null;
  recurring_cents?: number;
  one_time_cents?: number;
  provable_cents?: number;
  estimated_cents?: number;
  provable_one_time_cents?: number;
  provable_urgent_cents?: number;
  provable_forward_cents?: number;
  provable_forward_monthly_cents?: number | null;
  provable_confidence_cents?: { high: number; medium: number; low: number };
  urgency_buckets?: UrgencyBucket[];
  spotlight?: SpotlightProps | null;
  skus_affected?: number;
  settlement_months?: number | null;
  confidence?: { high: number; medium: number; low: number };
  categories?: CategorySummary[];
  narrative?: {
    executive_summary?: string;
    methodology_note?: string;
    category_narratives?: Record<string, string>;
  };
}

const isUrgent = (f: Finding) =>
  f.window_days_remaining !== null &&
  f.window_days_remaining >= 0 &&
  f.window_days_remaining <= 14;

/** Fallback for legacy/zero-finding audits with no report_data; the fetch is complete
 * (paginated) so this reconciles with what report_data would have produced. */
function deriveCategorySummaries(
  byCategory: Record<string, Finding[]>,
): CategorySummary[] {
  return Object.entries(byCategory)
    .map(([category, fs]) => ({
      category,
      display_name: catMeta(category).label,
      count: fs.length,
      total_cents: fs.reduce((s, f) => s + f.amount_cents, 0),
      urgent_count: fs.filter(isUrgent).length,
      high: fs.filter((f) => f.confidence === "high").length,
      medium: fs.filter((f) => f.confidence === "medium").length,
      low: fs.filter((f) => f.confidence === "low").length,
      recurring: catMeta(category).recurring,
      estimated: REIMBURSEMENT_CATEGORIES.has(category),
    }))
    .sort((a, b) => {
      const ra = REIMBURSEMENT_CATEGORIES.has(a.category) ? 1 : 0;
      const rb = REIMBURSEMENT_CATEGORIES.has(b.category) ? 1 : 0;
      return ra !== rb ? ra - rb : b.total_cents - a.total_cents;
    });
}

/**
 * OG/share tags read "Settlement Truth Audit" (payout integrity), never "FBA
 * reimbursement" (P4.3) — so a report shared on LinkedIn/Slack unfurls on-message. The
 * page is `noindex`: it holds a seller's financials behind an unguessable UUID and must
 * never be search-indexed (matches the security model — report URLs are never listed).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ uuid: string }>;
}): Promise<Metadata> {
  const { uuid } = await params;
  const { data } = await supabaseAdmin()
    .from("audits")
    .select("brand_name")
    .eq("id", uuid)
    .single();
  const brand = (data as { brand_name?: string } | null)?.brand_name;
  const title = brand ? `Settlement Truth Audit — ${brand}` : "Settlement Truth Audit";
  const description = brand
    ? `A forensic audit of ${brand}'s Amazon payouts — every provable overcharge traced to a row in ${brand}'s own Seller Central data.`
    : "A forensic audit that proves, row by row, where Amazon's settlement doesn't reconcile.";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { type: "article", title, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function ReportPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const db = supabaseAdmin();

  const { data: audit } = await db
    .from("audits")
    .select("id, brand_name, total_recoverable_cents, urgent_recoverable_cents, findings_count, completed_at, status, report_data")
    .eq("id", uuid)
    .single();

  if (!audit || !["completed", "pending_review"].includes(audit.status)) {
    notFound();
  }

  const typedAudit = audit as AuditData & { status: string; report_data?: ReportDataShape };
  const rd = typedAudit.report_data;

  // Fetch the COMPLETE finding set for the evidence tables. PostgREST caps a single
  // response at 1000 rows, so paginate — otherwise the smallest-dollar categories
  // (ordered last) get dropped and a category present in report_data renders empty.
  const expected = rd?.findings_count ?? typedAudit.findings_count ?? 0;
  const typedFindings: Finding[] = [];
  const PAGE = 1000;
  while (typedFindings.length < expected) {
    const { data: page } = await db
      .from("findings")
      .select("id, rule_id, category, amount_cents, confidence, window_days_remaining, window_closes_on, narrative_summary, evidence")
      .eq("audit_id", uuid)
      .order("amount_cents", { ascending: false })
      .order("id", { ascending: true })
      .range(typedFindings.length, typedFindings.length + PAGE - 1);
    if (!page || page.length === 0) break;
    typedFindings.push(...(page as Finding[]));
  }

  const narrative = rd?.narrative;

  // Group fetched findings by category (evidence tables only). All summary numbers
  // below come from report_data — the page never re-aggregates them (D2).
  const byCategory = typedFindings.reduce(
    (acc, f) => {
      (acc[f.category] ??= []).push(f);
      return acc;
    },
    {} as Record<string, Finding[]>,
  );

  const categorySummaries: CategorySummary[] =
    rd?.categories ?? deriveCategorySummaries(byCategory);

  const total = rd?.total_recoverable_cents ?? typedAudit.total_recoverable_cents;
  // Hero urgency counts provable findings only (D5) — estimated tier windows show in
  // their own fenced table, never in the headline.
  const urgentCents =
    rd?.provable_urgent_cents ??
    rd?.urgent_recoverable_cents ??
    typedAudit.urgent_recoverable_cents;
  const findingsCount = rd?.findings_count ?? typedAudit.findings_count;
  // The hero and the traceability promise describe the PROVABLE figure (real per-row
  // amounts). The flat-$15 estimated tier is fenced below and excluded here (D3).
  const provableCategories = categorySummaries.filter((c) => !c.estimated);
  const estimatedCategories = categorySummaries.filter((c) => c.estimated);
  const estimatedCents =
    rd?.estimated_cents ??
    estimatedCategories.reduce((s, c) => s + c.total_cents, 0);
  const provable = rd?.provable_cents ?? total - estimatedCents;
  const conf = rd?.confidence ?? {
    high: typedFindings.filter((f) => f.confidence === "high").length,
    medium: typedFindings.filter((f) => f.confidence === "medium").length,
    low: typedFindings.filter((f) => f.confidence === "low").length,
  };
  const skusAffected =
    rd?.skus_affected ??
    new Set(typedFindings.map((f) => f.evidence?.sku).filter(Boolean) as string[]).size;
  const recurringCents =
    rd?.recurring_cents ??
    categorySummaries.filter((c) => c.recurring).reduce((s, c) => s + c.total_cents, 0);
  // "Recoverable now" is the provable, non-recurring figure — estimated tier excluded.
  const provableOneTime = rd?.provable_one_time_cents ?? provable - recurringCents;
  const categoryCount = categorySummaries.length;

  // Charts show the provable breakdown so they reconcile with the hero.
  const chartCategories = provableCategories.map((c) => ({
    key: c.category,
    label: catMeta(c.category).label,
    total: c.total_cents,
    color: catMeta(c.category).color,
  }));

  // The hero is the high-confidence forward run-rate (P1.1). Falls back to null on
  // legacy audits with no report_data — the page then leads with the provable figure.
  const forwardMonthly = rd?.provable_forward_monthly_cents ?? null;
  const spotlight = rd?.spotlight ?? null;
  const urgencyBuckets = rd?.urgency_buckets ?? [];
  // Provable dollars by confidence — for the confidence×dollars chart (P1.6).
  const provableConfidenceCents = rd?.provable_confidence_cents ?? {
    high: provableCategories.reduce((s, c) => s + (c.high_cents ?? 0), 0),
    medium: 0,
    low: 0,
  };

  const stats = [
    { value: findingsCount.toLocaleString(), label: "Findings" },
    { value: String(categoryCount), label: categoryCount === 1 ? "Category" : "Categories" },
    { value: skusAffected.toLocaleString(), label: "SKUs affected" },
    { value: String(conf.high), label: "High confidence" },
  ];

  const brand = typedAudit.brand_name;
  const caseId = uuid.slice(0, 8).toUpperCase();

  const estimatedCatKeys = new Set(estimatedCategories.map((c) => c.category));
  const categoryRows = categorySummaries.map((c) => ({
    category: c.category,
    label: catMeta(c.category).label,
    color: catMeta(c.category).color,
    recurring: catMeta(c.category).recurring,
    estimated: c.estimated,
    totalCents: c.total_cents,
    count: c.count,
    urgentCount: c.urgent_count ?? 0,
    high: c.high,
    medium: c.medium,
    low: c.low,
  }));
  const catLabelMap = Object.fromEntries(
    categorySummaries.map((c) => [c.category, catMeta(c.category).label]),
  );
  const closingSoon = deriveClosingSoon(typedFindings, estimatedCatKeys, 14);

  const model: ReportModel = {
    brand,
    caseId,
    uuid,
    completedLabel: typedAudit.completed_at
      ? new Date(typedAudit.completed_at).toLocaleDateString()
      : null,
    forwardMonthlyCents: forwardMonthly,
    provableCents: provable,
    provableOneTimeCents: provableOneTime,
    urgentCents,
    totalCents: total,
    estimatedCents,
    categoryCount,
    conf,
    stats,
    spotlight,
    chartCategories,
    provableConfidenceCents,
    urgencyBuckets,
    execSummary: narrative?.executive_summary
      ? stripEmDashes(narrative.executive_summary)
      : undefined,
    methodologyNote: narrative?.methodology_note
      ? stripEmDashes(narrative.methodology_note)
      : undefined,
    categoryRows,
    findingsByCategory: byCategory,
    categoryNarratives: narrative?.category_narratives
      ? Object.fromEntries(
          Object.entries(narrative.category_narratives).map(([k, v]) => [
            k,
            stripEmDashes(v),
          ]),
        )
      : undefined,
    closingSoon,
    catLabelMap,
  };

  return <ReportShell model={model} />;
}
