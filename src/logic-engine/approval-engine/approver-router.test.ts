// src/logic-engine/approval-engine/approver-router.test.ts
import { describe, it, expect } from "@jest/globals";
import { ApproverRouter } from "./approver-router";

describe("ApproverRouter", () => {
  const router = new ApproverRouter();

  describe("routeInvoice", () => {
    it("should route ≤ ZAR 10,000 to CREDIT_CLERK", () => {
      expect(router.routeInvoice(5000)).toBe("CREDIT_CLERK");
      expect(router.routeInvoice(10000)).toBe("CREDIT_CLERK");
    });

    it("should route ≤ ZAR 50,000 to BRANCH_MANAGER", () => {
      expect(router.routeInvoice(25000)).toBe("BRANCH_MANAGER");
      expect(router.routeInvoice(50000)).toBe("BRANCH_MANAGER");
    });

    it("should route ≤ ZAR 200,000 to FINANCIAL_MANAGER", () => {
      expect(router.routeInvoice(100000)).toBe("FINANCIAL_MANAGER");
      expect(router.routeInvoice(200000)).toBe("FINANCIAL_MANAGER");
    });

    it("should route ≤ ZAR 1,000,000 to EXECUTIVE", () => {
      expect(router.routeInvoice(500000)).toBe("EXECUTIVE");
      expect(router.routeInvoice(1000000)).toBe("EXECUTIVE");
    });

    it("should route > ZAR 1,000,000 to GROUP_FINANCIAL_MANAGER", () => {
      expect(router.routeInvoice(1500000)).toBe("GROUP_FINANCIAL_MANAGER");
      expect(router.routeInvoice(2000000)).toBe("GROUP_FINANCIAL_MANAGER");
    });
  });

  describe("needsEscalation", () => {
    it("should return false for amounts ≤ 200,000", () => {
      expect(router.needsEscalation(100000)).toBe(false);
      expect(router.needsEscalation(200000)).toBe(false);
    });

    it("should return true for amounts > 200,000", () => {
      expect(router.needsEscalation(200001)).toBe(true);
      expect(router.needsEscalation(500000)).toBe(true);
    });
  });
});
