interface FindingLike {
  category: string;
  amount_cents: number;
  window_days_remaining: number | null;
  evidence: Record<string, unknown>;
}
export interface ClosingSoonRow {
  category: string;
  sku: string;
  amountCents: number;
  daysRemaining: number;
}

/** Provable findings whose dispute window closes within `maxDays`, for the Deadlines
 *  list. Estimated categories are excluded so this reconciles with the hero urgency $.
 *  Uses only real finding fields (no computed figures). */
export function deriveClosingSoon(
  findings: FindingLike[],
  estimatedCategories: Set<string>,
  maxDays = 14,
): ClosingSoonRow[] {
  return findings
    .filter(
      (f) =>
        !estimatedCategories.has(f.category) &&
        f.window_days_remaining !== null &&
        f.window_days_remaining >= 0 &&
        f.window_days_remaining <= maxDays,
    )
    .map((f) => ({
      category: f.category,
      sku: String(f.evidence?.sku ?? f.evidence?.order_id ?? "N/A"),
      amountCents: f.amount_cents,
      daysRemaining: f.window_days_remaining as number,
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining || b.amountCents - a.amountCents);
}
