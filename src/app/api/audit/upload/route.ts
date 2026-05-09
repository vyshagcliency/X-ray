import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { tasks } from "@trigger.dev/sdk/v3";
import { uploadRateLimit } from "@/lib/security/rate-limit";

const VALID_REPORT_TYPES = ["reimbursements", "returns", "inventory_ledger"] as const;

export async function POST(req: NextRequest) {
  // Rate limit: 10 uploads per IP per day
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success: withinLimit } = await uploadRateLimit.limit(ip);
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Too many uploads. Please try again later." },
      { status: 429 },
    );
  }

  const auditId = req.nextUrl.searchParams.get("auditId");
  if (!auditId) {
    return NextResponse.json({ error: "Missing auditId" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Verify audit exists and is pending_upload
  const { data: audit } = await db
    .from("audits")
    .select("id, status")
    .eq("id", auditId)
    .single();

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  if (audit.status !== "pending_upload") {
    return NextResponse.json({ error: "Audit is not in upload state" }, { status: 400 });
  }

  const formData = await req.formData();

  // Upload each file to Supabase Storage
  for (const reportType of VALID_REPORT_TYPES) {
    const file = formData.get(reportType);
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: `Missing required report: ${reportType}` },
        { status: 400 },
      );
    }

    const storagePath = `raw/${auditId}/${reportType}/${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await db.storage
      .from("uploads")
      .upload(storagePath, buffer, {
        contentType: "text/csv",
        upsert: true,
      });

    if (uploadError) {
      console.error(`Upload failed for ${reportType}:`, uploadError);
      return NextResponse.json(
        { error: `Failed to upload ${reportType}` },
        { status: 500 },
      );
    }

    // Record in raw_uploads
    await db.from("raw_uploads").insert({
      audit_id: auditId,
      report_type: reportType,
      storage_key: storagePath,
      size_bytes: file.size,
    });
  }

  // Update audit status to processing
  await db
    .from("audits")
    .update({ status: "processing" })
    .eq("id", auditId);

  // Enqueue Trigger.dev audit.run task
  const handle = await tasks.trigger("audit.run", { auditId });

  return NextResponse.json({ success: true, runId: handle.id });
}
