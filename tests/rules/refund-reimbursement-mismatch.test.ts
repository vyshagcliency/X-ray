import { describe, it, expect } from "vitest";
import { runRuleAgainstFixtures } from "../helpers";
import { refundReimbursementMismatch } from "@/lib/rules/refund-reimbursement-mismatch";

describe("refund_reimbursement_mismatch", () => {
  it("flags refunded returns with no corresponding reimbursement", async () => {
    const findings = await runRuleAgainstFixtures(refundReimbursementMismatch, {
      returns: "returns-refunded.csv",
      reimbursements: "reimbursements-empty.csv",
    });

    // Both returns have status "Refunded" and no reimbursement
    expect(findings.length).toBe(2);
    expect(
      findings.every(
        (f) => f.rule_id === "refund_reimbursement_mismatch",
      ),
    ).toBe(true);
    expect(findings.every((f) => f.category === "returns")).toBe(true);
  });

  it("always assigns high confidence", async () => {
    const findings = await runRuleAgainstFixtures(refundReimbursementMismatch, {
      returns: "returns-refunded.csv",
      reimbursements: "reimbursements-empty.csv",
    });

    expect(findings.every((f) => f.confidence === "high")).toBe(true);
  });

  it("does NOT flag returns that have a matching reimbursement", async () => {
    const findings = await runRuleAgainstFixtures(refundReimbursementMismatch, {
      returns: "returns-refunded.csv",
      reimbursements: "reimbursements-partial.csv",
    });

    // reimbursements-partial.csv has reimbursements for both order IDs
    expect(findings.length).toBe(0);
  });

  it("sets 90-day dispute window", async () => {
    const findings = await runRuleAgainstFixtures(refundReimbursementMismatch, {
      returns: "returns-refunded.csv",
      reimbursements: "reimbursements-empty.csv",
    });

    expect(findings.every((f) => f.window_closes_on !== null)).toBe(true);
  });

  it("includes row_ref in every finding", async () => {
    const findings = await runRuleAgainstFixtures(refundReimbursementMismatch, {
      returns: "returns-refunded.csv",
      reimbursements: "reimbursements-empty.csv",
    });

    expect(findings.every((f) => f.row_ref !== "")).toBe(true);
  });

  it("includes rule_version in every finding", async () => {
    const findings = await runRuleAgainstFixtures(refundReimbursementMismatch, {
      returns: "returns-refunded.csv",
      reimbursements: "reimbursements-empty.csv",
    });

    expect(findings.every((f) => f.rule_version === "1.0.0")).toBe(true);
  });
});
