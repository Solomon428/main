import { prisma } from "../../lib/prisma";
import { ScheduledTask } from "../../domain/models/ScheduledTask";
import { NotificationStatus } from "../../domain/enums/NotificationStatus";
import { NotificationChannel } from "../../domain/enums/NotificationChannel";
import { createNotification } from "../../modules/notifications/notifications.service";
import { info } from "../../observability/logger";

/**
 * Send daily notification digests to users
 */
export async function runTask(
  task: ScheduledTask,
  signal: AbortSignal,
): Promise<void> {
  info("Starting notification digest task", { taskId: task.id });

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get all users with unread notifications
  const users = await prisma.user.findMany({
    where: {
      notifications: {
        some: {
          status: NotificationStatus.UNREAD,
          createdAt: { gte: yesterday },
        },
      },
    },
    include: {
      notifications: {
        where: {
          status: NotificationStatus.UNREAD,
          createdAt: { gte: yesterday },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  for (const user of users) {
    if (signal.aborted) return;

    const notificationCount = user.notifications.length;
    if (notificationCount === 0) continue;

    // Send digest email
    await createNotification(user.id, null, {
      type: "SYSTEM_ALERT" as any,
      title: `You have ${notificationCount} new notification${notificationCount > 1 ? "s" : ""}`,
      message: `Summary of your recent notifications:\n\n${user.notifications.map((n) => `- ${n.title}: ${n.message}`).join("\n")}`,
      channel: NotificationChannel.EMAIL,
      priority: "LOW" as any,
    });
  }

  info(`Sent digests to ${users.length} users`, { taskId: task.id });
  info("Notification digest task completed", { taskId: task.id });
}
