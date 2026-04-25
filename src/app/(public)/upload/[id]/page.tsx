"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Trash2, Eye, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportTile } from "@/components/upload/ReportTile";
import { REPORT_SIGNATURES } from "@/lib/csv/headers";

const REQUIRED_REPORTS = ["reimbursements", "returns", "adjustments"] as const;

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

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold">Upload your Seller Central reports</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload the 3 required reports below. We&apos;ll validate each one instantly before
        processing.
      </p>

      {/* Privacy bullets */}
      <div className="mt-6 rounded-lg border bg-muted/30 p-4">
        <ul className="space-y-2">
          {PRIVACY_BULLETS.map((b) => (
            <li key={b.text} className="flex items-center gap-3 text-sm text-muted-foreground">
              <b.icon className="size-4 shrink-0" />
              {b.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Report tiles */}
      <div className="mt-8 space-y-4">
        {REQUIRED_REPORTS.map((type) => (
          <ReportTile
            key={type}
            signature={REPORT_SIGNATURES[type]}
            onValidFile={(file) => handleValidFile(type, file)}
            onClear={() => handleClear(type)}
          />
        ))}
      </div>

      {/* Run button */}
      <div className="mt-8">
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
              : `Upload ${REQUIRED_REPORTS.length - Object.keys(files).length} more report${Object.keys(files).length < 2 ? "s" : ""}`}
        </Button>
      </div>
    </main>
  );
}
