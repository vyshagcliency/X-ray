import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function POST(req: NextRequest) {
  const { auditId, reason } = (await req.json()) as { auditId: string; reason?: string };

  if (!auditId) {
    return NextResponse.json({ error: "Missing auditId" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: audit } = await db
    .from("audits")
    .select("id, status")
    .eq("id", auditId)
    .single();

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  if (audit.status !== "pending_review") {
    return NextResponse.json({ error: "Audit is not pending review" }, { status: 400 });
  }

  await db
    .from("audits")
    .update({ status: "failed" })
    .eq("id", auditId);

  await db.from("audit_events").insert({
    audit_id: auditId,
    stage: "admin.reject",
    status: "completed",
    metadata: { reason: reason ?? "Rejected by admin" },
  });

  return NextResponse.json({ success: true });
}
