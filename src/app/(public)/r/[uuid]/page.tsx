import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/db/supabase";
import { formatDollars } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Download,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FileSearch,
} from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { RecoveryVisuals } from "@/components/report/RecoveryVisuals";
import { CategoryDeepDive } from "@/components/report/CategoryDeepDive";
import { catMeta } from "@/components/report/category-meta";

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

// Reimbursement add-ons sort after the payout-integrity wedge categories.
const REIMBURSEMENT = new Set(["returns", "lost_inventory"]);

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

  const { data: findings } = await db
    .from("findings")
    .select("id, rule_id, category, amount_cents, confidence, window_days_remaining, window_closes_on, narrative_summary, evidence")
    .eq("audit_id", uuid)
    .order("amount_cents", { ascending: false });

  const typedAudit = audit as AuditData & {
    report_data?: {
      narrative?: {
        executive_summary?: string;
        methodology_note?: string;
        category_narratives?: Record<string, string>;
      };
    };
  };
  const typedFindings = (findings ?? []) as Finding[];
  const narrative = typedAudit.report_data?.narrative;

  // Group findings by category.
  const categories = typedFindings.reduce(
    (acc, f) => {
      (acc[f.category] ??= { findings: [], totalCents: 0 });
      acc[f.category].findings.push(f);
      acc[f.category].totalCents += f.amount_cents;
      return acc;
    },
    {} as Record<string, { findings: Finding[]; totalCents: number }>,
  );

  // Order: payout-integrity wedge first, reimbursement add-ons last; $ desc within.
  const ordered = Object.entries(categories).sort((a, b) => {
    const ra = REIMBURSEMENT.has(a[0]) ? 1 : 0;
    const rb = REIMBURSEMENT.has(b[0]) ? 1 : 0;
    return ra !== rb ? ra - rb : b[1].totalCents - a[1].totalCents;
  });

  const categoryCount = ordered.length;
  const high = typedFindings.filter((f) => f.confidence === "high").length;
  const medium = typedFindings.filter((f) => f.confidence === "medium").length;
  const low = typedFindings.filter((f) => f.confidence === "low").length;
  const confTotal = Math.max(high + medium + low, 1);
  const skusAffected = new Set(
    typedFindings.map((f) => f.evidence?.sku).filter(Boolean) as string[],
  ).size;

  const recurringCents = typedFindings
    .filter((f) => catMeta(f.category).recurring)
    .reduce((s, f) => s + f.amount_cents, 0);
  const oneTimeCents = typedAudit.total_recoverable_cents - recurringCents;

  const chartCategories = ordered.map(([key, data]) => ({
    key,
    label: catMeta(key).label,
    total: data.totalCents,
    color: catMeta(key).color,
  }));

  const stats = [
    { value: typedAudit.findings_count.toLocaleString(), label: "Findings" },
    { value: String(categoryCount), label: categoryCount === 1 ? "Category" : "Categories" },
    { value: skusAffected.toLocaleString(), label: "SKUs affected" },
    { value: String(high), label: "High confidence" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="pointer-events-none absolute -left-32 top-20 size-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-40 size-72 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute right-1/3 top-1/4 size-64 rounded-full bg-violet-500/5 blur-3xl" />

      <NavBar />

      <main className="relative mx-auto max-w-7xl px-6 py-12">
        {/* Hero */}
        <section className="rounded-xl border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Recoverable for {typedAudit.brand_name}
              </p>
              <p className="mt-2 font-mono text-5xl font-bold tabular-nums tracking-tight lg:text-6xl">
                {formatDollars(typedAudit.total_recoverable_cents)}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {oneTimeCents > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    <FileSearch className="size-3.5" />
                    {formatDollars(oneTimeCents)} recoverable now
                  </span>
                )}
                {recurringCents > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    <RefreshCw className="size-3.5" />
                    {formatDollars(recurringCents)} bleeding every month until fixed
                  </span>
                )}
                {typedAudit.urgent_recoverable_cents > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                    <AlertTriangle className="size-3.5" />
                    {formatDollars(typedAudit.urgent_recoverable_cents)} window closing in 14d
                  </span>
                )}
              </div>

              <p className="mt-5 max-w-xl text-sm text-muted-foreground">
                Every figure below traces to a specific row in your own Seller Central
                reports, defensible line by line.
              </p>

              <div className="mt-6">
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/audit/pdf?id=${uuid}`} download>
                    <Download className="mr-2 size-4" />
                    Download full PDF report
                  </a>
                </Button>
              </div>
            </div>

            {/* Right: KPI tiles + confidence bar */}
            <div className="w-full lg:w-auto lg:min-w-[300px]">
              <div className="grid grid-cols-2 gap-3">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-center"
                  >
                    <p className="font-mono text-2xl font-bold tabular-nums">{s.value}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground">Evidence confidence</p>
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="bg-blue-600" style={{ width: `${(high / confTotal) * 100}%` }} />
                  <div className="bg-amber-400" style={{ width: `${(medium / confTotal) * 100}%` }} />
                  <div className="bg-slate-300" style={{ width: `${(low / confTotal) * 100}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>{high} high</span>
                  <span>{medium} medium</span>
                  <span>{low} review</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Executive summary */}
        {narrative?.executive_summary && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Executive summary
            </h2>
            <p className="mt-2 max-w-4xl leading-relaxed text-foreground/90">
              {narrative.executive_summary}
            </p>
          </section>
        )}

        {/* Charts */}
        <RecoveryVisuals
          categories={chartCategories}
          recurringCents={recurringCents}
          oneTimeCents={oneTimeCents}
        />

        {/* Per-category deep dives */}
        <section className="mt-10">
          <h2 className="text-xl font-bold">The findings, in detail</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each category, how it happens, and the evidence behind every dollar.
          </p>
          <div className="mt-4 space-y-6">
            {ordered.map(([key, data]) => (
              <CategoryDeepDive
                key={key}
                categoryKey={key}
                findings={data.findings}
                narrative={narrative?.category_narratives?.[key]}
              />
            ))}
          </div>
        </section>

        {/* CTA + Methodology */}
        <section className="mt-12 grid gap-6 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-primary/5 p-8 shadow-sm backdrop-blur-sm lg:col-span-3">
            <div className="flex flex-col items-center text-center">
              <ShieldCheck className="mb-3 size-8 text-primary" />
              <p className="text-lg font-semibold">
                Every finding above is yours to file, free.
              </p>
              <p className="mt-2 max-w-xl text-muted-foreground">
                What we run as a service is catching next month&apos;s overcharge before it
                compounds, across every channel you sell on, plus the backward claims that
                need direct access to your data to chase down.
              </p>
              <Button size="lg" className="mt-6" asChild>
                <a
                  href="https://calendly.com/vyshag-baslix/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Talk to us: 15 minutes, no pitch deck <ArrowRight className="ml-2 size-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                How we found this
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {narrative?.methodology_note ??
                  "Each finding recomputes what Amazon should have charged or credited and matches it against what it actually did, using only your own Seller Central reports."}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Confidence reflects evidence strength: <strong>high</strong> = direct,
                unambiguous match; <strong>medium</strong> = strong signal with a
                legitimate-exception possibility; <strong>review</strong> = flagged for a
                human look before filing.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/80 p-6 text-center text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
              <p>
                Generated for {typedAudit.brand_name}
                {typedAudit.completed_at &&
                  ` on ${new Date(typedAudit.completed_at).toLocaleDateString()}`}
              </p>
              <p className="mt-1">Case ID: {uuid.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
