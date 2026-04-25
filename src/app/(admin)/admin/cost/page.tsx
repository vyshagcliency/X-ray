export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/db/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDollars } from "@/lib/format";
import Link from "next/link";

export const metadata = {
  robots: "noindex, nofollow",
};

export default async function CostPage() {
  const db = supabaseAdmin();

  // Get all cost events
  const { data: costEvents } = await db
    .from("cost_events")
    .select("audit_id, component, amount_cents, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  // Aggregate per audit
  const auditCosts = new Map<string, number>();
  const componentTotals = new Map<string, number>();

  for (const event of costEvents ?? []) {
    const current = auditCosts.get(event.audit_id) ?? 0;
    auditCosts.set(event.audit_id, current + event.amount_cents);

    const compTotal = componentTotals.get(event.component) ?? 0;
    componentTotals.set(event.component, compTotal + event.amount_cents);
  }

  const totalSpend = Array.from(auditCosts.values()).reduce(
    (sum, c) => sum + c,
    0,
  );
  const auditCount = auditCosts.size;
  const avgCostPerAudit = auditCount > 0 ? Math.round(totalSpend / auditCount) : 0;

  // Find audits over $50
  const flaggedAudits = Array.from(auditCosts.entries())
    .filter(([, cost]) => cost >= 5000)
    .sort(([, a], [, b]) => b - a);

  // Get brand names for flagged audits
  let flaggedDetails: Array<{ id: string; brand_name: string; cost: number }> = [];
  if (flaggedAudits.length > 0) {
    const { data: brands } = await db
      .from("audits")
      .select("id, brand_name")
      .in("id", flaggedAudits.map(([id]) => id));

    flaggedDetails = flaggedAudits.map(([id, cost]) => ({
      id,
      brand_name: brands?.find((b) => b.id === id)?.brand_name ?? "Unknown",
      cost,
    }));
  }

  // 7-day rolling average
  // eslint-disable-next-line react-hooks/purity -- server component, runs once per request
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentEvents = (costEvents ?? []).filter(
    (e) => e.created_at >= sevenDaysAgo,
  );
  const recentAuditCosts = new Map<string, number>();
  for (const e of recentEvents) {
    const current = recentAuditCosts.get(e.audit_id) ?? 0;
    recentAuditCosts.set(e.audit_id, current + e.amount_cents);
  }
  const recentCount = recentAuditCosts.size;
  const recentTotal = Array.from(recentAuditCosts.values()).reduce(
    (s, c) => s + c,
    0,
  );
  const rollingAvg = recentCount > 0 ? Math.round(recentTotal / recentCount) : 0;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cost Tracking</h1>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Dashboard
        </Link>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatDollars(totalSpend)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Avg / Audit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatDollars(avgCostPerAudit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              7-Day Rolling Avg
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatDollars(rollingAvg)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Audits Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{auditCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Component breakdown */}
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4">Cost by Component</h2>
        <div className="rounded-lg border divide-y">
          {Array.from(componentTotals.entries())
            .sort(([, a], [, b]) => b - a)
            .map(([component, total]) => (
              <div
                key={component}
                className="flex items-center justify-between p-3"
              >
                <span className="text-sm font-medium">{component}</span>
                <span className="font-mono">{formatDollars(total)}</span>
              </div>
            ))}
          {componentTotals.size === 0 && (
            <p className="p-4 text-center text-muted-foreground">
              No cost data yet
            </p>
          )}
        </div>
      </section>

      {/* Flagged audits (over $50) */}
      <section>
        <h2 className="text-lg font-bold mb-4">
          Flagged Audits (&gt;$50)
          {flaggedDetails.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {flaggedDetails.length}
            </Badge>
          )}
        </h2>
        <div className="rounded-lg border divide-y">
          {flaggedDetails.map((a) => (
            <Link
              key={a.id}
              href={`/admin/audits/${a.id}`}
              className="flex items-center justify-between p-3 hover:bg-muted/50"
            >
              <span className="text-sm font-medium">{a.brand_name}</span>
              <span className="font-mono text-destructive">
                {formatDollars(a.cost)}
              </span>
            </Link>
          ))}
          {flaggedDetails.length === 0 && (
            <p className="p-4 text-center text-muted-foreground">
              No audits over $50
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
