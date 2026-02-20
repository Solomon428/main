// ============================================================================
// Risk Scores Service
// ============================================================================

import { prisma } from "../../db/prisma";

export async function listRiskScores() {
  return prisma.riskScore.findMany({
    include: {
      invoice: true,
      supplier: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRiskScoreByEntity(entityId: string) {
  return prisma.riskScore.findFirst({
    where: {
      OR: [{ invoiceId: entityId }, { supplierId: entityId }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function calculateRiskScore(data: any) {
  // Implementation for risk score calculation
  const score = calculateRiskAlgorithm(data);

  return prisma.riskScore.create({
    data: {
      ...data,
      score,
      level: getRiskLevel(score),
      assessedAt: new Date(),
    },
  });
}

export async function updateRiskScore(id: string, data: any) {
  return prisma.riskScore.update({
    where: { id },
    data,
  });
}

export async function getRiskReport(organizationId: string) {
  const scores = await prisma.riskScore.findMany({
    where: { organizationId },
    include: {
      invoice: true,
      supplier: true,
    },
  });

  return {
    totalScores: scores.length,
    highRiskCount: scores.filter((s) => s.level === "HIGH").length,
    criticalRiskCount: scores.filter((s) => s.level === "CRITICAL").length,
    averageScore:
      scores.reduce((acc, s) => acc + s.score.toNumber(), 0) / scores.length ||
      0,
    scores,
  };
}

// Helper functions
function calculateRiskAlgorithm(data: any): number {
  // Placeholder for actual risk calculation algorithm
  let score = 50;

  if (data.amount > 100000) score += 20;
  if (data.supplierRisk === "HIGH") score += 15;
  if (data.isNewSupplier) score += 10;

  return Math.min(100, score);
}

function getRiskLevel(score: number): string {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}
