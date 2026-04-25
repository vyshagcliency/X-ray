export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/db/supabase";
import { Badge } from "@/components/ui/badge";
import { formatDollars } from "@/lib/format";
import Link from "next/link";

export const metadata = {
  robots: "noindex, nofollow",
};

export default async function AuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status: filterStatus, q } = await searchParams;
  const db = supabaseAdmin();

  let query = db
    .from("audits")
    .select(
      "id, brand_name, email, status, total_recoverable_cents, findings_count, created_at, completed_at, rule_versions",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (filterStatus) {
    query = query.eq("status", filterStatus);
  }

  if (q) {
    query = query.or(`brand_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data: audits } = await query;

  const statusOptions = [
    "all",
    "pending_upload",
    "processing",
    "pending_review",
    "completed",
    "failed",
    "deleted",
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Audits</h1>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {statusOptions.map((s) => (
          <Link
            key={s}
            href={
              s === "all"
                ? "/admin/audits"
                : `/admin/audits?status=${s}${q ? `&q=${q}` : ""}`
            }
            className={`px-3 py-1 text-sm rounded-md border ${
              (s === "all" && !filterStatus) || filterStatus === s
                ? "bg-foreground text-background"
                : "hover:bg-muted"
            }`}
          >
            {s.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      {/* Search */}
      <form className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by brand name or email..."
          className="w-full max-w-md rounded-md border bg-background px-3 py-2 text-sm"
        />
        {filterStatus && (
          <input type="hidden" name="status" value={filterStatus} />
        )}
      </form>

      {/* Table */}
      <div className="rounded-lg border divide-y">
        <div className="grid grid-cols-6 gap-4 p-3 text-xs font-medium text-muted-foreground uppercase">
          <span>Brand</span>
          <span>Email</span>
          <span>Status</span>
          <span className="text-right">Recoverable</span>
          <span className="text-right">Findings</span>
          <span className="text-right">Date</span>
        </div>
        {(audits ?? []).map((a) => (
          <Link
            key={a.id}
            href={`/admin/audits/${a.id}`}
            className="grid grid-cols-6 gap-4 p-3 items-center hover:bg-muted/50"
          >
            <span className="font-medium truncate">{a.brand_name}</span>
            <span className="text-sm text-muted-foreground truncate">
              {a.email}
            </span>
            <span>
              <Badge
                variant={
                  a.status === "completed"
                    ? "default"
                    : a.status === "pending_review"
                      ? "secondary"
                      : a.status === "failed"
                        ? "destructive"
                        : "outline"
                }
              >
                {a.status}
              </Badge>
            </span>
            <span className="text-right font-mono">
              {formatDollars(a.total_recoverable_cents ?? 0)}
            </span>
            <span className="text-right">{a.findings_count ?? 0}</span>
            <span className="text-right text-sm text-muted-foreground">
              {new Date(a.created_at).toLocaleDateString()}
            </span>
          </Link>
        ))}
        {(!audits || audits.length === 0) && (
          <p className="p-6 text-center text-muted-foreground">
            No audits found
          </p>
        )}
      </div>
    </main>
  );
}
