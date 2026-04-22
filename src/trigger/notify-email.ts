import { task } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/db/supabase";
import { sendEmail } from "@/lib/email/send";
import { reportReadyHtml } from "@/lib/email/templates/report-ready";

export const notifyEmail = task({
  id: "notify.email",
  retry: { maxAttempts: 3 },

  run: async ({ auditId, baseUrl }: { auditId: string; baseUrl: string }) => {
    const db = supabaseAdmin();

    const { data: audit } = await db
      .from("audits")
      .select("id, email, brand_name, total_recoverable_cents, findings_count, status")
      .eq("id", auditId)
      .single();

    if (!audit) throw new Error(`Audit ${auditId} not found`);
    if (audit.status !== "completed") {
      console.log(`Audit ${auditId} is ${audit.status}, not sending email`);
      return { sent: false, reason: "not_completed" };
    }

    const reportUrl = `${baseUrl}/r/${audit.id}`;

    const { subject, html } = reportReadyHtml({
      brand_name: audit.brand_name,
      total_recoverable_cents: audit.total_recoverable_cents ?? 0,
      findings_count: audit.findings_count ?? 0,
      report_url: reportUrl,
      audit_id: audit.id,
    });

    const result = await sendEmail({ to: audit.email, subject, html });

    // Record event
    await db.from("audit_events").insert({
      audit_id: auditId,
      stage: "notify.email",
      status: result.success ? "completed" : "failed",
      metadata: result.error ? { error: result.error } : {},
    });

    return { sent: result.success };
  },
});
