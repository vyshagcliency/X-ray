import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Baslix Leakage X-Ray",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: April 2026
      </p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-3">Service Description</h2>
          <p className="text-muted-foreground">
            The Baslix Leakage X-Ray (&quot;Service&quot;) is a free forensic
            audit tool that analyzes Amazon Seller Central CSV reports to
            identify potential recovery opportunities. The Service is provided by
            Baslix (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Eligibility</h2>
          <p className="text-muted-foreground">
            By using the Service, you represent that you have authorization to
            upload the Seller Central reports for the brand or company you
            specify. You confirm that the data you upload belongs to your company
            or that you have explicit permission from the data owner.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">The Report</h2>
          <ul className="text-muted-foreground list-disc pl-6 space-y-1">
            <li>
              The report identifies potential discrepancies based on automated
              pattern detection against your data. Findings are not legal advice
              and do not guarantee recovery.
            </li>
            <li>
              Dollar amounts represent estimated recoverable value based on the
              data provided. Actual recovery amounts may differ.
            </li>
            <li>
              Dispute window estimates are based on Amazon&apos;s published
              policies as of the date of analysis and may change.
            </li>
            <li>
              The draft dispute text provided is a starter template, not a
              finished filing. Professional dispute filing is available as a
              separate paid service.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">No Warranty</h2>
          <p className="text-muted-foreground">
            The Service is provided &quot;as is&quot; without warranty of any
            kind. We do not guarantee the accuracy, completeness, or timeliness
            of any findings. We are not responsible for any actions you take
            based on the report.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Limitation of Liability</h2>
          <p className="text-muted-foreground">
            To the maximum extent permitted by law, Baslix shall not be liable
            for any indirect, incidental, special, consequential, or punitive
            damages arising out of your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Data Handling</h2>
          <p className="text-muted-foreground">
            Your data is handled in accordance with our{" "}
            <Link href="/privacy" className="text-foreground underline">
              Privacy Policy
            </Link>
            . Original CSV files are automatically deleted 30 days after report
            generation. You may request full deletion at any time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Acceptable Use</h2>
          <p className="text-muted-foreground">You agree not to:</p>
          <ul className="text-muted-foreground list-disc pl-6 space-y-1">
            <li>Upload data you are not authorized to share</li>
            <li>Attempt to reverse-engineer the detection rules</li>
            <li>Use automated tools to submit bulk audits without permission</li>
            <li>Share report URLs publicly or with unauthorized parties</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Rate Limits</h2>
          <p className="text-muted-foreground">
            To prevent abuse, we limit the number of audits per email domain and
            per IP address. Disposable email addresses are not accepted. We
            reserve the right to block domains that misuse the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Changes</h2>
          <p className="text-muted-foreground">
            We may update these terms from time to time. Continued use of the
            Service constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Contact</h2>
          <p className="text-muted-foreground">
            For questions about these terms, email{" "}
            <a
              href="mailto:legal@baslix.com"
              className="text-foreground underline"
            >
              legal@baslix.com
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
