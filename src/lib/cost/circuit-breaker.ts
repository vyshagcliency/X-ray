import { getAuditCostCents } from "./record";

const DEFAULT_MAX_COST_CENTS = 5000; // $50

/**
 * Check whether the audit has exceeded the per-audit cost cap.
 * Returns { exceeded: false } if safe to proceed, or { exceeded: true, totalCents, maxCents }
 * if the cap has been hit.
 *
 * Read MAX_COST_PER_AUDIT_CENTS from env at call time (not import time)
 * so tests can override it.
 */
export async function checkCostBreaker(auditId: string): Promise<
  | { exceeded: false; totalCents: number; maxCents: number }
  | { exceeded: true; totalCents: number; maxCents: number }
> {
  const maxCents = Number(process.env.MAX_COST_PER_AUDIT_CENTS) || DEFAULT_MAX_COST_CENTS;
  const totalCents = await getAuditCostCents(auditId);

  return {
    exceeded: totalCents >= maxCents,
    totalCents,
    maxCents,
  };
}
