import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/db/supabase";
import { formatDollars } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle, ArrowRight } from "lucide-react";
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
  returns: "Customer Returns",
  lost_inventory: "Lost & Damaged Inventory",
  dimensions: "Dimension Overcharges",
  fees: "Fee Discrepancies",
  removals: "Removal Issues",
  shortages: "Inbound Shortages",
  other: "Other Findings",
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

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      {/* Headline strip */}
      <section className="rounded-lg border bg-card p-8">
        <h1 className="text-3xl font-bold">
          We found {formatDollars(typedAudit.total_recoverable_cents)} Amazon owes{" "}
          {typedAudit.brand_name}.
        </h1>
        {typedAudit.urgent_recoverable_cents > 0 && (
          <p className="mt-2 flex items-center gap-2 text-lg text-destructive">
            <AlertTriangle className="size-5" />
            {formatDollars(typedAudit.urgent_recoverable_cents)} has dispute windows closing in the
            next 14 days.
          </p>
        )}
        <p className="mt-2 text-muted-foreground">
          {typedAudit.findings_count} recoverable cases across{" "}
          {Object.keys(categories).length} categories.
        </p>

        <div className="mt-4">
          <Button asChild variant="outline">
            <a href={`/api/audit/pdf?id=${uuid}`} target="_blank" rel="noopener">
              <Download className="mr-2 size-4" />
              Download full PDF report
            </a>
          </Button>
        </div>
      </section>

      {/* Executive summary */}
      {typedAudit.report_data?.narrative?.executive_summary && (
        <section className="mt-8 rounded-lg border bg-card p-6">
          <h2 className="text-lg font-bold">Executive Summary</h2>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            {typedAudit.report_data.narrative.executive_summary}
          </p>
        </section>
      )}

      {/* Urgency timeline */}
      <UrgencyChart
        findings={typedFindings.map((f) => ({
          amount_cents: f.amount_cents,
          window_days_remaining: f.window_days_remaining,
        }))}
      />

      {/* Category cards */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {Object.entries(categories).map(([cat, data]) => (
          <Card key={cat}>
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
              <div className="mt-2 flex gap-1">
                {data.findings.filter((f) => f.confidence === "high").length > 0 && (
                  <Badge variant="default">
                    {data.findings.filter((f) => f.confidence === "high").length} high confidence
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Top cases */}
      {typedFindings.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">Top cases</h2>
          <div className="mt-4 divide-y rounded-lg border">
            {typedFindings.slice(0, 10).map((f) => (
              <div key={f.id} className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{CATEGORY_LABELS[f.category] ?? f.category}</Badge>
                    <Badge
                      variant={f.confidence === "high" ? "default" : "secondary"}
                    >
                      {f.confidence}
                    </Badge>
                    {f.window_days_remaining !== null &&
                      f.window_days_remaining >= 0 &&
                      f.window_days_remaining <= 14 && (
                        <Badge variant="destructive">
                          {f.window_days_remaining}d left
                        </Badge>
                      )}
                  </div>
                  {f.narrative_summary && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {f.narrative_summary}
                    </p>
                  )}
                </div>
                <p className="ml-4 text-lg font-bold">{formatDollars(f.amount_cents)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Methodology */}
      {typedAudit.report_data?.narrative?.methodology_note && (
        <section className="mt-8 rounded-lg border bg-card p-6">
          <h2 className="text-lg font-bold">Methodology</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {typedAudit.report_data.narrative.methodology_note}
          </p>
        </section>
      )}

      {/* CTA */}
      <section className="mt-12 rounded-lg border bg-muted/50 p-8 text-center">
        <p className="text-lg">
          Filing {typedAudit.findings_count} disputes is a 60-80 hour job.
        </p>
        <p className="mt-2 text-muted-foreground">
          We do it as a managed service — we only get paid when the money lands in your account
          (20% of recovered, no retainer, no software).
        </p>
        <Button size="lg" className="mt-6">
          Talk to us — 15 min, no pitch deck <ArrowRight className="ml-2 size-4" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
        <p>
          Report generated for {typedAudit.brand_name}
          {typedAudit.completed_at &&
            ` on ${new Date(typedAudit.completed_at).toLocaleDateString()}`}
        </p>
        <p className="mt-1">Case ID: {uuid.slice(0, 8).toUpperCase()}</p>
      </footer>
    </main>
  );
}
