import { describe, it, expect } from "vitest";
import { runRuleAgainstFixtures } from "../helpers";
import { returnsGap } from "@/lib/rules/returns-gap";

describe("returns_gap", () => {
  it("flags damaged returns with no corresponding reimbursement", async () => {
    const findings = await runRuleAgainstFixtures(returnsGap, {
      returns: "returns-with-gap.csv",
      reimbursements: "reimbursements-empty.csv",
      inventory_ledger: "inventory-ledger-empty.csv",
    });

    expect(findings.length).toBe(3);
    expect(findings.every((f) => f.rule_id === "returns_gap")).toBe(true);
    expect(findings.every((f) => f.category === "returns")).toBe(true);
    expect(findings.every((f) => f.window_closes_on !== null)).toBe(true);
  });

  it("assigns high confidence to DEFECTIVE disposition", async () => {
    const findings = await runRuleAgainstFixtures(returnsGap, {
      returns: "returns-with-gap.csv",
      reimbursements: "reimbursements-empty.csv",
      inventory_ledger: "inventory-ledger-empty.csv",
    });

    const defective = findings.find(
      (f) => f.evidence.disposition === "DEFECTIVE",
    );
    expect(defective?.confidence).toBe("high");
  });

  it("assigns medium confidence to CUSTOMER_DAMAGED disposition", async () => {
    const findings = await runRuleAgainstFixtures(returnsGap, {
      returns: "returns-with-gap.csv",
      reimbursements: "reimbursements-empty.csv",
      inventory_ledger: "inventory-ledger-empty.csv",
    });

    const customerDamaged = findings.find(
      (f) => f.evidence.disposition === "CUSTOMER_DAMAGED",
    );
    expect(customerDamaged?.confidence).toBe("medium");
  });

  it("does NOT flag a return that was already reimbursed", async () => {
    const findings = await runRuleAgainstFixtures(returnsGap, {
      returns: "returns-with-match.csv",
      reimbursements: "reimbursements-matched.csv",
      inventory_ledger: "inventory-ledger-empty.csv",
    });

    expect(findings.length).toBe(0);
  });

  it("does NOT flag a return where item was returned to sellable", async () => {
    const findings = await runRuleAgainstFixtures(returnsGap, {
      returns: "returns-with-match.csv",
      reimbursements: "reimbursements-empty.csv",
      inventory_ledger: "inventory-ledger-sellable.csv",
    });

    expect(findings.length).toBe(0);
  });

  it("includes row_ref in every finding", async () => {
    const findings = await runRuleAgainstFixtures(returnsGap, {
      returns: "returns-with-gap.csv",
      reimbursements: "reimbursements-empty.csv",
      inventory_ledger: "inventory-ledger-empty.csv",
    });

    expect(findings.every((f) => f.row_ref !== "")).toBe(true);
  });

  it("includes rule_version in every finding", async () => {
    const findings = await runRuleAgainstFixtures(returnsGap, {
      returns: "returns-with-gap.csv",
      reimbursements: "reimbursements-empty.csv",
      inventory_ledger: "inventory-ledger-empty.csv",
    });

    expect(findings.every((f) => f.rule_version === "1.0.0")).toBe(true);
  });
});
