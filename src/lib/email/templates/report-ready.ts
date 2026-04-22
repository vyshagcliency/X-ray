/**
 * Report-ready email template.
 * Simple HTML — no heavy email framework for Phase 1.
 */

import { formatDollars } from "@/lib/format";

interface ReportReadyParams {
  brand_name: string;
  total_recoverable_cents: number;
  findings_count: number;
  report_url: string;
  audit_id: string;
}

export function reportReadyHtml({
  brand_name,
  total_recoverable_cents,
  findings_count,
  report_url,
  audit_id,
}: ReportReadyParams): { subject: string; html: string } {
  const totalFormatted = formatDollars(total_recoverable_cents);

  return {
    subject: `Your X-Ray report is ready — ${totalFormatted} recoverable for ${brand_name}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <h1 style="font-size:24px;margin-bottom:8px;">Your X-Ray Report is Ready</h1>

  <p style="font-size:18px;color:#333;">
    We found <strong>${totalFormatted}</strong> Amazon may owe <strong>${brand_name}</strong>.
  </p>

  <p style="color:#666;">${findings_count} recoverable cases identified across your Seller Central data.</p>

  <a href="${report_url}"
     style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">
    View Your Report
  </a>

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">

  <p style="font-size:14px;color:#888;">
    Filing ${findings_count} disputes is typically a 60-80 hour job. We do it as a managed service —
    we only get paid when the money lands in your account (20% of recovered, no retainer).
  </p>

  <p style="font-size:14px;color:#888;">
    Reply to this email to schedule a 15-minute call, or
    <a href="${report_url}" style="color:#1a1a1a;">view the full report</a>.
  </p>

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">

  <p style="font-size:12px;color:#aaa;">
    Case ID: ${audit_id.slice(0, 8).toUpperCase()}<br>
    Baslix Inc. · <a href="https://baslix.com" style="color:#aaa;">baslix.com</a>
  </p>
</body>
</html>`,
  };
}
