export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/db/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDollars } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteAuditButton } from "@/components/admin/DeleteAuditButton";

export const metadata = {
  robots: "noindex, nofollow",
};

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: audit } = await db
    .from("audits")
    .select("*")
    .eq("id", id)
    .single();

  if (!audit) notFound();

  // Get findings
  const { data: findings } = await db
    .from("findings")
    .select("id, rule_id, rule_version, category, amount_cents, confidence, window_closes_on, window_days_remaining")
    .eq("audit_id", id)
    .order("amount_cents", { ascending: false });

  // Get events timeline
  const { data: events } = await db
    .from("audit_events")
    .select("stage, status, metadata, created_at")
    .eq("audit_id", id)
    .order("created_at", { ascending: true });

  // Get raw uploads
  const { data: uploads } = await db
    .from("raw_uploads")
    .select("report_type, storage_key, size_bytes, purged_at, created_at")
    .eq("audit_id", id);

  // Get cost events
  const { data: costEvents } = await db
    .from("cost_events")
    .select("component, amount_cents, created_at")
    .eq("audit_id", id);

  const totalCost = (costEvents ?? []).reduce(
    (sum, c) => sum + (c.amount_cents ?? 0),
    0,
  );

  // Check for deletion request
  const { data: deletionReqs } = await db
    .from("deletion_requests")
    .select("id, status, created_at")
    .eq("audit_id", id);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/admin/audits"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; All Audits
          </Link>
          <h1 className="text-2xl font-bold mt-2">{audit.brand_name}</h1>
          <p className="text-sm text-muted-foreground">{audit.email}</p>
        </div>
        <div className="text-right">
          <Badge
            variant={
              audit.status === "completed"
                ? "default"
                : audit.status === "pending_review"
                  ? "secondary"
                  : audit.status === "failed"
                    ? "destructive"
                    : "outline"
            }
          >
            {audit.status}
          </Badge>
          {audit.status === "pending_review" && (
            <div className="mt-2">
              <Link
                href={`/admin/review/${id}`}
                className="text-sm text-blue-400 hover:underline"
              >
                Review &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Recoverable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {formatDollars(audit.total_recoverable_cents ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Urgent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {formatDollars(audit.urgent_recoverable_cents ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{audit.findings_count ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatDollars(totalCost)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Deletion request warning */}
      {deletionReqs && deletionReqs.length > 0 && (
        <div className="mb-6 rounded-lg border border-destructive p-4">
          <p className="text-sm font-medium text-destructive">
            Deletion requested on{" "}
            {new Date(deletionReqs[0].created_at).toLocaleDateString()} —
            Status: {deletionReqs[0].status}
          </p>
          {deletionReqs[0].status === "pending" && audit.status !== "deleted" && (
            <div className="mt-3">
              <DeleteAuditButton auditId={id} />
            </div>
          )}
        </div>
      )}

      {/* Report link */}
      <div className="mb-8">
        <Link
          href={`/r/${id}`}
          className="text-sm text-blue-400 hover:underline"
          target="_blank"
        >
          View report page &rarr;
        </Link>
      </div>

      {/* Findings */}
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4">
          Findings ({(findings ?? []).length})
        </h2>
        <div className="rounded-lg border divide-y">
          {(findings ?? []).map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between p-3"
            >
              <div>
                <p className="text-sm font-medium">{f.rule_id}</p>
                <p className="text-xs text-muted-foreground">
                  {f.category} · v{f.rule_version} ·{" "}
                  <Badge
                    variant={
                      f.confidence === "high" ? "default" : "secondary"
                    }
                  >
                    {f.confidence}
                  </Badge>
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold">
                  {formatDollars(f.amount_cents)}
                </p>
                {f.window_days_remaining != null && (
                  <p
                    className={`text-xs ${f.window_days_remaining <= 14 ? "text-red-400" : "text-muted-foreground"}`}
                  >
                    {f.window_days_remaining}d remaining
                  </p>
                )}
              </div>
            </div>
          ))}
          {(!findings || findings.length === 0) && (
            <p className="p-4 text-center text-muted-foreground">
              No findings
            </p>
          )}
        </div>
      </section>

      {/* Uploads */}
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4">Uploads</h2>
        <div className="rounded-lg border divide-y">
          {(uploads ?? []).map((u) => (
            <div
              key={u.storage_key}
              className="flex items-center justify-between p-3"
            >
              <div>
                <p className="text-sm font-medium">{u.report_type}</p>
                <p className="text-xs text-muted-foreground">
                  {u.storage_key}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm">
                  {((u.size_bytes ?? 0) / 1024 / 1024).toFixed(1)} MB
                </p>
                {u.purged_at && (
                  <p className="text-xs text-muted-foreground">Purged</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cost breakdown */}
      {costEvents && costEvents.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4">Cost Breakdown</h2>
          <div className="rounded-lg border divide-y">
            {costEvents.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3"
              >
                <span className="text-sm">{c.component}</span>
                <span className="font-mono">
                  {formatDollars(c.amount_cents)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Event timeline */}
      <section>
        <h2 className="text-lg font-bold mb-4">Event Timeline</h2>
        <div className="rounded-lg border divide-y">
          {(events ?? []).map((e, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium">{e.stage}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </p>
              </div>
              <Badge
                variant={
                  e.status === "completed" ? "default" : "destructive"
                }
              >
                {e.status}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Rule versions */}
      {audit.rule_versions && (
        <section className="mt-8">
          <h2 className="text-lg font-bold mb-4">Rule Versions</h2>
          <div className="rounded-lg border p-4">
            <pre className="text-xs text-muted-foreground">
              {JSON.stringify(audit.rule_versions, null, 2)}
            </pre>
          </div>
        </section>
      )}
    </main>
  );
}
