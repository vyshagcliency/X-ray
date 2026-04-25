"use client";

import { useState } from "react";
import { Shield, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DeletionPage({
  params,
  searchParams,
}: {
  params: Promise<{ audit_id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [status, setStatus] = useState<"confirm" | "submitting" | "done" | "error">("confirm");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDelete() {
    setStatus("submitting");
    const { audit_id } = await params;
    const { token } = await searchParams;

    try {
      const res = await fetch("/api/deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit_id, token }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error ?? "Something went wrong");
        setStatus("error");
        return;
      }

      setStatus("done");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h1 className="text-xl font-bold mb-2">Deletion Request Received</h1>
            <p className="text-sm text-muted-foreground">
              Your data deletion request has been submitted. We will process it
              within 7 days. All raw files, findings, and report data associated
              with this audit will be permanently removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-xl font-bold">Delete Your Data</h1>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            This will permanently delete all data associated with your audit:
          </p>

          <ul className="text-sm text-muted-foreground mb-6 space-y-2">
            <li className="flex items-start gap-2">
              <Trash2 className="h-4 w-4 mt-0.5 shrink-0" />
              Original CSV files (if still stored)
            </li>
            <li className="flex items-start gap-2">
              <Trash2 className="h-4 w-4 mt-0.5 shrink-0" />
              Derived data files and findings
            </li>
            <li className="flex items-start gap-2">
              <Trash2 className="h-4 w-4 mt-0.5 shrink-0" />
              Generated report and PDF
            </li>
            <li className="flex items-start gap-2">
              <Trash2 className="h-4 w-4 mt-0.5 shrink-0" />
              Your email and brand name
            </li>
          </ul>

          <p className="text-xs text-muted-foreground mb-6">
            This action cannot be undone. Your report URL will stop working.
            Deletion will be processed within 7 days.
          </p>

          {status === "error" && (
            <p className="text-sm text-destructive mb-4">{errorMsg}</p>
          )}

          <Button
            onClick={handleDelete}
            disabled={status === "submitting"}
            variant="destructive"
            className="w-full"
          >
            {status === "submitting"
              ? "Submitting..."
              : "Confirm Deletion"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
