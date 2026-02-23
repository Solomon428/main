import { prisma } from "../../lib/prisma";
import { ScheduledTask } from "../../domain/models/ScheduledTask";
import { ApprovalStatus } from "../../domain/enums/ApprovalStatus";
import { createNotification } from "../../modules/notifications/notifications.service";
import { NotificationType } from "../../domain/enums/NotificationType";
import { info } from "../../observability/logger";

/**
 * Escalate approvals that have breached SLA
 */
export async function runTask(
  task: ScheduledTask,
  signal: AbortSignal,
): Promise<void> {
  info("Starting approval escalation task", { taskId: task.id });

  const now = new Date();

  const overdueApprovals = await prisma.approval.findMany({
    where: {
      status: ApprovalStatus.PENDING,
      slaDueDate: { lt: now },
      isEscalated: false,
    },
    include: {
      approver: true,
      invoice: {
        include: {
          supplier: true,
          organization: true,
        },
      },
      approvalChain: true,
    },
  });

  for (const approval of overdueApprovals) {
    if (signal.aborted) return;

    // Escalate the approval
    await prisma.approval.update({
      where: { id: approval.id },
      data: {
        isEscalated: true,
        escalatedAt: now,
        escalatedReason: "SLA breach",
      },
    });

    // Notify approver
    await createNotification(approval.approverId, approval.invoice.organizationId, {
      type: NotificationType.SLA_BREACH,
      title: "Approval Escalated - SLA Breach",
      message: `Invoice ${approval.invoice.invoiceNumber} approval has been escalated due to SLA breach.`,
      priority: "CRITICAL" as any,
      entityType: "APPROVAL" as any,
      entityId: approval.id,
    });

    // Notify managers
    const managers = await prisma.user.findMany({
      where: {
        organizations: { some: { id: approval.invoice.organizationId } },
        role: { in: ["ADMIN", "FINANCE_MANAGER"] as any },
      },
    });

    for (const manager of managers) {
      await createNotification(manager.id, approval.invoice.organizationId, {
        type: NotificationType.APPROVAL_ESCALATED,
        title: "Approval Escalated",
        message: `Approval for invoice ${approval.invoice.invoiceNumber} has been escalated due to SLA breach.`,
        priority: "HIGH" as any,
        entityType: "APPROVAL" as any,
        entityId: approval.id,
      });
    }
  }

  info(`Escalated ${overdueApprovals.length} approvals`, { taskId: task.id });
}
