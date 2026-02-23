// ============================================================================
// CreditorFlow - Approval Workflow
// ============================================================================
// Manages the end-to-end invoice approval process:
// 1. Workflow initiation - creates approval chain
// 2. Stage advancement - moves to next approver
// 3. Invoice rejection - handles rejection with reason
// 4. Workflow completion - marks invoice as approved
//
// Integrates with: ApproverRouter, WorkloadBalancer, SLACalculator, Notifications
// ============================================================================

import { prisma } from "@/lib/database/client";
import { ApproverRouter } from "@/logic-engine/approval-engine/approver-router";
import { WorkloadBalancer } from "@/logic-engine/approval-engine/workload-balancer";
import { SLACalculator } from "@/logic-engine/approval-engine/sla-calculator";
import { NotificationService } from "@/services/notification-service";
import { auditLogger } from "@/lib/utils/audit-logger";
import {
  ApprovalStatus,
  InvoiceStatus,
  UserRole,
  EntityType,
  LogSeverity,
  Department,
} from "@/types";

export interface WorkflowInitiationResult {
  success: boolean;
  message: string;
  chain?: string[];
}

export interface WorkflowAdvanceResult {
  success: boolean;
  message: string;
  isComplete?: boolean;
  nextStage?: number;
}

export interface WorkflowRejectionResult {
  success: boolean;
  message: string;
}

export class ApprovalWorkflow {
  /**
   * Initiate approval workflow for an invoice
   */
  static async initiateWorkflow(
    invoiceId: string,
  ): Promise<WorkflowInitiationResult> {
    try {
      // Use SQLite table names
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        return { success: false, message: "Invoice not found" };
      }

      if (invoice.status !== InvoiceStatus.PENDING_APPROVAL) {
        return {
          success: false,
          message: `Invoice is not in pending approval status (current: ${invoice.status})`,
        };
      }

      // Determine approval chain
      const department =
        (invoice.department as Department) || Department.FINANCE;

      const chain = await ApproverRouter.determineApprovalChain({
        id: invoice.id,
        totalAmount: invoice.totalAmount,
        department,
        supplierId: invoice.supplierId,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
        status: invoice.status,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
      });

      if (chain.length === 0) {
        return {
          success: false,
          message: "No approval chain could be determined for this invoice",
        };
      }

      // Create approvals for each tier
      for (let i = 0; i < chain.length; i++) {
        const tier = chain[i];
        const approver = await ApproverRouter.getApproverForTier(tier);

        if (!approver) {
          // Try to find backup approver
          const backupApprover = await this.findBackupApprover(tier);
          if (!backupApprover) {
            return {
              success: false,
              message: `No approver available for tier: ${tier}`,
            };
          }
        }

        if (approver) {
          const slaDeadline = SLACalculator.calculateSLADeadline({
            totalAmount: invoice.totalAmount,
            department,
            priority: invoice.priority as any,
            isUrgent: invoice.isUrgent,
          });

          // Create approval record
          await prisma.approval.create({
            data: {
              invoiceId,
              approverId: approver.id,
              sequenceNumber: i + 1,
              totalStages: chain.length,
              approverRole: tier,
              approverLimit: approver.approvalLimit,
              status: i === 0 ? ApprovalStatus.PENDING : ApprovalStatus.PENDING,
              invoiceAmount: invoice.totalAmount,
              canApprove: invoice.totalAmount <= approver.approvalLimit,
              slaHours: slaDeadline.hours,
              slaBreachDate: slaDeadline.breachDate,
            },
          });

          // Notify first approver
          if (i === 0) {
            await NotificationService.sendApprovalNotification({
              userId: approver.id,
              invoiceId,
              type: "APPROVAL_REQUIRED",
            });

            // Update invoice with current approver
            await prisma.invoice.update({
              where: { id: invoiceId },
              data: {
                currentApproverId: approver.id,
                currentStage: 1,
                totalStages: chain.length,
                status: InvoiceStatus.UNDER_REVIEW,
              },
            });
          }

          // Update workload
          await WorkloadBalancer.recalculateWorkload(approver.id);
        }
      }

      // Log workflow initiation
      await auditLogger.log({
        action: "CREATE",
        entityType: EntityType.APPROVAL,
        entityId: invoiceId,
        entityDescription: `Approval workflow initiated with chain: ${chain.join(" -> ")}`,
        severity: LogSeverity.INFO,
        metadata: {
          invoiceId,
          chain,
          totalStages: chain.length,
        },
      });

      return {
        success: true,
        message: "Approval workflow initiated successfully",
        chain,
      };
    } catch (error) {
      console.error("Failed to initiate approval workflow:", error);
      return {
        success: false,
        message: `Failed to initiate workflow: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Advance workflow to next stage
   */
  static async advanceToNextStage(
    invoiceId: string,
  ): Promise<WorkflowAdvanceResult> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          approvals: {
            orderBy: { sequenceNumber: "asc" },
          },
        },
      });

      if (!invoice) {
        return { success: false, message: "Invoice not found" };
      }

      const currentStage = invoice.currentStage || 0;
      const nextApproval = invoice.approvals.find(
        (a) => a.sequenceNumber === currentStage + 1,
      );

      if (!nextApproval) {
        // Workflow is complete
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: InvoiceStatus.APPROVED,
            fullyApproved: true,
            approvedDate: new Date(),
            currentApproverId: null,
            readyForPayment: true,
          },
        });

        // Notify creator
        if (invoice.createdById) {
          await NotificationService.sendApprovalNotification({
            userId: invoice.createdById,
            invoiceId,
            type: "INVOICE_APPROVED",
          });
        }

        // Log completion
        await auditLogger.log({
          action: "APPROVE",
          entityType: EntityType.INVOICE,
          entityId: invoiceId,
          entityDescription: "Invoice fully approved",
          severity: LogSeverity.INFO,
        });

        return {
          success: true,
          message: "Invoice fully approved",
          isComplete: true,
        };
      }

      // Activate next approval
      await prisma.approval.update({
        where: { id: nextApproval.id },
        data: {
          status: ApprovalStatus.PENDING,
          assignedAt: new Date(),
        },
      });

      // Update invoice
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          currentStage: nextApproval.sequenceNumber,
          currentApproverId: nextApproval.approverId,
        },
      });

      // Notify next approver
      await NotificationService.sendApprovalNotification({
        userId: nextApproval.approverId,
        invoiceId,
        type: "APPROVAL_REQUIRED",
      });

      return {
        success: true,
        message: `Advanced to stage ${nextApproval.sequenceNumber}`,
        isComplete: false,
        nextStage: nextApproval.sequenceNumber,
      };
    } catch (error) {
      console.error("Failed to advance workflow:", error);
      return {
        success: false,
        message: `Failed to advance workflow: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Reject invoice
   */
  static async rejectInvoice(
    invoiceId: string,
    reason: string,
    userId: string,
  ): Promise<WorkflowRejectionResult> {
    try {
      await prisma.$transaction(async (tx) => {
        // Cancel all pending approvals
        await tx.approvals.updateMany({
          where: {
            invoiceId,
            status: { in: [ApprovalStatus.PENDING, ApprovalStatus.IN_REVIEW] },
          },
          data: {
            status: ApprovalStatus.REJECTED,
            decisionDate: new Date(),
            comments: reason,
          },
        });

        // Update invoice
        await tx.invoices.update({
          where: { id: invoiceId },
          data: {
            status: InvoiceStatus.REJECTED,
            currentApproverId: null,
            duplicateReason: reason,
            fullyApproved: false,
            readyForPayment: false,
          },
        });
      });

      // Notify creator
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (invoice?.createdById) {
        await NotificationService.sendApprovalNotification({
          userId: invoice.createdById,
          invoiceId,
          type: "INVOICE_REJECTED",
        });
      }

      // Log rejection
      await auditLogger.log({
        action: "REJECT",
        entityType: EntityType.INVOICE,
        entityId: invoiceId,
        entityDescription: `Invoice rejected: ${reason}`,
        severity: LogSeverity.WARNING,
        userId,
        metadata: { reason },
      });

      return {
        success: true,
        message: "Invoice rejected successfully",
      };
    } catch (error) {
      console.error("Failed to reject invoice:", error);
      return {
        success: false,
        message: `Failed to reject invoice: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Find backup approver for a tier
   */
  private static async findBackupApprover(tier: string) {
    return prisma.user.findFirst({
      where: {
        role: tier,
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  /**
   * Get workflow status
   */
  static async getWorkflowStatus(invoiceId: string): Promise<{
    currentStage: number;
    totalStages: number;
    currentApprover: { id: string; name: string } | null;
    approvals: Array<{
      stage: number;
      approver: string;
      status: string;
      decisionDate?: Date;
    }>;
  } | null> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        approvals: {
          orderBy: { sequenceNumber: "asc" },
        },
      },
    });

    if (!invoice) return null;

    // Fetch approver details separately since there's no relation
    const approverIds = [
      ...new Set(invoice.approvals.map((a) => a.approverId).filter(Boolean)),
    ];
    const approvers = await prisma.user.findMany({
      where: { id: { in: approverIds } },
      select: { id: true, name: true },
    });
    const approverMap = new Map(approvers.map((a) => [a.id, a]));

    const currentApprover = invoice.currentApproverId
      ? await prisma.user.findUnique({
          where: { id: invoice.currentApproverId },
          select: { id: true, name: true },
        })
      : null;

    return {
      currentStage: invoice.currentStage,
      totalStages: invoice.totalStages,
      currentApprover,
      approvals: invoice.approvals.map((a) => ({
        stage: a.sequenceNumber,
        approver: a.approverId
          ? approverMap.get(a.approverId)?.name || "Unknown"
          : "Unknown",
        status: a.status,
        decisionDate: a.decisionDate,
      })),
    };
  }
}

export default ApprovalWorkflow;
