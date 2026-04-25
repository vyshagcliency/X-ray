import { formatDollars, formatDollarsExact } from "@/lib/format";

/**
 * LLM output validation — ensures no invented dollar amounts.
 *
 * Every $X substring in LLM output must match a known findings.amount_cents value.
 * Mismatches fall back to template prose + flag to admin.
 *
 * Also rejects shorthand like $147k, $1.2M (per decisions.md 2026-04-18).
 */

interface ValidationResult {
  valid: boolean;
  /** Dollar strings found in the text that don't match any known amount */
  inventedAmounts: string[];
  /** Dollar strings found in the text that match known amounts */
  matchedAmounts: string[];
  /** Shorthand amounts found (e.g., $147k, $1.2M) — always invalid */
  shorthandAmounts: string[];
}

/**
 * Validate that all dollar amounts in LLM-generated text match known finding amounts.
 *
 * @param text - The LLM-generated text to validate
 * @param knownAmountsCents - Array of known findings.amount_cents values
 */
export function validateLlmOutput(
  text: string,
  knownAmountsCents: number[],
): ValidationResult {
  // Build set of valid formatted dollar strings from known amounts
  const validDollarStrings = new Set<string>();
  for (const cents of knownAmountsCents) {
    validDollarStrings.add(formatDollars(cents));
    validDollarStrings.add(formatDollarsExact(cents));
  }

  // Also add aggregate totals (sum of all, and partial sums)
  const total = knownAmountsCents.reduce((sum, c) => sum + c, 0);
  validDollarStrings.add(formatDollars(total));
  validDollarStrings.add(formatDollarsExact(total));

  // Check for shorthand amounts ($147k, $1.2M, etc.) — always invalid
  const shorthandRegex = /\$[\d,.]+[kKmMbB]\b/g;
  const shorthandAmounts = [...text.matchAll(shorthandRegex)].map(
    (m) => m[0],
  );

  // Extract all dollar amounts from the text
  // Matches: $1, $12, $123, $1,234, $12,345.67, etc.
  const dollarRegex = /\$[\d,]+(?:\.\d{1,2})?/g;
  const foundAmounts = [...text.matchAll(dollarRegex)].map((m) => m[0]);

  const matchedAmounts: string[] = [];
  const inventedAmounts: string[] = [];

  for (const amount of foundAmounts) {
    // Skip if it was caught as shorthand (the shorthand regex may overlap)
    if (shorthandAmounts.some((s) => s.startsWith(amount))) continue;

    if (validDollarStrings.has(amount)) {
      matchedAmounts.push(amount);
    } else {
      inventedAmounts.push(amount);
    }
  }

  return {
    valid: inventedAmounts.length === 0 && shorthandAmounts.length === 0,
    inventedAmounts,
    matchedAmounts,
    shorthandAmounts,
  };
}

/**
 * Sanitize LLM output by replacing invented dollar amounts with [AMOUNT REDACTED].
 * Returns the sanitized text and whether any replacements were made.
 */
export function sanitizeLlmOutput(
  text: string,
  knownAmountsCents: number[],
): { sanitized: string; hadReplacements: boolean } {
  const validation = validateLlmOutput(text, knownAmountsCents);

  if (validation.valid) {
    return { sanitized: text, hadReplacements: false };
  }

  let sanitized = text;

  // Replace shorthand amounts
  for (const amount of validation.shorthandAmounts) {
    sanitized = sanitized.replaceAll(amount, "[AMOUNT REDACTED]");
  }

  // Replace invented amounts
  for (const amount of validation.inventedAmounts) {
    sanitized = sanitized.replaceAll(amount, "[AMOUNT REDACTED]");
  }

  return { sanitized, hadReplacements: true };
}
