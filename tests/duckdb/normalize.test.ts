import { describe, it, expect } from "vitest";
import { normalizeDuckDBValue, normalizeDuckDBRow } from "@/lib/duckdb/normalize";

describe("normalizeDuckDBValue", () => {
  it("coerces a safe-range bigint to a Number", () => {
    expect(normalizeDuckDBValue(42n)).toBe(42);
    expect(typeof normalizeDuckDBValue(42n)).toBe("number");
  });

  it("keeps a bigint beyond 2^53 as a full-precision string (no lossy Number)", () => {
    const huge = BigInt(Number.MAX_SAFE_INTEGER) + 10n;
    expect(normalizeDuckDBValue(huge)).toBe(huge.toString());
  });

  it("passes through JSON-native primitives unchanged", () => {
    expect(normalizeDuckDBValue("SELLABLE")).toBe("SELLABLE");
    expect(normalizeDuckDBValue(15.5)).toBe(15.5);
    expect(normalizeDuckDBValue(null)).toBe(null);
    expect(normalizeDuckDBValue(true)).toBe(true);
  });

  it("normalizes every value in a row and leaves it JSON-safe", () => {
    const row = normalizeDuckDBRow({ sku: "A", qty: 5n });
    expect(row).toEqual({ sku: "A", qty: 5 });
    expect(() => JSON.stringify(row)).not.toThrow();
  });
});
