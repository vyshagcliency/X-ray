/**
 * Removes em dashes from customer-facing copy (they read as AI-generated).
 * En dashes (– used for ranges like "8–14 days", "2024–25") are preserved.
 * Applied at the render boundary to baked narrative in report_data so existing
 * reports become em-dash-free without a worker re-run. The PDF is untouched.
 */
export function stripEmDashes(text: string): string {
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}
