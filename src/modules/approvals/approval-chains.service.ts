// ============================================================================
// Approval Chains Service
// ============================================================================

import { prisma } from "../../db/prisma";
import { ApprovalChainType } from "../../domain/enums/ApprovalChainType";
import { Currency } from "../../domain/enums/Currency";

export interface ApprovalLevel {
  level: number;
  name: string;
  approverIds?: string[];
  approverRoles?: string[];
  minAmount?: number;
  maxAmount?: number;
  requireAll?: boolean;
  autoEscalationHours?: number;
}

export interface CreateApprovalChainInput {
  organizationId: string;
  name: string;
  description?: string;
  type?: ApprovalChainType;
  department?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  currency?: Currency;
  levels: ApprovalLevel[];
  approverRoles?: string[];
  specificApprovers?: string[];
  alternateApprovers?: string[];
  autoEscalation?: boolean;
  escalationHours?: number;
  reminderHours?: number;
  allowDelegation?: boolean;
  requireAllApprovers?: boolean;
  conditions?: Record<string, unknown>;
  rules?: Record<string, unknown>;
  priority?: number;
}

export interface UpdateApprovalChainInput extends Partial<CreateApprovalChainInput> {
  isActive?: boolean;
}

/**
 * List all approval chains for an organization
 */
export async function listApprovalChains(
  organizationId: string,
  options?: {
    isActive?: boolean;
    department?: string;
    page?: number;
    limit?: number;
  },
) {
  const where: any = { organizationId };

  if (options?.isActive !== undefined) {
    where.isActive = options.isActive;
  }

  if (options?.department) {
    where.department = options.department;
  }

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const [chains, total] = await Promise.all([
    prisma.approvalChain.findMany({
      where,
      include: {
        approvals: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.approvalChain.count({ where }),
  ]);

  return {
    chains,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a specific approval chain by ID
 */
export async function getApprovalChain(id: string) {
  return prisma.approvalChain.findUnique({
    where: { id },
    include: {
      approvals: {
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      delegatedApprovals: {
        where: { isActive: true },
        include: {
          delegator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          delegatee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Create a new approval chain
 */
export async function createApprovalChain(data: CreateApprovalChainInput) {
  return prisma.approvalChain.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      description: data.description,
      type: data.type || ApprovalChainType.SEQUENTIAL,
      department: data.department,
      category: data.category,
      minAmount: data.minAmount || 0,
      maxAmount: data.maxAmount,
      currency: data.currency || Currency.ZAR,
      levels: data.levels as any,
      approverRoles: data.approverRoles || [],
      specificApprovers: data.specificApprovers || [],
      alternateApprovers: data.alternateApprovers || [],
      autoEscalation: data.autoEscalation ?? true,
      escalationHours: data.escalationHours || 24,
      reminderHours: data.reminderHours || 12,
      allowDelegation: data.allowDelegation ?? true,
      requireAllApprovers: data.requireAllApprovers ?? false,
      conditions: (data.conditions || {}) as any,
      rules: (data.rules || {}) as any,
      priority: data.priority || 0,
      isActive: true,
    },
  });
}

/**
 * Update an existing approval chain
 */
export async function updateApprovalChain(
  id: string,
  data: UpdateApprovalChainInput,
) {
  const updateData: any = {
    ...data,
    updatedAt: new Date(),
  };
  
  if (data.levels) {
    updateData.levels = data.levels;
  }
  if (data.conditions) {
    updateData.conditions = data.conditions;
  }
  if (data.rules) {
    updateData.rules = data.rules;
  }

  return prisma.approvalChain.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Delete an approval chain
 */
export async function deleteApprovalChain(id: string) {
  // Check if chain has any active approvals
  const activeApprovals = await prisma.approval.count({
    where: {
      approvalChainId: id,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
  });

  if (activeApprovals > 0) {
    throw new Error("Cannot delete approval chain with active approvals");
  }

  return prisma.approvalChain.delete({
    where: { id },
  });
}

/**
 * Soft delete an approval chain (deactivate)
 */
export async function deactivateApprovalChain(id: string) {
  return prisma.approvalChain.update({
    where: { id },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });
}

/**
 * Find matching approval chain for an invoice
 */
export async function findMatchingApprovalChain(
  organizationId: string,
  criteria: {
    amount: number;
    department?: string;
    category?: string;
    currency?: Currency;
  },
) {
  const chains = await prisma.approvalChain.findMany({
    where: {
      organizationId,
      isActive: true,
      minAmount: { lte: criteria.amount },
      OR: [{ maxAmount: null }, { maxAmount: { gte: criteria.amount } }],
      AND: [
        {
          OR: [{ department: null }, { department: criteria.department }],
        },
        {
          OR: [{ category: null }, { category: criteria.category }],
        },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  return chains[0] || null;
}

/**
 * Add a level to an approval chain
 */
export async function addApprovalLevel(chainId: string, level: ApprovalLevel) {
  const chain = await prisma.approvalChain.findUnique({
    where: { id: chainId },
    select: { levels: true },
  });

  if (!chain) {
    throw new Error("Approval chain not found");
  }

  const currentLevels = chain.levels as unknown as ApprovalLevel[];
  const newLevels = [...currentLevels, level].sort((a, b) => a.level - b.level);

  return prisma.approvalChain.update({
    where: { id: chainId },
    data: {
      levels: newLevels as any,
      updatedAt: new Date(),
    },
  });
}

/**
 * Remove a level from an approval chain
 */
export async function removeApprovalLevel(
  chainId: string,
  levelNumber: number,
) {
  const chain = await prisma.approvalChain.findUnique({
    where: { id: chainId },
    select: { levels: true },
  });

  if (!chain) {
    throw new Error("Approval chain not found");
  }

  const currentLevels = chain.levels as unknown as ApprovalLevel[];
  const newLevels = currentLevels.filter((l) => l.level !== levelNumber);

  return prisma.approvalChain.update({
    where: { id: chainId },
    data: {
      levels: newLevels as any,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get approval chain statistics
 */
export async function getApprovalChainStats(chainId: string) {
  const [chain, stats] = await Promise.all([
    prisma.approvalChain.findUnique({
      where: { id: chainId },
      select: { id: true, name: true },
    }),
    prisma.approval.groupBy({
      by: ["status"],
      where: { approvalChainId: chainId },
      _count: { status: true },
    }),
  ]);

  if (!chain) {
    throw new Error("Approval chain not found");
  }

  const statusCounts = stats.reduce(
    (acc, stat) => {
      acc[stat.status] = stat._count.status;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    chainId: chain.id,
    chainName: chain.name,
    totalApprovals: stats.reduce((sum, s) => sum + s._count.status, 0),
    statusCounts,
  };
}

/**
 * Clone an approval chain
 */
export async function cloneApprovalChain(chainId: string, newName: string) {
  const chain = await prisma.approvalChain.findUnique({
    where: { id: chainId },
  });

  if (!chain) {
    throw new Error("Approval chain not found");
  }

  const { id, createdAt, updatedAt, deletedAt, ...chainData } = chain;

  return prisma.approvalChain.create({
    data: {
      ...chainData,
      levels: chainData.levels as any,
      conditions: chainData.conditions as any,
      rules: chainData.rules as any,
      metadata: chainData.metadata as any,
      name: newName,
      isActive: true,
    },
  });
}
