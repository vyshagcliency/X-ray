import { describe, it, expect } from "vitest";
import { stripEmDashes } from "@/lib/report/text";

describe("stripEmDashes", () => {
  it("replaces an em dash with a comma", () => {
    expect(stripEmDashes("overcharges — and it compounds")).toBe(
      "overcharges, and it compounds",
    );
  });
  it("handles an em dash with no surrounding spaces", () => {
    expect(stripEmDashes("Estimated—flagged")).toBe("Estimated, flagged");
  });
  it("leaves en-dash ranges intact", () => {
    expect(stripEmDashes("8–14 days and 2024–25")).toBe("8–14 days and 2024–25");
  });
  it("does not create a double comma", () => {
    expect(stripEmDashes("fee, — you were billed")).toBe("fee, you were billed");
  });
  it("is a no-op on clean text", () => {
    expect(stripEmDashes("a clean sentence")).toBe("a clean sentence");
  });
});
