"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield, CheckCircle2, EyeOff, UserX, Trash2, Ban, FileX2 } from "lucide-react";
import { motion } from "motion/react";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportTile } from "@/components/upload/ReportTile";
import { REPORT_SIGNATURES } from "@/lib/csv/headers";

// Lead with payout integrity: the settlement + fee-preview reports power the
// referral-fee and size-tier checks (the "Settlement Truth Audit"). The rest are
// optional and unlock additional findings.
const REQUIRED_REPORTS = ["settlement", "fba_fee_preview"] as const;
const OPTIONAL_REPORTS = [
  "returns",
  "inventory_ledger",
  "reimbursements",
  "storage_fees",
  "monthly_storage",
] as const;


export default function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [files, setFiles] = useState<Record<string, File>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allUploaded = REQUIRED_REPORTS.every((type) => files[type]);

  const handleValidFile = useCallback((type: string, file: File) => {
    setFiles((prev) => ({ ...prev, [type]: file }));
  }, []);

  const handleClear = useCallback((type: string) => {
    setFiles((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  }, []);

  const handleRunAudit = async () => {
    setIsSubmitting(true);
    const { id } = await params;

    // Upload files to server
    const formData = new FormData();
    for (const [type, file] of Object.entries(files)) {
      formData.append(type, file);
    }

    try {
      const res = await fetch(`/api/audit/upload?auditId=${id}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Upload failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Hand the run id + a run-scoped read token to the processing page so it can
      // stream real progress (useRealtimeRun). Best-effort — if this fails, the
      // processing page falls back to status polling.
      try {
        const data = await res.json();
        if (data.runId && data.publicAccessToken) {
          sessionStorage.setItem(
            `xray-run:${id}`,
            JSON.stringify({ runId: data.runId, publicAccessToken: data.publicAccessToken }),
          );
        }
      } catch {
        // Ignore — progress will fall back to polling.
      }

      router.push(`/run/${id}`);
    } catch {
      alert("Upload failed. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  };

  const requiredUploadedCount = REQUIRED_REPORTS.filter((t) => files[t]).length;
  const optionalUploadedCount = OPTIONAL_REPORTS.filter((t) => files[t]).length;
  const remainingCount = REQUIRED_REPORTS.length - requiredUploadedCount;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute -left-32 top-20 size-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-20 size-72 rounded-full bg-emerald-500/5 blur-3xl" />

      <NavBar />

      <main className="relative mx-auto w-full max-w-7xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Step 2 of 3</Badge>
            <span className="text-sm text-muted-foreground">
              {requiredUploadedCount} of {REQUIRED_REPORTS.length} required
              {optionalUploadedCount > 0 && ` · +${optionalUploadedCount} optional`}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight lg:text-3xl">
            Upload your Seller Central reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with the 2 required reports. We&apos;ll validate each one instantly.
            Add the optional ones to find more.
          </p>
        </motion.div>

        {/* Data-trust block (P6.3). The data-trust cliff is the #1 self-serve conversion
            risk for a Controller uploading financials — make "we literally can't keep or
            misuse your data" scannable before they commit a single file. */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5 }}
          className="mt-6 rounded-xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur-sm"
          aria-label="How we protect your data"
        >
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" strokeWidth={2} />
            <h2 className="text-sm font-semibold">Your data never leaves your control</h2>
          </div>

          {/* The differentiator, elevated: no model ever touches raw rows. */}
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <EyeOff className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.75} />
            <p className="text-sm text-foreground/90">
              <span className="font-semibold">No AI ever sees your rows.</span> Our models
              receive computed totals only — never a single line of your Seller Central data.
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: UserX,
                title: "No account, no login",
                text: "Nothing to sign up for — the report URL is the only key.",
              },
              {
                icon: Trash2,
                title: "Auto-deleted in 30 days",
                text: "Raw CSVs are purged automatically, enforced in code.",
              },
              {
                icon: Ban,
                title: "Never shared or trained on",
                text: "Not sold, not shared, never used to train anything.",
              },
              {
                icon: FileX2,
                title: "Delete anytime",
                text: "One request wipes everything we hold, on demand.",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <item.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Required report tiles: 2-up grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mt-8"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Required</h2>
            {allUploaded ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                <CheckCircle2 className="size-3.5" />
                Ready to run
              </span>
            ) : (
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {requiredUploadedCount} of {REQUIRED_REPORTS.length} added
              </span>
            )}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {REQUIRED_REPORTS.map((type) => (
              <ReportTile
                key={type}
                signature={REPORT_SIGNATURES[type]}
                onValidFile={(file) => handleValidFile(type, file)}
                onClear={() => handleClear(type)}
              />
            ))}
          </div>
        </motion.div>

        {/* Optional report tiles: 2-up grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mt-8"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Optional</h2>
            <span className="text-xs text-muted-foreground">
              {optionalUploadedCount > 0 && `${optionalUploadedCount} added · `}
              more files, more findings
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {OPTIONAL_REPORTS.map((type) => (
              <ReportTile
                key={type}
                signature={REPORT_SIGNATURES[type]}
                onValidFile={(file) => handleValidFile(type, file)}
                onClear={() => handleClear(type)}
              />
            ))}
          </div>
        </motion.div>

        {/* Footer row: privacy left, action right */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-8 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground sm:justify-start">
            <Lock className="size-3" />
            Encrypted in transit &amp; at rest.
          </p>
          <Button
            onClick={handleRunAudit}
            disabled={!allUploaded || isSubmitting}
            size="lg"
            className="w-full sm:w-auto sm:min-w-[240px]"
          >
            {isSubmitting
              ? "Uploading..."
              : allUploaded
                ? "Run audit"
                : `Upload ${remainingCount} more report${remainingCount !== 1 ? "s" : ""}`}
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
