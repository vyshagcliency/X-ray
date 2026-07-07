import { describe, it, expect } from "vitest";
import { reportReadyHtml } from "@/lib/email/templates/report-ready";
import { formatDollars } from "@/lib/format";

// P6.2 — the report-ready email must tell the SAME payout-integrity, provable-forward
// story as the report (report-killer-plan §Phase 6). The old template led with
// "$X Amazon may owe you" (the dead reimbursement framing + the soft big-total hero
// Phases 0–1 removed). These tests lock in the re-hero and guard against regressing to it.

const base = {
  brand_name: "Halcyon Audio",
  report_url: "https://baslix.com/r/abc-123",
  audit_id: "abcd1234-0000-0000-0000-000000000000",
  provable_forward_monthly_cents: 28100, // $281/mo
  provable_cents: 5350500, // $53,505
  total_recoverable_cents: 6276000, // $62,760
  estimated_cents: 925500, // $9,255
  findings_count: 1122,
  category_count: 6,
  confidence: { high: 845, medium: 277, low: 0 },
};

describe("reportReadyHtml — payout-integrity re-hero (P6.2)", () => {
  it("never uses the old 'Amazon owes/owe you' framing", () => {
    const { subject, html } = reportReadyHtml(base);
    expect(subject).not.toMatch(/owe/i);
    expect(html).not.toMatch(/owe/i);
    // The soft "$X recoverable" big-total hero is gone from the subject.
    expect(subject).not.toMatch(/recoverable/i);
  });

  it("leads with the provable-forward monthly run-rate when known", () => {
    const { subject, html } = reportReadyHtml(base);
    const monthly = formatDollars(base.provable_forward_monthly_cents);
    // Hero figure appears in both subject and body.
    expect(subject).toContain(monthly);
    expect(html).toContain(monthly);
    // Payout-integrity, compounding framing (mirrors the web hero).
    expect(html).toMatch(/every month/i);
    expect(html).toMatch(/compounds/i);
    expect(html).toContain("Settlement Truth Audit");
  });

  it("shows the honest 'surfaced in total' secondary line with reconciled numbers", () => {
    const { html } = reportReadyHtml(base);
    expect(html).toContain(formatDollars(base.total_recoverable_cents)); // $62,760 surfaced
    expect(html).toContain(formatDollars(base.provable_cents)); // $53,505 provable
    expect(html).toContain("845 high");
  });

  it("keeps the sell-the-system close and one CTA", () => {
    const { html } = reportReadyHtml(base);
    expect(html).toMatch(/backward claims/i);
    expect(html).toContain("calendly.com/vyshag-baslix");
    expect(html).toContain(base.report_url);
  });

  it("falls back to the provable figure when the forward run-rate is unknown (null window)", () => {
    const { subject, html } = reportReadyHtml({
      ...base,
      provable_forward_monthly_cents: null,
    });
    const provable = formatDollars(base.provable_cents);
    expect(html).toContain(provable);
    expect(html).toMatch(/traces to/i);
    // Still payout-integrity, never "owe".
    expect(subject).not.toMatch(/owe/i);
    expect(html).toContain("Settlement Truth Audit");
    // No monthly-rate hero language when we can't compute a run-rate.
    expect(html).not.toMatch(/every month/i);
  });

  it("falls back to provable when the forward run-rate is zero (no high-confidence rolling finding)", () => {
    const { html } = reportReadyHtml({
      ...base,
      provable_forward_monthly_cents: 0,
    });
    expect(html).toContain(formatDollars(base.provable_cents));
    expect(html).not.toMatch(/every month/i);
  });
});
