import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Baslix Leakage X-Ray",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: April 2026
      </p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-3">What We Collect</h2>
          <p className="text-muted-foreground">
            When you use the Baslix Leakage X-Ray, we collect:
          </p>
          <ul className="text-muted-foreground list-disc pl-6 space-y-1">
            <li>Your work email address (for report delivery)</li>
            <li>Your brand or company name (for report personalization)</li>
            <li>The CSV reports you upload from Amazon Seller Central</li>
            <li>Your IP address (for rate limiting; purged with raw files at 30 days)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">How We Use Your Data</h2>
          <p className="text-muted-foreground">
            Your uploaded CSV files are processed to identify potential
            reimbursement and recovery opportunities. The analysis is performed
            by deterministic detection rules — your data is never used to train
            machine learning models.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Data Retention</h2>
          <ul className="text-muted-foreground list-disc pl-6 space-y-1">
            <li>
              <strong>Original CSV files</strong> are automatically deleted 30
              days after your report is generated. This is enforced by an
              automated daily process, not just policy.
            </li>
            <li>
              <strong>A columnar derivative copy</strong> is retained so your
              report remains accessible and can be re-run if our detection rules
              improve. This copy contains the same data in a compressed format.
            </li>
            <li>
              <strong>Report findings and narrative</strong> are retained
              indefinitely so your report URL continues to work.
            </li>
            <li>
              <strong>Full deletion</strong> is available on request at any time.
              Use the one-click deletion link in your report email, or contact us.
              Full deletion removes: original CSV files (if still stored),
              columnar copies, all findings, case data, and the generated PDF.
              Your email and brand name are zeroed. This is processed within 7
              days.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Data Security</h2>
          <ul className="text-muted-foreground list-disc pl-6 space-y-1">
            <li>All data is encrypted at rest (AES-256) and in transit (TLS 1.3)</li>
            <li>Per-report storage isolation with time-limited signed URLs</li>
            <li>No long-lived public URLs for any uploaded or generated files</li>
            <li>All API keys and credentials are server-side only</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">What We Never Do</h2>
          <ul className="text-muted-foreground list-disc pl-6 space-y-1">
            <li>We never share your data with third parties</li>
            <li>We never use your data to train AI models</li>
            <li>We never send more than one email per audit (the report delivery email)</li>
            <li>We never store your Seller Central credentials — we never ask for them</li>
            <li>We never email anyone mentioned in your reports</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Narrative Generation</h2>
          <p className="text-muted-foreground">
            The narrative sections of your report are generated using AI language
            models. These models receive only pre-computed, aggregated finding
            summaries — never your raw CSV data or individual transaction rows.
            All dollar figures in the report are computed by deterministic code,
            not by the AI model.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Contact</h2>
          <p className="text-muted-foreground">
            For privacy questions or deletion requests, email{" "}
            <a
              href="mailto:privacy@baslix.com"
              className="text-foreground underline"
            >
              privacy@baslix.com
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-border">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
