export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/db/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDollars } from "@/lib/format";

export const metadata = {
  robots: "noindex, nofollow",
};

export default async function AdminPage() {
  const db = supabaseAdmin();

  // Get pending review audits
  const { data: pendingAudits } = await db
    .from("audits")
    .select("id, brand_name, email, total_recoverable_cents, findings_count, created_at, status")
    .in("status", ["pending_review", "processing", "completed", "failed"])
    .order("created_at", { ascending: false })
    .limit(50);

  const audits = pendingAudits ?? [];
  const pending = audits.filter((a) => a.status === "pending_review");
  const completed = audits.filter((a) => a.status === "completed");
  const processing = audits.filter((a) => a.status === "processing");
  const failed = audits.filter((a) => a.status === "failed");

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold">X-Ray Admin</h1>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pending.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{processing.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{completed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{failed.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending review queue */}
      {pending.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">Pending Review</h2>
          <div className="mt-4 divide-y rounded-lg border">
            {pending.map((a) => (
              <a
                key={a.id}
                href={`/admin/review/${a.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{a.brand_name}</p>
                  <p className="text-sm text-muted-foreground">{a.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatDollars(a.total_recoverable_cents ?? 0)}</p>
                  <p className="text-sm text-muted-foreground">{a.findings_count} findings</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Recent audits */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">Recent Audits</h2>
        <div className="mt-4 divide-y rounded-lg border">
          {audits.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{a.brand_name}</p>
                <p className="text-sm text-muted-foreground">
                  {a.email} · {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-bold">{formatDollars(a.total_recoverable_cents ?? 0)}</p>
                <Badge
                  variant={
                    a.status === "completed" ? "default" :
                    a.status === "pending_review" ? "secondary" :
                    a.status === "failed" ? "destructive" :
                    "outline"
                  }
                >
                  {a.status}
                </Badge>
              </div>
            </div>
          ))}
          {audits.length === 0 && (
            <p className="p-4 text-center text-muted-foreground">No audits yet</p>
          )}
        </div>
      </section>
    </main>
  );
}
