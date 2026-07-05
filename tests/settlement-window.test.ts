import { describe, it, expect } from "vitest";
import path from "path";
import { getSettlementMonths } from "@/lib/duckdb/settlement-window";

const fixture = (name: string) => path.resolve(__dirname, "fixtures", name);

describe("getSettlementMonths", () => {
  it("computes the inclusive whole-month span from the settlement date range", async () => {
    // 2024-01-15 → 2024-12-10 spans 12 months inclusive.
    const months = await getSettlementMonths(fixture("settlement-dated.csv"));
    expect(months).toBe(12);
  });

  it("returns null when the export has no usable date column", async () => {
    const months = await getSettlementMonths(fixture("settlement-undated.csv"));
    expect(months).toBeNull();
  });

  it("treats a quote in the path as a literal filename, not injectable SQL", async () => {
    // With the URL bound as a parameter, this resolves to a (missing) file rather than
    // breaking out of a string literal; the error is caught and null returned.
    const months = await getSettlementMonths("/nonexistent/x'; SELECT 1;--.csv");
    expect(months).toBeNull();
  });
});
