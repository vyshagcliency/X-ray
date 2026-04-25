import { task } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/db/supabase";
import { renderTypstPdf } from "@/lib/pdf/typst-render";
import { renderReactPdf } from "@/lib/pdf/react-pdf-render";
import type { ReportData } from "@/lib/pdf/data-builder";

export const renderPdf = task({
  id: "render.pdf",
  retry: { maxAttempts: 2 },

  run: async ({ auditId }: { auditId: string }) => {
    const db = supabaseAdmin();

    // Fetch report data
    const { data: audit } = await db
      .from("audits")
      .select("report_data")
      .eq("id", auditId)
      .single();

    if (!audit?.report_data) {
      throw new Error(`No report_data found for audit ${auditId}`);
    }

    const reportData = audit.report_data as ReportData;
    let pdfBuffer: Uint8Array | Buffer | null = null;
    let renderer: "typst" | "react-pdf" = "typst";

    // Try Typst primary renderer
    try {
      pdfBuffer = await renderTypstPdf(reportData);
    } catch (err) {
      console.error("Typst render failed, falling back to React-PDF:", err);
    }

    // Fall back to React-PDF
    if (!pdfBuffer) {
      renderer = "react-pdf";
      try {
        pdfBuffer = await renderReactPdf(reportData);
      } catch (err) {
        console.error("React-PDF render also failed:", err);
        // Record failure
        await db.from("audit_events").insert({
          audit_id: auditId,
          stage: "render.pdf",
          status: "failed",
          metadata: { error: String(err), renderer },
        });
        throw new Error("Both PDF renderers failed");
      }
    }

    // Upload PDF to Supabase Storage
    const storagePath = `reports/${auditId}.pdf`;
    const { error: uploadError } = await db.storage
      .from("uploads")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Record success
    await db.from("audit_events").insert({
      audit_id: auditId,
      stage: "render.pdf",
      status: "completed",
      metadata: { renderer, size_bytes: pdfBuffer.length },
    });

    return { auditId, renderer, sizeBytes: pdfBuffer.length };
  },
});
