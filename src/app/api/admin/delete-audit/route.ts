import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";

export async function POST(req: NextRequest) {
  const { auditId } = (await req.json()) as { auditId: string };

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

  // Delete raw CSVs from Storage
  const { data: uploads } = await db
    .from("raw_uploads")
    .select("storage_key")
    .eq("audit_id", auditId);

  if (uploads && uploads.length > 0) {
    const keys = uploads.map((u) => u.storage_key);
    await db.storage.from("uploads").remove(keys);
  }

  // Delete PDF from Storage
  await db.storage.from("uploads").remove([`reports/${auditId}.pdf`]);

  // Delete findings
  await db.from("findings").delete().eq("audit_id", auditId);

  // Delete cost_events
  await db.from("cost_events").delete().eq("audit_id", auditId);

  // Zero PII on audits row + set status to deleted
  await db
    .from("audits")
    .update({
      email: null,
      brand_name: null,
      ip: null,
      ua: null,
      status: "deleted",
    })
    .eq("id", auditId);

  // Mark deletion request as processed (if one exists)
  await db
    .from("deletion_requests")
    .update({ status: "processed" })
    .eq("audit_id", auditId)
    .eq("status", "pending");

  // Record event
  await db.from("audit_events").insert({
    audit_id: auditId,
    stage: "admin.delete",
    status: "completed",
  });

  return NextResponse.json({ success: true });
}
