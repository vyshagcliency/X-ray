import { supabaseAdmin } from "@/lib/db/supabase";

export type CostComponent =
  | "compute"
  | "llm_narrate"
  | "llm_dispute"
  | "pdf_render"
  | "email"
  | "storage";

interface RecordCostParams {
  auditId: string;
  component: CostComponent;
  amountCents: number;
  metadata?: Record<string, unknown>;
}

/**
 * Write a cost_events row for per-audit cost tracking.
 * All amounts are in cents (integer).
 */
export async function recordCost({
  auditId,
  component,
  amountCents,
  metadata,
}: RecordCostParams): Promise<void> {
  const db = supabaseAdmin();

  await db.from("cost_events").insert({
    audit_id: auditId,
    component,
    amount_cents: amountCents,
    metadata: metadata ?? null,
  });
}

/**
 * Get the running total cost for an audit in cents.
 */
export async function getAuditCostCents(auditId: string): Promise<number> {
  const db = supabaseAdmin();

  const { data } = await db
    .from("cost_events")
    .select("amount_cents")
    .eq("audit_id", auditId);

  if (!data || data.length === 0) return 0;

  return data.reduce(
    (sum: number, row: { amount_cents: number }) => sum + row.amount_cents,
    0,
  );
}
