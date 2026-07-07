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
      .select(
        "id, email, brand_name, total_recoverable_cents, findings_count, status, report_data",
      )
      .eq("id", auditId)
      .single();

    if (!audit) throw new Error(`Audit ${auditId} not found`);
    if (audit.status !== "completed") {
      console.log(`Audit ${auditId} is ${audit.status}, not sending email`);
      return { sent: false, reason: "not_completed" };
    }

    const reportUrl = `${baseUrl}/r/${audit.id}`;

    // The email re-heros off report_data (the single source of truth for every report
    // number) so it mirrors the web hero exactly. Legacy audits with no report_data fall
    // back to the audit summary columns (still no "owes you" framing).
    const rd = (audit.report_data ?? {}) as {
      provable_forward_monthly_cents?: number | null;
      provable_cents?: number;
      total_recoverable_cents?: number;
      estimated_cents?: number;
      findings_count?: number;
      categories?: unknown[];
      confidence?: { high: number; medium: number; low: number };
    };
    const totalCents = rd.total_recoverable_cents ?? audit.total_recoverable_cents ?? 0;

    const { subject, html } = reportReadyHtml({
      brand_name: audit.brand_name,
      report_url: reportUrl,
      audit_id: audit.id,
      provable_forward_monthly_cents: rd.provable_forward_monthly_cents ?? null,
      provable_cents: rd.provable_cents ?? totalCents,
      total_recoverable_cents: totalCents,
      estimated_cents: rd.estimated_cents ?? 0,
      findings_count: rd.findings_count ?? audit.findings_count ?? 0,
      category_count: rd.categories?.length ?? 0,
      confidence: rd.confidence ?? { high: 0, medium: 0, low: 0 },
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
