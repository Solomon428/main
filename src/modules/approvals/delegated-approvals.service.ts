// ============================================================================
// Delegated Approvals Service
// ============================================================================

import { prisma } from '../../db/prisma';

export interface CreateDelegationInput {
  delegatorId: string;
  delegateeId: string;
  approvalChainId?: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  scope?: string;
  specificCategories?: string[];
}

export interface UpdateDelegationInput {
  endDate?: Date;
  reason?: string;
  scope?: string;
  specificCategories?: string[];
  isActive?: boolean;
}

/**
 * List all delegations for an organization
 */
export async function listDelegations(options?: {
  organizationId?: string;
  delegatorId?: string;
  delegateeId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}) {
  const where: any = {};

  if (options?.delegatorId) where.delegatorId = options.delegatorId;
  if (options?.delegateeId) where.delegateeId = options.delegateeId;
  if (options?.isActive !== undefined) where.isActive = options.isActive;

  if (options?.organizationId) {
    where.approvalChain = {
      organizationId: options.organizationId,
    };
  }

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const [delegations, total] = await Promise.all([
    prisma.delegatedApproval.findMany({
      where,
      include: {
        delegator: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        delegatee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        approvalChain: {
          select: {
            id: true,
            name: true,
            organizationId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.delegatedApproval.count({ where }),
  ]);

  return {
    delegations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a specific delegation by ID
 */
export async function getDelegation(id: string) {
  return prisma.delegatedApproval.findUnique({
    where: { id },
    include: {
      delegator: {
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          role: true,
        },
      },
      delegatee: {
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          role: true,
        },
      },
      approvalChain: {
        select: {
          id: true,
          name: true,
          department: true,
          organizationId: true,
        },
      },
    },
  });
}

/**
 * Create a new delegation
 */
export async function createDelegation(data: CreateDelegationInput) {
  // Validate dates
  if (data.endDate <= data.startDate) {
    throw new Error('End date must be after start date');
  }

  // Check for overlapping delegations
  const overlapping = await prisma.delegatedApproval.findFirst({
    where: {
      delegatorId: data.delegatorId,
      isActive: true,
      OR: [
        {
          startDate: { lte: data.endDate },
          endDate: { gte: data.startDate },
        },
      ],
    },
  });

  if (overlapping) {
    throw new Error('Overlapping delegation exists for this period');
  }

  return prisma.delegatedApproval.create({
    data: {
      delegatorId: data.delegatorId,
      delegateeId: data.delegateeId,
      approvalChainId: data.approvalChainId,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: true,
      reason: data.reason,
      scope: data.scope || 'ALL',
      specificCategories: data.specificCategories || [],
    },
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
  });
}

/**
 * Update an existing delegation
 */
export async function updateDelegation(id: string, data: UpdateDelegationInput) {
  return prisma.delegatedApproval.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
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
  });
}

/**
 * Cancel a delegation
 */
export async function cancelDelegation(
  id: string,
  cancelledBy: string,
  cancelReason?: string
) {
  return prisma.delegatedApproval.update({
    where: { id },
    data: {
      isActive: false,
      cancelledAt: new Date(),
      cancelledBy,
      cancelReason,
      updatedAt: new Date(),
    },
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
  });
}

/**
 * Get active delegations for a delegator
 */
export async function getDelegatorActiveDelegations(delegatorId: string) {
  const now = new Date();

  return prisma.delegatedApproval.findMany({
    where: {
      delegatorId,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: {
      delegatee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      approvalChain: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { endDate: 'asc' },
  });
}

/**
 * Get active delegations where user is delegatee
 */
export async function getDelegateeActiveDelegations(delegateeId: string) {
  const now = new Date();

  return prisma.delegatedApproval.findMany({
    where: {
      delegateeId,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: {
      delegator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      approvalChain: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { endDate: 'asc' },
  });
}

/**
 * Check if a user has an active delegation for an approval
 */
export async function checkDelegation(
  approverId: string,
  approvalChainId?: string
) {
  const now = new Date();

  const delegation = await prisma.delegatedApproval.findFirst({
    where: {
      delegatorId: approverId,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
      OR: [
        { approvalChainId: null },
        { approvalChainId },
      ],
    },
    include: {
      delegatee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return delegation;
}

/**
 * Get delegation history for a user
 */
export async function getUserDelegationHistory(
  userId: string,
  options?: {
    asDelegator?: boolean;
    asDelegatee?: boolean;
    page?: number;
    limit?: number;
  }
) {
  const where: any = {};

  if (options?.asDelegator && !options?.asDelegatee) {
    where.delegatorId = userId;
  } else if (options?.asDelegatee && !options?.asDelegator) {
    where.delegateeId = userId;
  } else {
    where.OR = [{ delegatorId: userId }, { delegateeId: userId }];
  }

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const [delegations, total] = await Promise.all([
    prisma.delegatedApproval.findMany({
      where,
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
        approvalChain: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.delegatedApproval.count({ where }),
  ]);

  return {
    delegations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Expire old delegations
 */
export async function expireOldDelegations() {
  const now = new Date();

  return prisma.delegatedApproval.updateMany({
    where: {
      isActive: true,
      endDate: { lt: now },
    },
    data: {
      isActive: false,
      updatedAt: now,
    },
  });
}

/**
 * Get delegation statistics for an organization
 */
export async function getDelegationStats(organizationId: string) {
  const now = new Date();

  const [activeCount, totalCount, expiringSoon] = await Promise.all([
    prisma.delegatedApproval.count({
      where: {
        isActive: true,
        approvalChain: { organizationId },
      },
    }),
    prisma.delegatedApproval.count({
      where: {
        approvalChain: { organizationId },
      },
    }),
    prisma.delegatedApproval.count({
      where: {
        isActive: true,
        approvalChain: { organizationId },
        endDate: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      },
    }),
  ]);

  return {
    activeDelegations: activeCount,
    totalDelegations: totalCount,
    expiringSoon,
  };
}
