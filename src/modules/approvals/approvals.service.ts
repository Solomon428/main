// ============================================================================
// Approvals Service
// ============================================================================

import { prisma } from "../../db/prisma";

interface DecisionData {
  decision: "APPROVED" | "REJECTED" | string;
  notes?: string;
}

interface DelegationData {
  approvalChainId?: string;
  delegatorId: string;
  delegateeId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  scope?: string;
}

export async function listPendingApprovals() {
  return prisma.approval.findMany({
    where: {
      status: "PENDING",
    },
    include: {
      invoice: {
        include: {
          supplier: true,
        },
      },
      approver: true,
    },
    orderBy: { slaDueDate: "asc" },
  });
}

export async function getApproval(id: string) {
  return prisma.approval.findUnique({
    where: { id },
    include: {
      invoice: {
        include: {
          supplier: true,
          lineItems: true,
        },
      },
      approver: true,
      approvalChain: true,
    },
  });
}

export async function makeDecision(id: string, data: DecisionData) {
  return prisma.approval.update({
    where: { id },
    data: {
      status: data.decision,
      decision: data.decision,
      decisionNotes: data.notes,
      approvedAt: data.decision === "APPROVED" ? new Date() : null,
      rejectedAt: data.decision === "REJECTED" ? new Date() : null,
      actionedAt: new Date(),
    },
    include: {
      invoice: {
        include: {
          supplier: true,
          lineItems: true,
        },
      },
      approver: true,
      approvalChain: true,
    },
  });
}

export async function listApprovalChains() {
  return prisma.approvalChain.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function delegateApproval(data: DelegationData) {
  return prisma.delegatedApproval.create({
    data: {
      approvalChainId: data.approvalChainId,
      delegatorId: data.delegatorId,
      delegateeId: data.delegateeId,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: true,
      reason: data.reason,
      scope: data.scope || "ALL",
    },
    include: {
      delegator: true,
      delegatee: true,
    },
  });
}

export async function getDelegatedApprovals(userId: string) {
  return prisma.delegatedApproval.findMany({
    where: {
      OR: [{ delegatorId: userId }, { delegateeId: userId }],
      isActive: true,
    },
    include: {
      delegator: true,
      delegatee: true,
    },
  });
}
