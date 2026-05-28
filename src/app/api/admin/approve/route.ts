import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(req: NextRequest) {
  // Phase 1: no auth middleware yet — admin routes are unlinked + noindex
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

  if (audit.status !== "pending_review") {
    return NextResponse.json({ error: "Audit is not pending review" }, { status: 400 });
  }

  // Flip to completed
  await db
    .from("audits")
    .update({ status: "completed" })
    .eq("id", auditId);

  // Record event
  await db.from("audit_events").insert({
    audit_id: auditId,
    stage: "admin.approve",
    status: "completed",
  });

  // Trigger email notification
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://xray.baslix.com";
  await tasks.trigger("notify.email", { auditId, baseUrl });

  return NextResponse.json({ success: true });
}
