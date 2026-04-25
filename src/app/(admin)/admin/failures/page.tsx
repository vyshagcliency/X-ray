export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/db/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const metadata = {
  robots: "noindex, nofollow",
};

export default async function FailuresPage() {
  const db = supabaseAdmin();

  // Get failed audits
  const { data: failedAudits } = await db
    .from("audits")
    .select("id, brand_name, email, created_at")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(50);

  // Get failure events for each audit
  const auditIds = (failedAudits ?? []).map((a) => a.id);
  let failureEvents: Array<{
    audit_id: string;
    stage: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }> = [];

  if (auditIds.length > 0) {
    const { data: events } = await db
      .from("audit_events")
      .select("audit_id, stage, metadata, created_at")
      .in("audit_id", auditIds)
      .eq("status", "failed")
      .order("created_at", { ascending: false });

    failureEvents = events ?? [];
  }

  // Group events by audit
  const eventsByAudit = new Map<string, typeof failureEvents>();
  for (const event of failureEvents) {
    const existing = eventsByAudit.get(event.audit_id) ?? [];
    existing.push(event);
    eventsByAudit.set(event.audit_id, existing);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Failed Audits</h1>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Dashboard
        </Link>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        {(failedAudits ?? []).length} failed audit
        {(failedAudits ?? []).length !== 1 ? "s" : ""}
      </p>

      <div className="space-y-4">
        {(failedAudits ?? []).map((audit) => {
          const events = eventsByAudit.get(audit.id) ?? [];

          return (
            <Card key={audit.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium">{audit.brand_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {audit.email} ·{" "}
                      {new Date(audit.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/audits/${audit.id}`}
                      className="text-sm text-blue-400 hover:underline"
                    >
                      Details &rarr;
                    </Link>
                  </div>
                </div>

                {events.length > 0 ? (
                  <div className="rounded border divide-y">
                    {events.map((e, i) => (
                      <div key={i} className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="destructive">{e.stage}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(e.created_at).toLocaleString()}
                          </span>
                        </div>
                        {e.metadata && (
                          <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                            {typeof e.metadata === "object"
                              ? JSON.stringify(e.metadata, null, 2)
                              : String(e.metadata)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No error details recorded
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {(!failedAudits || failedAudits.length === 0) && (
          <p className="text-center text-muted-foreground py-8">
            No failed audits
          </p>
        )}
      </div>
    </main>
  );
}
