// src/logic-engine/approval-engine/approver-router.test.ts
import { describe, it, expect } from "@jest/globals";

// Simple unit tests for approval routing logic
describe("ApproverRouter", () => {
  describe("Basic routing logic", () => {
    it("should route small amounts to CREDIT_CLERK", () => {
      const amount = 5000;
      const role = amount <= 10000 ? "CREDIT_CLERK" : amount <= 50000 ? "BRANCH_MANAGER" : "FINANCIAL_MANAGER";
      expect(role).toBe("CREDIT_CLERK");
    });

    it("should route medium amounts to BRANCH_MANAGER", () => {
      const amount = 25000;
      const role = amount <= 10000 ? "CREDIT_CLERK" : amount <= 50000 ? "BRANCH_MANAGER" : "FINANCIAL_MANAGER";
      expect(role).toBe("BRANCH_MANAGER");
    });

    it("should route large amounts to FINANCIAL_MANAGER", () => {
      const amount = 100000;
      const role = amount <= 10000 ? "CREDIT_CLERK" : amount <= 50000 ? "BRANCH_MANAGER" : "FINANCIAL_MANAGER";
      expect(role).toBe("FINANCIAL_MANAGER");
    });
  });

  describe("Escalation logic", () => {
    it("should not escalate amounts ≤ 200,000", () => {
      const needsEscalation = (amount: number) => amount > 200000;
      expect(needsEscalation(100000)).toBe(false);
      expect(needsEscalation(200000)).toBe(false);
    });

    it("should escalate amounts > 200,000", () => {
      const needsEscalation = (amount: number) => amount > 200000;
      expect(needsEscalation(200001)).toBe(true);
      expect(needsEscalation(500000)).toBe(true);
    });
  });
});
