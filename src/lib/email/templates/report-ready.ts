/**
 * Report-ready email template.
 * Simple HTML: no heavy email framework for Phase 1.
 *
 * P6.2 — this email is the first thing every prospect sees; it must tell the SAME
 * payout-integrity, provable-forward story as the report (report-killer-plan §Phase 6).
 * The hero is the high-confidence forward run-rate (mirrors the web hero, P1.1), with the
 * same null/zero fallback to the provable figure. It never says "Amazon owes you."
 */

import { formatDollars } from "@/lib/format";

interface ReportReadyParams {
  brand_name: string;
  report_url: string;
  audit_id: string;
  /** High-confidence forward overcharge as a monthly run-rate; null/0 when unknown. */
  provable_forward_monthly_cents: number | null;
  /** Findings with a real per-row amount (the "traces to a row" figure). */
  provable_cents: number;
  total_recoverable_cents: number;
  estimated_cents: number;
  findings_count: number;
  category_count: number;
  confidence: { high: number; medium: number; low: number };
}

export function reportReadyHtml({
  brand_name,
  report_url,
  audit_id,
  provable_forward_monthly_cents,
  provable_cents,
  total_recoverable_cents,
  estimated_cents,
  findings_count,
  category_count,
  confidence,
}: ReportReadyParams): { subject: string; html: string } {
  const hasForward =
    provable_forward_monthly_cents !== null && provable_forward_monthly_cents > 0;
  const monthly = hasForward ? formatDollars(provable_forward_monthly_cents!) : null;
  const provable = formatDollars(provable_cents);
  const total = formatDollars(total_recoverable_cents);
  const catLabel = category_count === 1 ? "category" : "categories";

  const subject = hasForward
    ? `Amazon is overbilling ${brand_name} about ${monthly}/month — Settlement Truth Audit ready`
    : `${provable} in provable overcharges — Settlement Truth Audit ready for ${brand_name}`;

  // Hero mirrors the web report hero (P1.1) and its null/zero fallback.
  const hero = hasForward
    ? `
  <p style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:36px;font-weight:700;margin:0 0 6px;color:#0f172a;letter-spacing:-0.5px;">
    ${monthly}<span style="font-size:18px;font-weight:600;color:#64748b;">/mo</span>
  </p>
  <p style="font-size:16px;line-height:1.6;color:#334155;margin:0;">
    Amazon is overbilling <strong>${brand_name}</strong> about <strong>${monthly} every month</strong>
    in high-confidence, provable overcharges — and it compounds until the wrong referral category
    and size-tier are corrected.
  </p>`
    : `
  <p style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:36px;font-weight:700;margin:0 0 6px;color:#0f172a;letter-spacing:-0.5px;">
    ${provable}
  </p>
  <p style="font-size:16px;line-height:1.6;color:#334155;margin:0;">
    Provable overcharges and missing credits we found in <strong>${brand_name}</strong>'s own
    Seller Central data — every figure in the report traces to a specific row.
  </p>`;

  return {
    subject,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
  <p style="font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;margin:0 0 4px;">
    Settlement Truth Audit · ${brand_name}
  </p>
  <h1 style="font-size:22px;margin:0 0 20px;color:#0f172a;">Your audit is ready</h1>

  ${hero}

  <p style="font-size:14px;color:#64748b;margin:18px 0 0;">
    <strong style="color:#334155;">${total}</strong> surfaced across ${findings_count} findings in
    ${category_count} ${catLabel} — ${provable} provable${
      estimated_cents > 0 ? `, ${formatDollars(estimated_cents)} estimated` : ""
    } · ${confidence.high} high · ${confidence.medium} medium confidence. Every provable figure
    traces to a row you can file today.
  </p>

  <a href="${report_url}"
     style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:20px 0;">
    View your report
  </a>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">

  <p style="font-size:14px;line-height:1.6;color:#64748b;">
    Every finding above is yours to file, free. What we run as a service is catching next
    month's overcharge before it compounds, across every channel you sell on, plus the
    backward claims that need direct access to your data to chase down.
  </p>

  <p style="font-size:14px;color:#64748b;">
    <a href="https://calendly.com/vyshag-baslix/30min" style="color:#0f172a;">Talk to us: 15 minutes, no pitch deck</a>,
    or <a href="${report_url}" style="color:#0f172a;">view the full report</a>.
  </p>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">

  <p style="font-size:12px;color:#94a3b8;">
    Case ID: ${audit_id.slice(0, 8).toUpperCase()}<br>
    Baslix Inc. · <a href="https://baslix.com" style="color:#94a3b8;">baslix.com</a>
  </p>
</body>
</html>`,
  };
}
