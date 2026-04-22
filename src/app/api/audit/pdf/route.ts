import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";

/**
 * GET /api/audit/pdf?id=<audit_id>
 *
 * Generates a signed URL for the pre-rendered PDF, or returns
 * a simple HTML-to-PDF fallback for Phase 1.
 *
 * Phase 1: Returns report_data as a downloadable JSON (PDF rendering
 * will be added when Typst WASM integration is complete).
 * The report page itself IS the product in Phase 1.
 */
export async function GET(req: NextRequest) {
  const auditId = req.nextUrl.searchParams.get("id");
  if (!auditId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Check if a pre-rendered PDF exists in storage
  const { data: pdfUrl } = await db.storage
    .from("reports")
    .createSignedUrl(`${auditId}.pdf`, 3600);

  if (pdfUrl?.signedUrl) {
    return NextResponse.redirect(pdfUrl.signedUrl);
  }

  // Phase 1 fallback: redirect to the web report
  // PDF rendering will be added in Phase 1.6
  return NextResponse.redirect(new URL(`/r/${auditId}`, req.url));
}
