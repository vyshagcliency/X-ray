import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { z } from "zod";

const deletionSchema = z.object({
  audit_id: z.string().uuid(),
  token: z.string().min(1).optional(),
});

/**
 * POST /api/deletion
 *
 * Accepts a deletion request for an audit.
 * Phase 1: writes a deletion_requests row for manual admin processing.
 * Phase 2: automated cascade wipe.
 *
 * Returns 200 regardless of whether audit exists (don't reveal existence).
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const parsed = deletionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const { audit_id } = parsed.data;
  const db = supabaseAdmin();

  // Check if a deletion request already exists
  const { data: existing } = await db
    .from("deletion_requests")
    .select("id")
    .eq("audit_id", audit_id)
    .limit(1);

  if (existing && existing.length > 0) {
    // Already requested — return success silently
    return NextResponse.json({ success: true });
  }

  // Insert deletion request (manual processing in Phase 1)
  await db.from("deletion_requests").insert({
    audit_id,
    status: "pending",
  });

  // Record event
  await db.from("audit_events").insert({
    audit_id,
    stage: "deletion.requested",
    status: "completed",
    metadata: { source: "user" },
  });

  return NextResponse.json({ success: true });
}
