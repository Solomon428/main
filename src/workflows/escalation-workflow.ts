// ============================================================================
// CreditorFlow - Escalation Workflow
// ============================================================================
// Manages SLA breach escalations:
// - Monitors SLA breaches
// - Automatic escalation triggers
// - Escalation notifications
// - Escalation resolution
// ============================================================================

import { prisma } from '@/lib/database/client';
import { SLACalculator } from '@/logic-engine/approval-engine/sla-calculator';
import { NotificationService } from '@/services/notification-service';
import { auditLogger } from '@/lib/utils/audit-logger';
import {
  ApprovalStatus,
  InvoiceStatus,
  EntityType,
  LogSeverity,
  UserRole,
} from '@/types';

export interface EscalationResult {
  escalated: boolean;
  reason?: string;
  newApproverId?: string;
}

export class EscalationWorkflow {
  /**
   * Check for SLA breaches and escalate if needed
   */
  static async checkAndEscalate(): Promise<{
    checked: number;
    escalated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let escalated = 0;

    // Get all pending approvals
    const pendingApprovals = await prisma.approval.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        slaBreachDate: { not: null },
      },
      include: {
        invoice: true,
      },
    });

    const now = new Date();

    for (const approval of pendingApprovals) {
      try {
        if (!approval.slaBreachDate) continue;

        // Check if SLA has been breached
        if (now > approval.slaBreachDate) {
          await this.escalateApproval(approval.id);
          escalated++;
        }
      } catch (error) {
        errors.push(
          `Failed to escalate approval ${approval.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    return {
      checked: pendingApprovals.length,
      escalated,
      errors,
    };
  }

  /**
   * Escalate a specific approval
   */
  static async escalateApproval(approvalId: string): Promise<EscalationResult> {
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        invoice: true,
      },
    });

    if (!approval) {
      return { escalated: false, reason: 'Approval not found' };
    }

    if (approval.isEscalated) {
      return { escalated: false, reason: 'Already escalated' };
    }

    // Fetch approver details separately since there's no relation
    const approver = approval.approverId
      ? await prisma.users.findUnique({
          where: { id: approval.approverId },
          select: { id: true, name: true },
        })
      : null;

    // Find next level approver
    const roleHierarchy: UserRole[] = [
      'CREDIT_CLERK',
      'BRANCH_MANAGER',
      'FINANCIAL_MANAGER',
      'EXECUTIVE',
      'GROUP_FINANCIAL_MANAGER',
    ];

    const currentRoleIndex = roleHierarchy.indexOf(
      approval.approverRole as UserRole
    );
    const nextRole =
      currentRoleIndex >= 0 && currentRoleIndex < roleHierarchy.length - 1
        ? roleHierarchy[currentRoleIndex + 1]
        : 'EXECUTIVE';

    // Find approver for next level
    const nextApprover = await prisma.users.findFirst({
      where: {
        role: nextRole,
        isActive: true,
      },
    });

    if (!nextApprover) {
      return { escalated: false, reason: 'No higher-level approver found' };
    }

    // Update approval
    await prisma.approval.update({
      where: { id: approvalId },
      data: {
        isEscalated: true,
        escalatedFromId: approval.approverId,
        escalationReason: 'SLA Breach - Automatic escalation',
        status: ApprovalStatus.ESCALATED,
      },
    });

    // Update invoice
    await prisma.invoices.update({
      where: { id: approval.invoiceId },
      data: {
        isEscalated: true,
        escalationReason: `SLA breach - escalated from ${approver?.name || 'previous approver'}`,
        escalatedBy: approval.approverId,
        escalatedDate: new Date(),
        status: InvoiceStatus.ESCALATED,
      },
    });

    // Notify managers
    const managers = await prisma.users.findMany({
      where: {
        role: { in: ['FINANCIAL_MANAGER', 'EXECUTIVE'] },
        isActive: true,
      },
    });

    for (const manager of managers) {
      await NotificationService.sendNotification({
        userId: manager.id,
        title: 'SLA Breach - Escalation Required',
        message: `Invoice ${approval.invoice.invoiceNumber} has breached SLA and been escalated`,
        type: 'SLA_BREACH',
        priority: 'HIGH',
        entityType: 'INVOICE',
        entityId: approval.invoiceId,
      });
    }

    // Notify next approver
    await NotificationService.sendApprovalNotification({
      userId: nextApprover.id,
      invoiceId: approval.invoiceId,
      type: 'APPROVAL_REQUIRED',
    });

    // Log escalation
    await auditLogger.log({
      action: 'ESCALATE',
      entityType: EntityType.APPROVAL,
      entityId: approvalId,
      entityDescription: `SLA breach escalation for invoice ${approval.invoice.invoiceNumber}`,
      severity: LogSeverity.WARNING,
      metadata: {
        previousApprover: approval.approverId,
        newApprover: nextApprover.id,
        reason: 'SLA breach',
      },
    });

    return {
      escalated: true,
      newApproverId: nextApprover.id,
    };
  }

  /**
   * Resolve an escalation
   */
  static async resolveEscalation(
    invoiceId: string,
    resolverId: string,
    resolution: string
  ) {
    const invoice = await prisma.invoices.update({
      where: { id: invoiceId },
      data: {
        isEscalated: false,
        escalationReason: `Resolved: ${resolution}`,
        modifiedById: resolverId,
      },
    });

    // Update approvals
    await prisma.approval.updateMany({
      where: {
        invoiceId,
        isEscalated: true,
      },
      data: {
        isEscalated: false,
      },
    });

    await auditLogger.log({
      action: 'UPDATE',
      entityType: EntityType.INVOICE,
      entityId: invoiceId,
      entityDescription: `Escalation resolved: ${resolution}`,
      severity: LogSeverity.INFO,
      userId: resolverId,
    });

    return invoice;
  }

  /**
   * Get all escalated items
   */
  static async getEscalatedItems() {
    const invoices = await prisma.invoices.findMany({
      where: {
        isEscalated: true,
      },
      include: {
        approvals: {
          where: {
            isEscalated: true,
          },
        },
      },
      orderBy: {
        escalatedDate: 'desc',
      },
    });

    // Fetch approver details separately since there's no relation
    const enrichedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        const approverIds = [...new Set(invoice.approvals.map(a => a.approverId).filter(Boolean))];
        const approvers = await prisma.users.findMany({
          where: { id: { in: approverIds } },
          select: { id: true, name: true, email: true },
        });
        const approverMap = new Map(approvers.map(a => [a.id, a]));

        return {
          ...invoice,
          approvals: invoice.approvals.map(a => ({
            ...a,
            approver: a.approverId ? approverMap.get(a.approverId) || null : null,
          })),
        };
      })
    );

    return enrichedInvoices;
  }

  /**
   * Get SLA breach warnings (approaching SLA)
   */
  static async getSLAWarnings(hoursThreshold: number = 4) {
    const approvals = await prisma.approval.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        slaBreachDate: { not: null },
      },
      include: {
        invoice: true,
      },
    });

    // Fetch approver details separately since there's no relation
    const approverIds = [...new Set(approvals.map(a => a.approverId).filter(Boolean))];
    const approvers = await prisma.users.findMany({
      where: { id: { in: approverIds } },
      select: { id: true, name: true },
    });
    const approverMap = new Map(approvers.map(a => [a.id, a]));

    const warnings = [];
    const now = new Date();

    for (const approval of approvals) {
      if (!approval.assignedDate || !approval.slaBreachDate) continue;

      const slaStatus = SLACalculator.getSLAStatus(
        approval.assignedDate,
        approval.slaHours || 48
      );

      if (slaStatus.status === 'WARNING' || slaStatus.status === 'CRITICAL') {
        const approver = approval.approverId ? approverMap.get(approval.approverId) : null;
        warnings.push({
          approvalId: approval.id,
          invoiceId: approval.invoiceId,
          invoiceNumber: approval.invoice.invoiceNumber,
          approverName: approver?.name,
          approverId: approval.approverId,
          remainingTime: slaStatus.message,
          severity: slaStatus.status,
        });
      }
    }

    return warnings;
  }
}

export default EscalationWorkflow;
