// ============================================================================
// CreditorFlow - Workload Balancer
// ============================================================================
// Balances approval workload across users to prevent bottlenecks.
// Tracks workload metrics and redistributes tasks when needed.
// ============================================================================

import { prisma } from '@/lib/database/client';
import { ApprovalStatus } from '@/types';

export interface WorkloadMetrics {
  userId: string;
  name: string;
  currentWorkload: number;
  maxWorkload: number;
  utilizationPercentage: number;
  pendingApprovals: number;
  averageProcessingTime: number;
}

export interface RedistributionResult {
  success: boolean;
  movedCount: number;
  message: string;
}

export class WorkloadBalancer {
  private static readonly DEFAULT_MAX_WORKLOAD = 50;
  private static readonly HIGH_UTILIZATION_THRESHOLD = 80; // 80%

  /**
   * Recalculate workload for a specific user
   */
  static async recalculateWorkload(userId: string): Promise<number> {
    // Count pending approvals for this user
    const pendingCount = await prisma.approvals.count({
      where: {
        approverId: userId,
        status: ApprovalStatus.PENDING,
      },
    });

    // Update user's current workload
    await prisma.users.update({
      where: { id: userId },
      data: {
        currentWorkload: pendingCount,
      },
    });

    return pendingCount;
  }

  /**
   * Get workload metrics for all users
   */
  static async getAllWorkloadMetrics(): Promise<WorkloadMetrics[]> {
    const users = await prisma.users.findMany({
      where: {
        isActive: true,
      },
    });

    const metrics: WorkloadMetrics[] = [];

    for (const user of users) {
      // Get pending approvals
      const pendingApprovals = await prisma.approvals.count({
        where: {
          approverId: user.id,
          status: ApprovalStatus.PENDING,
        },
      });

      // Get completed approvals for processing time calculation
      const completedApprovals = await prisma.approvals.findMany({
        where: {
          approverId: user.id,
          status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] },
        },
      });

      let totalProcessingTime = 0;
      for (const approval of completedApprovals) {
        if (approval.assignedDate && approval.decisionDate) {
          totalProcessingTime += 
            approval.decisionDate.getTime() - approval.assignedDate.getTime();
        }
      }

      const averageProcessingTime = completedApprovals.length > 0
        ? totalProcessingTime / completedApprovals.length / (1000 * 60 * 60) // Hours
        : 0;

      const maxWorkload = user.maxWorkload || this.DEFAULT_MAX_WORKLOAD;
      const utilizationPercentage = (pendingApprovals / maxWorkload) * 100;

      metrics.push({
        userId: user.id,
        name: user.name,
        currentWorkload: pendingApprovals,
        maxWorkload,
        utilizationPercentage,
        pendingApprovals,
        averageProcessingTime,
      });
    }

    return metrics.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);
  }

  /**
   * Find users with capacity for new work
   */
  static async findUsersWithCapacity(
    role?: string,
    limit: number = 5
  ): Promise<Array<{ userId: string; name: string; availableCapacity: number }>> {
    const whereClause: any = {
      isActive: true,
    };

    if (role) {
      whereClause.role = role;
    }

    const users = await prisma.users.findMany({
      where: whereClause,
      orderBy: {
        currentWorkload: 'asc',
      },
      take: limit,
    });

    return users.map(user => ({
      userId: user.id,
      name: user.name,
      availableCapacity: (user.maxWorkload || this.DEFAULT_MAX_WORKLOAD) - user.currentWorkload,
    }));
  }

  /**
   * Redistribute workload from overloaded users
   */
  static async redistributeWorkload(): Promise<RedistributionResult> {
    const metrics = await this.getAllWorkloadMetrics();
    
    // Find overloaded users
    const overloadedUsers = metrics.filter(
      m => m.utilizationPercentage > this.HIGH_UTILIZATION_THRESHOLD
    );

    // Find underutilized users
    const underutilizedUsers = metrics.filter(
      m => m.utilizationPercentage < 50
    );

    if (overloadedUsers.length === 0) {
      return {
        success: true,
        movedCount: 0,
        message: 'No workload redistribution needed',
      };
    }

    if (underutilizedUsers.length === 0) {
      return {
        success: false,
        movedCount: 0,
        message: 'No available users to redistribute workload',
      };
    }

    let movedCount = 0;

    for (const overloaded of overloadedUsers) {
      // Get pending approvals for this user
      const pendingApprovals = await prisma.approvals.findMany({
        where: {
          approverId: overloaded.userId,
          status: ApprovalStatus.PENDING,
        },
        orderBy: {
          assignedDate: 'asc',
        },
      });

      // Calculate how many to move
      const targetWorkload = Math.floor(overloaded.maxWorkload * 0.7); // 70%
      const toMove = overloaded.currentWorkload - targetWorkload;

      for (let i = 0; i < Math.min(toMove, pendingApprovals.length); i++) {
        const approval = pendingApprovals[i];
        
        // Find a user with the same role who has capacity
        const originalApprover = await prisma.users.findUnique({
          where: { id: overloaded.userId },
        });

        if (!originalApprover) continue;

        const alternativeUsers = underutilizedUsers.filter(
          u => u.userId !== overloaded.userId && u.availableCapacity > 0
        );

        if (alternativeUsers.length === 0) break;

        const newAssignee = alternativeUsers[0];

        // Reassign the approval
        await prisma.approvals.update({
          where: { id: approval.id },
          data: {
            approverId: newAssignee.userId,
            isDelegated: true,
            delegatedToId: newAssignee.userId,
            delegationReason: 'Workload redistribution',
          },
        });

        // Update workload counts
        await this.recalculateWorkload(overloaded.userId);
        await this.recalculateWorkload(newAssignee.userId);

        movedCount++;

        // Update underutilized user's available capacity
        newAssignee.availableCapacity--;
      }
    }

    return {
      success: movedCount > 0,
      movedCount,
      message: `Redistributed ${movedCount} approvals to balance workload`,
    };
  }

  /**
   * Get workload alerts for users nearing capacity
   */
  static async getWorkloadAlerts(): Promise<Array<{
    userId: string;
    name: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
  }>> {
    const metrics = await this.getAllWorkloadMetrics();
    const alerts: Array<{
      userId: string;
      name: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      message: string;
    }> = [];

    for (const metric of metrics) {
      if (metric.utilizationPercentage >= 100) {
        alerts.push({
          userId: metric.userId,
          name: metric.name,
          severity: 'HIGH',
          message: `${metric.name} is at maximum capacity (${metric.utilizationPercentage.toFixed(1)}%)`,
        });
      } else if (metric.utilizationPercentage >= 80) {
        alerts.push({
          userId: metric.userId,
          name: metric.name,
          severity: 'MEDIUM',
          message: `${metric.name} is nearing capacity (${metric.utilizationPercentage.toFixed(1)}%)`,
        });
      }
    }

    return alerts;
  }

  /**
   * Reset workload for a user (e.g., when they go on leave)
   */
  static async resetUserWorkload(userId: string): Promise<void> {
    await prisma.users.update({
      where: { id: userId },
      data: {
        currentWorkload: 0,
      },
    });
  }
}

export default WorkloadBalancer;
