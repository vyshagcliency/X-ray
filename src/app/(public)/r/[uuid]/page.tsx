import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/db/supabase";
import { formatDollars } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { UrgencyChart } from "@/components/report/UrgencyChart";

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

const CATEGORY_LABELS: Record<string, string> = {
  // Payout integrity (the lead wedge)
  referral_fee: "Referral Fee Overcharges",
  fba_dimension: "Size-Tier Overcharges",
  return_credit: "Credits Never Applied",
  aged_surcharge: "Aged-Stock Surcharges",
  // Reimbursement add-ons
  returns: "Customer Returns",
  lost_inventory: "Lost & Damaged Inventory",
  dimensions: "Dimension Overcharges",
  fees: "Fee Discrepancies",
  removals: "Removal Issues",
  shortages: "Inbound Shortages",
  other: "Other Findings",
};

const CATEGORY_ACCENTS: Record<string, string> = {
  returns: "border-l-blue-500",
  lost_inventory: "border-l-amber-500",
  dimensions: "border-l-violet-500",
  fees: "border-l-emerald-500",
  removals: "border-l-rose-500",
  shortages: "border-l-cyan-500",
  other: "border-l-slate-400",
};

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

  const typedAudit = audit as AuditData & { report_data?: { narrative?: { executive_summary?: string; methodology_note?: string; category_narratives?: Record<string, string> } } };
  const typedFindings = (findings ?? []) as Finding[];

  // Group findings by category
  const categories = typedFindings.reduce(
    (acc, f) => {
      if (!acc[f.category]) {
        acc[f.category] = { findings: [], totalCents: 0 };
      }
      acc[f.category].findings.push(f);
      acc[f.category].totalCents += f.amount_cents;
      return acc;
    },
    {} as Record<string, { findings: Finding[]; totalCents: number }>,
  );

  const categoryCount = Object.keys(categories).length;
  const highConfidenceCount = typedFindings.filter((f) => f.confidence === "high").length;

  // Rolling overcharges (referral %, size-tier) have no dispute deadline — the urgency
  // is that they keep accruing every month until corrected, not a closing window.
  const ROLLING_CATEGORIES = new Set(["referral_fee", "fba_dimension"]);
  const recurringCents = typedFindings
    .filter((f) => ROLLING_CATEGORIES.has(f.category))
    .reduce((s, f) => s + f.amount_cents, 0);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute -left-32 top-20 size-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-40 size-72 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute right-1/3 top-1/4 size-64 rounded-full bg-violet-500/5 blur-3xl" />

      <NavBar />

      <main className="relative mx-auto max-w-7xl px-6 py-12">
        {/* Headline section */}
        <section className="rounded-xl border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            {/* Left: hero number */}
            <div className="flex-1">
              <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Recoverable amount for {typedAudit.brand_name}
              </p>
              <p className="mt-2 font-mono text-5xl font-bold tabular-nums tracking-tight lg:text-6xl">
                {formatDollars(typedAudit.total_recoverable_cents)}
              </p>
              {typedAudit.urgent_recoverable_cents > 0 && (
                <p className="mt-3 flex items-center gap-2 text-destructive">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span className="text-sm font-medium">
                    {formatDollars(typedAudit.urgent_recoverable_cents)} has dispute windows closing within 14 days
                  </span>
                </p>
              )}
              {recurringCents > 0 && (
                <p className="mt-3 flex items-center gap-2 text-amber-600">
                  <RefreshCw className="size-4 shrink-0" />
                  <span className="text-sm font-medium">
                    {formatDollars(recurringCents)} is a recurring overcharge — it keeps accruing every month until corrected
                  </span>
                </p>
              )}
              <div className="mt-6">
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/audit/pdf?id=${uuid}`} download>
                    <Download className="mr-2 size-4" />
                    Download full PDF report
                  </a>
                </Button>
              </div>
            </div>

            {/* Right: stats grid */}
            <div className="grid w-full grid-cols-3 gap-4 lg:w-auto lg:min-w-[320px]">
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-center">
                <p className="text-2xl font-bold">{typedAudit.findings_count}</p>
                <p className="text-xs text-muted-foreground">Total cases</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-center">
                <p className="text-2xl font-bold">{categoryCount}</p>
                <p className="text-xs text-muted-foreground">
                  {categoryCount === 1 ? "Category" : "Categories"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-center">
                <p className="text-2xl font-bold">{highConfidenceCount}</p>
                <p className="text-xs text-muted-foreground">High confidence</p>
              </div>
            </div>
          </div>
        </section>

        {/* Executive summary + Urgency chart — side by side on desktop */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {typedAudit.report_data?.narrative?.executive_summary ? (
            <div className="rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-lg font-bold">Executive Summary</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {typedAudit.report_data.narrative.executive_summary}
              </p>
            </div>
          ) : (
            <div />
          )}
          <div>
            <UrgencyChart
              findings={typedFindings.map((f) => ({
                amount_cents: f.amount_cents,
                window_days_remaining: f.window_days_remaining,
              }))}
            />
          </div>
        </section>

        {/* Category cards */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(categories).map(([cat, data]) => {
            const highCount = data.findings.filter((f) => f.confidence === "high").length;
            const medCount = data.findings.filter((f) => f.confidence === "medium").length;

            return (
              <Card
                key={cat}
                className={`border-l-4 ${CATEGORY_ACCENTS[cat] ?? "border-l-slate-400"} border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatDollars(data.totalCents)}</p>
                  <p className="text-sm text-muted-foreground">
                    {data.findings.length} case{data.findings.length !== 1 ? "s" : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    {highCount > 0 && (
                      <Badge variant="default" className="text-xs">
                        {highCount} high
                      </Badge>
                    )}
                    {medCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {medCount} medium
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Top cases — table layout */}
        {typedFindings.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold">Top cases</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Identifier</th>
                    <th className="hidden px-4 py-3 sm:table-cell">SKU</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="hidden px-4 py-3 md:table-cell">Window</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {typedFindings.slice(0, 15).map((f) => {
                    const orderId = (f.evidence?.order_id ?? f.evidence?.transaction_id) as string | undefined;
                    const sku = f.evidence?.sku as string | undefined;

                    return (
                      <tr key={f.id} className="hover:bg-slate-50/50">
                        <td className="max-w-[180px] truncate px-4 py-3 font-mono text-xs" title={orderId ?? "—"}>
                          {orderId ?? "—"}
                        </td>
                        <td className="hidden max-w-[120px] truncate px-4 py-3 text-xs text-muted-foreground sm:table-cell" title={sku ?? ""}>
                          {sku ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">
                            {CATEGORY_LABELS[f.category] ?? f.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={f.confidence === "high" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {f.confidence}
                          </Badge>
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          {f.window_days_remaining !== null &&
                          f.window_days_remaining >= 0 ? (
                            <Badge
                              variant={f.window_days_remaining <= 14 ? "destructive" : "outline"}
                              className="text-xs"
                            >
                              {f.window_days_remaining}d
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                          {formatDollars(f.amount_cents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* CTA + Methodology — side by side on desktop */}
        <section className="mt-12 grid gap-6 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-primary/5 p-8 shadow-sm backdrop-blur-sm lg:col-span-3">
            <div className="flex flex-col items-center text-center">
              <ShieldCheck className="mb-3 size-8 text-primary" />
              <p className="text-lg font-semibold">
                Filing {typedAudit.findings_count} disputes is a 60-80 hour job.
              </p>
              <p className="mt-2 max-w-xl text-muted-foreground">
                We do it as a managed service — we only get paid when the money lands in your account
                (20% of recovered, no retainer, no software).
              </p>
              <Button size="lg" className="mt-6">
                Talk to us — 15 min, no pitch deck <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            {typedAudit.report_data?.narrative?.methodology_note && (
              <div className="rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Methodology
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {typedAudit.report_data.narrative.methodology_note}
                </p>
              </div>
            )}
            <div className="rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm text-center text-xs text-muted-foreground">
              <p>
                Report generated for {typedAudit.brand_name}
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
