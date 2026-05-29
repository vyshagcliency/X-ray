"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield } from "lucide-react";
import { motion } from "motion/react";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportTile } from "@/components/upload/ReportTile";
import { REPORT_SIGNATURES } from "@/lib/csv/headers";

const REQUIRED_REPORTS = ["reimbursements", "returns", "inventory_ledger"] as const;


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

      router.push(`/run/${id}`);
    } catch {
      alert("Upload failed. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  };

  const uploadedCount = Object.keys(files).length;
  const remainingCount = REQUIRED_REPORTS.length - uploadedCount;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute -left-32 top-20 size-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-20 size-72 rounded-full bg-emerald-500/5 blur-3xl" />

      <NavBar />

      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Step 2 of 3</Badge>
            <span className="text-sm text-muted-foreground">
              {uploadedCount} of {REQUIRED_REPORTS.length} uploaded
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight lg:text-3xl">
            Upload your Seller Central reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload the 3 required reports below. We&apos;ll validate each one instantly.
          </p>
        </motion.div>

        {/* Report tiles */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mt-6 space-y-3"
        >
          {REQUIRED_REPORTS.map((type) => (
            <ReportTile
              key={type}
              signature={REPORT_SIGNATURES[type]}
              onValidFile={(file) => handleValidFile(type, file)}
              onClear={() => handleClear(type)}
            />
          ))}
        </motion.div>

        {/* Run button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-6"
        >
          <Button
            onClick={handleRunAudit}
            disabled={!allUploaded || isSubmitting}
            size="lg"
            className="w-full"
          >
            {isSubmitting
              ? "Uploading..."
              : allUploaded
                ? "Run audit"
                : `Upload ${remainingCount} more report${remainingCount !== 1 ? "s" : ""}`}
          </Button>
        </motion.div>

        {/* Privacy note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          <Lock className="size-3" />
          Encrypted in transit & at rest. Raw files auto-deleted after 30 days.
          <Shield className="ml-1 size-3" />
          Never shared.
        </motion.p>
      </main>
    </div>
  );
}
