"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Trash2, Eye, Server } from "lucide-react";
import { motion } from "motion/react";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportTile } from "@/components/upload/ReportTile";
import { REPORT_SIGNATURES } from "@/lib/csv/headers";

const REQUIRED_REPORTS = ["reimbursements", "returns", "inventory_ledger"] as const;

const PRIVACY_BULLETS = [
  { icon: Lock, text: "Your files are encrypted in transit and at rest" },
  { icon: Trash2, text: "Original CSV files are deleted after 30 days" },
  { icon: Server, text: "A compact derivative is retained so your report stays accessible" },
  { icon: Eye, text: "Your data is never shared with third parties" },
  { icon: Shield, text: "Request full deletion anytime via your report email" },
];

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute -left-32 top-20 size-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-20 size-72 rounded-full bg-emerald-500/5 blur-3xl" />

      <NavBar />

      <main className="relative mx-auto max-w-3xl px-6 py-12 lg:py-16">
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
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Upload your Seller Central reports
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Upload the 3 required reports below. We&apos;ll validate each one instantly before
            processing.
          </p>
        </motion.div>

        {/* Report tiles */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mt-8 space-y-4"
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
          className="mt-8"
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

        {/* Privacy bullets */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-10 rounded-lg border border-border/60 bg-white/70 p-4 shadow-sm"
        >
          <ul className="space-y-2">
            {PRIVACY_BULLETS.map((b) => (
              <li key={b.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <b.icon className="size-4 shrink-0" />
                {b.text}
              </li>
            ))}
          </ul>
        </motion.div>
      </main>
    </div>
  );
}
