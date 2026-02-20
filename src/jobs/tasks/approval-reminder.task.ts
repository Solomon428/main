import { prisma } from "../../lib/prisma";
import { ScheduledTask } from "../../domain/models/ScheduledTask";
import { ApprovalStatus } from "../../domain/enums/ApprovalStatus";
import { sendNotification } from "../../modules/notifications/notifications.service";
import { NotificationType } from "../../domain/enums/NotificationType";
import { info } from "../../observability/logger";

/**
 * Send reminders for pending approvals nearing SLA
 */
export async function runTask(
  task: ScheduledTask,
  signal: AbortSignal,
): Promise<void> {
  info("Starting approval reminder task", { taskId: task.id });

  const now = new Date();
  const reminderThreshold = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours

  const pendingApprovals = await prisma.approval.findMany({
    where: {
      status: ApprovalStatus.PENDING,
      slaDueDate: {
        lte: reminderThreshold,
        gt: now,
      },
      reminderSentAt: null,
    },
    include: {
      approver: true,
      invoice: {
        include: {
          supplier: true,
        },
      },
    },
  });

  for (const approval of pendingApprovals) {
    if (signal.aborted) return;

    await sendNotification({
      userId: approval.approverId,
      type: NotificationType.APPROVAL_REMINDER,
      title: "Approval Reminder",
      message: `Invoice ${approval.invoice.invoiceNumber} from ${approval.invoice.supplier?.name || "Unknown"} is pending your approval. Due: ${approval.slaDueDate.toISOString()}`,
      priority: "HIGH",
      entityType: "APPROVAL",
      entityId: approval.id,
    });

    await prisma.approval.update({
      where: { id: approval.id },
      data: { reminderSentAt: new Date() },
    });
  }

  info(`Sent ${pendingApprovals.length} approval reminders`, {
    taskId: task.id,
  });
}
