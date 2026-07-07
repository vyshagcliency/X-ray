import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/db/supabase";
import { formatDollars } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Download,
  Table2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileSearch,
  Calculator,
  ScanLine,
  Gauge,
} from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { ForensicVisuals } from "@/components/report/ForensicVisuals";
import { Spotlight, type SpotlightProps } from "@/components/report/Spotlight";
import { CategoryDeepDive } from "@/components/report/CategoryDeepDive";
import { ReportNav, type NavSection } from "@/components/report/ReportNav";
import { ReportDock } from "@/components/report/ReportDock";
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

/** Numbered section header, set on the slate "desk" above the white document panels —
 * the numbering encodes the report's real reading sequence, not decoration. */
function SectionHeader({
  index,
  title,
  subtitle,
}: {
  index: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="shrink-0 font-mono text-xs tabular-nums text-slate-400">{index}</span>
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
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
  const confTotal = Math.max(conf.high + conf.medium + conf.low, 1);
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
  const hasEstimated = estimatedCategories.length > 0;
  const methodIndex = hasEstimated ? "05" : "04";

  // The left ledger rail's model — one entry per section, categories nested as submenus.
  // Anchor ids match the section/dossier ids below so scroll-spy lights the right row.
  const navSections: NavSection[] = [
    { id: "overview", index: "01", label: "Overview" },
    { id: "map", index: "02", label: "Where the money is" },
    {
      id: "findings",
      index: "03",
      label: "The findings",
      children: provableCategories.map((c) => ({
        id: `cat-${c.category}`,
        label: catMeta(c.category).label,
        amount: formatDollars(c.total_cents),
        color: catMeta(c.category).color,
      })),
    },
    ...(hasEstimated
      ? [
          {
            id: "estimated",
            index: "04",
            label: "Estimated",
            children: estimatedCategories.map((c) => ({
              id: `cat-${c.category}`,
              label: catMeta(c.category).label,
              amount: formatDollars(c.total_cents),
              color: catMeta(c.category).color,
            })),
          } as NavSection,
        ]
      : []),
    { id: "method", index: methodIndex, label: "How we found this" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-700">
      <NavBar />

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 xl:grid xl:grid-cols-[15rem_minmax(0,1fr)_17rem] xl:gap-x-8">
        <ReportNav sections={navSections} caseId={caseId} brand={brand} />

        <main className="mx-auto min-w-0 max-w-4xl xl:max-w-none">
          {/* 01 — Overview: the hero claim, the sharpest finding, why to trust it */}
          <section id="overview" className="scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-9">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                <span>Settlement Truth Audit</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500">{brand}</span>
                <span className="text-slate-300">·</span>
                <span className="font-mono normal-case tracking-normal">{caseId}</span>
              </div>

              {forwardMonthly !== null && forwardMonthly > 0 ? (
                <>
                  <p className="mt-4 font-mono text-5xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-6xl">
                    {formatDollars(forwardMonthly)}
                    <span className="ml-1 align-baseline text-2xl font-medium text-slate-400">
                      /mo
                    </span>
                  </p>
                  <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">
                    Amazon is overbilling {brand} about{" "}
                    <span className="font-semibold text-slate-900">
                      {formatDollars(forwardMonthly)} every month
                    </span>{" "}
                    in high-confidence, provable overcharges — and it compounds until the
                    wrong referral category and size-tier are corrected.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-4 font-mono text-5xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-6xl">
                    {formatDollars(provable)}
                  </p>
                  <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">
                    Provable overcharges and missing credits we found in {brand}&apos;s own
                    Seller Central data — every figure below traces to a specific row.
                  </p>
                </>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {provableOneTime > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    <FileSearch className="size-3.5 stroke-[1.5]" />
                    {formatDollars(provableOneTime)} recoverable now (one-time)
                  </span>
                )}
                {urgentCents > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    <AlertTriangle className="size-3.5 stroke-[1.5]" />
                    {formatDollars(urgentCents)} closing within 14 days
                  </span>
                )}
              </div>

              <p className="mt-5 max-w-2xl text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{formatDollars(total)}</span>{" "}
                surfaced in total across {categoryCount}{" "}
                {categoryCount === 1 ? "category" : "categories"} — {formatDollars(provable)}{" "}
                provable
                {estimatedCents > 0 && <>, {formatDollars(estimatedCents)} estimated</>} ·{" "}
                {conf.high} high · {conf.medium} medium confidence. Full forensic detail
                below.
              </p>
              {estimatedCents > 0 && (
                <p className="mt-2 max-w-2xl text-xs text-slate-400">
                  The estimated figure is a flat per-item placeholder for reimbursement
                  buckets, fenced below and <span className="font-medium">not</span> counted
                  in the provable number — Amazon may have already auto-reimbursed some.
                </p>
              )}

              {/* Actions live in the sticky dock on wide screens; shown inline below it. */}
              <div className="mt-6 flex flex-wrap items-center gap-3 xl:hidden">
                <Button asChild size="sm">
                  <a
                    href="https://calendly.com/vyshag-baslix/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Talk to us: 15 minutes, no pitch <ArrowRight className="ml-1.5 size-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/audit/pdf?id=${uuid}`} download>
                    <Download className="mr-2 size-4" />
                    Download PDF
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/audit/csv?id=${uuid}`} download>
                    <Table2 className="mr-2 size-4" />
                    Export CSV
                  </a>
                </Button>
              </div>

              {/* KPI strip + confidence bar, ruled off the claim above */}
              <div className="mt-7 grid gap-6 border-t border-slate-100 pt-6 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-10">
                <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                  {stats.map((s) => (
                    <div key={s.label}>
                      <dt className="text-[11px] uppercase tracking-wider text-slate-400">
                        {s.label}
                      </dt>
                      <dd className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-slate-900">
                        {s.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="sm:w-52">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">
                    Evidence confidence
                  </p>
                  <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="bg-blue-600" style={{ width: `${(conf.high / confTotal) * 100}%` }} />
                    <div className="bg-amber-400" style={{ width: `${(conf.medium / confTotal) * 100}%` }} />
                    <div className="bg-slate-300" style={{ width: `${(conf.low / confTotal) * 100}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
                    <span>{conf.high} high</span>
                    <span>{conf.medium} medium</span>
                    <span>{conf.low} review</span>
                  </div>
                </div>
              </div>
            </div>

            {/* The single sharpest finding — undeniable in 30 seconds */}
            {spotlight && (
              <div className="mt-6">
                <Spotlight {...spotlight} />
              </div>
            )}

            {/* Trust strip: disarm the verifier before they doubt */}
            <div className="mt-6 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:grid-cols-3 sm:divide-x sm:divide-slate-100">
              <div className="p-5">
                <div className="flex items-center gap-2 text-slate-800">
                  <Calculator className="size-4 stroke-[1.5]" />
                  <p className="text-sm font-semibold">Recomputed, not guessed</p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  We recompute what Amazon should have charged or credited on each sale and
                  match it against what it actually did — using only your own reports.
                </p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-slate-800">
                  <ScanLine className="size-4 stroke-[1.5]" />
                  <p className="text-sm font-semibold">Every figure traces to a row</p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  Each provable dollar carries the source order, SKU and date from your
                  Seller Central data — defensible line by line, in the PDF and CSV.
                </p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-slate-800">
                  <Gauge className="size-4 stroke-[1.5]" />
                  <p className="text-sm font-semibold">Honest confidence</p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  <span className="font-medium">High</span> = direct, unambiguous match ·{" "}
                  <span className="font-medium">medium</span> = strong signal, legitimate
                  exception possible · <span className="font-medium">review</span> = human
                  look before filing.
                </p>
              </div>
            </div>

            {/* Executive summary — an editorial passage, not another boxed card */}
            {narrative?.executive_summary && (
              <div className="mt-8 border-l-2 border-slate-900 pl-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Executive summary
                </p>
                <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-700">
                  {narrative.executive_summary}
                </p>
              </div>
            )}
          </section>

          {/* 02 — Where the money is: the forensic visual system */}
          <section id="map" className="mt-14 scroll-mt-24 border-t border-slate-200 pt-10">
            <SectionHeader
              index="02"
              title="Where the money is"
              subtitle="The same evidence seen by category, by confidence, and by the clock."
            />
            <ForensicVisuals
              categories={chartCategories}
              confidenceCents={provableConfidenceCents}
              urgencyBuckets={urgencyBuckets}
              forwardMonthlyCents={forwardMonthly}
            />
          </section>

          {/* 03 — The findings: per-category dossiers (real per-row amounts) */}
          <section id="findings" className="mt-14 scroll-mt-24 border-t border-slate-200 pt-10">
            <SectionHeader
              index="03"
              title="The findings, in detail"
              subtitle="Each category, how it happens, and the evidence behind every dollar."
            />
            <div className="mt-6 space-y-6">
              {provableCategories.map((c) => (
                <div key={c.category} id={`cat-${c.category}`} className="scroll-mt-24">
                  <CategoryDeepDive
                    categoryKey={c.category}
                    summary={c}
                    findings={byCategory[c.category] ?? []}
                    narrative={narrative?.category_narratives?.[c.category]}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* 04 — Estimated tier: fenced, excluded from the provable total above (D3) */}
          {hasEstimated && (
            <section id="estimated" className="mt-14 scroll-mt-24 border-t border-slate-200 pt-10">
              <SectionHeader
                index="04"
                title="Estimated — needs confirmation"
                subtitle="Flat per-item placeholders, not row-level amounts — confirmed before filing."
              />
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-500">
                These reimbursement buckets are flagged from your reports but valued at a
                flat per-item estimate, not a row-level amount — so they are{" "}
                <span className="font-medium text-slate-700">
                  not counted in the {formatDollars(provable)} above
                </span>
                . Amazon&apos;s 2024–25 auto-reimbursement may already have covered some. We
                confirm the real per-item value before filing.
              </p>
              <div className="mt-6 space-y-6 rounded-2xl border border-dashed border-slate-300 bg-white/50 p-4 sm:p-5">
                {estimatedCategories.map((c) => (
                  <div key={c.category} id={`cat-${c.category}`} className="scroll-mt-24">
                    <CategoryDeepDive
                      categoryKey={c.category}
                      summary={c}
                      findings={byCategory[c.category] ?? []}
                      narrative={narrative?.category_narratives?.[c.category]}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 05 — How we found this, then the close */}
          <section id="method" className="mt-14 scroll-mt-24 border-t border-slate-200 pt-10">
            <SectionHeader
              index={methodIndex}
              title="How we found this"
              subtitle="The method behind every figure — and what to do next."
            />
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-7">
              <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
                {narrative?.methodology_note ??
                  "Each finding recomputes what Amazon should have charged or credited and matches it against what it actually did, using only your own Seller Central reports."}
              </p>
              <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
                Generated for {brand}
                {typedAudit.completed_at &&
                  ` on ${new Date(typedAudit.completed_at).toLocaleDateString()}`}{" "}
                · Case ID {caseId}
              </p>
            </div>

            {/* The close — the one ask, in ink. No modal, no popup. */}
            <div className="mt-6 overflow-hidden rounded-2xl bg-slate-900 px-8 py-10 text-center text-white sm:px-10 sm:py-12">
              <ShieldCheck className="mx-auto mb-4 size-7 stroke-[1.5] text-white/70" />
              <p className="text-lg font-semibold">Every finding above is yours to file, free.</p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                The report is the easy part. What needs our hands is what recurs:{" "}
                {forwardMonthly !== null && forwardMonthly > 0 ? (
                  <>
                    the{" "}
                    <span className="font-semibold text-white">
                      {formatDollars(forwardMonthly)}/mo
                    </span>{" "}
                    overcharge that keeps compounding until the root cause is fixed
                  </>
                ) : (
                  <>the overcharge that keeps compounding until the root cause is fixed</>
                )}
                , the same leakage across every channel you sell on, and the backward claims
                that need direct access to your account to chase down.
              </p>
              <Button size="lg" variant="secondary" className="mt-6" asChild>
                <a
                  href="https://calendly.com/vyshag-baslix/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Talk to us: 15 minutes, no pitch deck <ArrowRight className="ml-2 size-4" />
                </a>
              </Button>
            </div>
          </section>
        </main>

        <ReportDock
          uuid={uuid}
          recoverableNowCents={provableOneTime}
          urgentCents={urgentCents}
          forwardMonthlyCents={forwardMonthly}
        />
      </div>
    </div>
  );
}
