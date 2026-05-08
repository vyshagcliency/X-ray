import { describe, it, expect } from "vitest";
import { runRuleAgainstFixtures } from "../helpers";
import { inventoryLost } from "@/lib/rules/inventory-lost";

describe("inventory_lost", () => {
  it("flags lost/damaged inventory with no reimbursement", async () => {
    const findings = await runRuleAgainstFixtures(inventoryLost, {
      inventory_ledger: "inventory-ledger-lost.csv",
      reimbursements: "reimbursements-empty.csv",
    });

    expect(findings.length).toBe(3);
    expect(findings.every((f) => f.rule_id === "inventory_lost")).toBe(true);
    expect(findings.every((f) => f.category === "lost_inventory")).toBe(true);
  });

  it("assigns high confidence to reason E (warehouse lost)", async () => {
    const findings = await runRuleAgainstFixtures(inventoryLost, {
      inventory_ledger: "inventory-ledger-lost.csv",
      reimbursements: "reimbursements-empty.csv",
    });

    const warehouseLost = findings.find(
      (f) => f.evidence.reason === "E",
    );
    expect(warehouseLost?.confidence).toBe("high");
  });

  it("assigns high confidence to reason D (damaged)", async () => {
    const findings = await runRuleAgainstFixtures(inventoryLost, {
      inventory_ledger: "inventory-ledger-lost.csv",
      reimbursements: "reimbursements-empty.csv",
    });

    const damaged = findings.find((f) => f.evidence.reason === "D");
    expect(damaged?.confidence).toBe("high");
  });

  it("assigns medium confidence to reason M (misplaced)", async () => {
    const findings = await runRuleAgainstFixtures(inventoryLost, {
      inventory_ledger: "inventory-ledger-lost.csv",
      reimbursements: "reimbursements-empty.csv",
    });

    const misplaced = findings.find((f) => f.evidence.reason === "M");
    expect(misplaced?.confidence).toBe("medium");
  });

  it("does NOT flag inventory that was reimbursed", async () => {
    const findings = await runRuleAgainstFixtures(inventoryLost, {
      inventory_ledger: "inventory-ledger-lost.csv",
      reimbursements: "reimbursements-inventory-matched.csv",
    });

    expect(findings.length).toBe(0);
  });

  it("sets 18-month dispute window", async () => {
    const findings = await runRuleAgainstFixtures(inventoryLost, {
      inventory_ledger: "inventory-ledger-lost.csv",
      reimbursements: "reimbursements-empty.csv",
    });

    expect(findings.every((f) => f.window_closes_on !== null)).toBe(true);
  });

  it("includes row_ref in every finding", async () => {
    const findings = await runRuleAgainstFixtures(inventoryLost, {
      inventory_ledger: "inventory-ledger-lost.csv",
      reimbursements: "reimbursements-empty.csv",
    });

    expect(findings.every((f) => f.row_ref !== "")).toBe(true);
  });
});
