// ============================================================================
// Compliance Checks Service
// ============================================================================

import { prisma } from "../../db/prisma";

export async function runComplianceCheck(data: any) {
  // Implementation for compliance check
  const results = await performComplianceChecks(data);

  return prisma.complianceCheck.create({
    data: {
      ...data,
      status: results.passed ? "COMPLIANT" : "NON_COMPLIANT",
      details: results,
      createdAt: new Date(),
    },
  });
}

export async function getComplianceStatus(invoiceId: string) {
  const checks = await prisma.complianceCheck.findMany({
    where: { invoiceId },
    orderBy: { createdAt: "desc" },
  });

  return {
    invoiceId,
    overallStatus: checks.every((c) => c.status === "COMPLIANT")
      ? "COMPLIANT"
      : "NON_COMPLIANT",
    checks,
    lastChecked: checks[0]?.createdAt || null,
  };
}

export async function overrideCompliance(data: any) {
  return prisma.complianceCheck.update({
    where: { id: data.checkId },
    data: {
      status: "COMPLIANT",
      validatorNotes: data.notes,
      remediatedAt: new Date(),
      remediatedBy: data.userId,
    },
  });
}

// Helper function
async function performComplianceChecks(data: any) {
  // Placeholder for actual compliance check logic
  return {
    passed: true,
    checks: [
      { name: "VAT Validation", passed: true },
      { name: "Tax ID Validation", passed: true },
      { name: "Duplicate Check", passed: true },
    ],
  };
}
