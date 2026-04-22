"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function handleApprove() {
    setLoading(true);
    const res = await fetch("/api/admin/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auditId: params.id }),
    });
    if (res.ok) {
      router.push("/admin");
    }
    setLoading(false);
  }

  async function handleReject() {
    setLoading(true);
    await fetch("/api/admin/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auditId: params.id, reason: rejectReason }),
    });
    router.push("/admin");
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">Review Audit</h1>
      <p className="mt-2 text-muted-foreground">
        Audit ID: {params.id}
      </p>

      <div className="mt-4">
        <a
          href={`/r/${params.id}`}
          target="_blank"
          rel="noopener"
          className="text-sm underline"
        >
          View report in new tab
        </a>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleApprove} disabled={loading} className="w-full">
            Approve &amp; Send Email
          </Button>

          <div>
            <label className="text-sm font-medium" htmlFor="rejectReason">
              Rejection reason (optional)
            </label>
            <textarea
              id="rejectReason"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          <Button
            onClick={handleReject}
            disabled={loading}
            variant="destructive"
            className="w-full"
          >
            Reject
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
