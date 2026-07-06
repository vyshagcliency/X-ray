import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { findingsToCsv, type CsvFinding } from "@/lib/report/findings-csv";

/**
 * GET /api/audit/csv?id=<audit_id>
 *
 * Streams every finding as CSV — the "yours to file, free" long tail the web report
 * caps per category (P2.4). Each row carries the identifiers, the dollar gap, the
 * window, and a copy-ready dispute message so any single row is filable from the export.
 */
export async function GET(req: NextRequest) {
  const auditId = req.nextUrl.searchParams.get("id");
  if (!auditId) {
    return NextResponse.json({ error: "Missing id", code: "missing_id" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: audit } = await db
    .from("audits")
    .select("brand_name, findings_count, status")
    .eq("id", auditId)
    .single();

  if (!audit || !["completed", "pending_review"].includes(audit.status)) {
    return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  }

  // Fetch the COMPLETE finding set — PostgREST caps one response at 1000 rows, so
  // paginate (same guard as the report page) or the export silently drops findings.
  const expected = (audit.findings_count as number) ?? 0;
  const findings: CsvFinding[] = [];
  const PAGE = 1000;
  while (findings.length < expected) {
    const { data: page } = await db
      .from("findings")
      .select("rule_id, category, amount_cents, confidence, window_closes_on, window_days_remaining, evidence")
      .eq("audit_id", auditId)
      .order("amount_cents", { ascending: false })
      .order("id", { ascending: true })
      .range(findings.length, findings.length + PAGE - 1);
    if (!page || page.length === 0) break;
    findings.push(...(page as CsvFinding[]));
  }

  const csv = findingsToCsv(findings);
  const filename = `${(audit.brand_name ?? "report").replace(/[^a-zA-Z0-9_-]/g, "_")}-xray-findings.csv`;

  // Prepend a UTF-8 BOM so Excel opens accented characters correctly.
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
