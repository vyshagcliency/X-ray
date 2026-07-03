import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";

/**
 * GET /api/audit/pdf?id=<audit_id>
 *
 * Returns a signed URL for the pre-rendered PDF stored in Supabase Storage.
 * If no PDF exists yet, falls back to on-demand rendering via React-PDF.
 * Signed URLs expire after 1 hour (minted fresh on each request).
 */
export async function GET(req: NextRequest) {
  const auditId = req.nextUrl.searchParams.get("id");
  if (!auditId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: audit } = await db
    .from("audits")
    .select("report_data, brand_name")
    .eq("id", auditId)
    .single();

  const filename = `${(audit?.brand_name ?? "report").replace(/[^a-zA-Z0-9_-]/g, "_")}-xray.pdf`;

  // Check if a pre-rendered PDF exists in storage: proxy it instead of redirecting
  const storagePath = `reports/${auditId}.pdf`;
  const { data: stored } = await db.storage
    .from("uploads")
    .download(storagePath);

  if (stored) {
    const bytes = new Uint8Array(await stored.arrayBuffer());
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  // No pre-rendered PDF: try on-demand React-PDF render
  if (!audit?.report_data) {
    return NextResponse.redirect(new URL(`/r/${auditId}`, req.url));
  }

  try {
    const { renderReactPdf } = await import("@/lib/pdf/react-pdf-render");
    const pdfBuffer = await renderReactPdf(audit.report_data);

    // Upload for next time
    await db.storage
      .from("uploads")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    // Final fallback: redirect to web report
    return NextResponse.redirect(new URL(`/r/${auditId}`, req.url));
  }
}
