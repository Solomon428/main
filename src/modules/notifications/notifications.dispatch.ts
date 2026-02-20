// ============================================================================
// Notifications Dispatch Service
// ============================================================================
// Handles dispatching notifications through various channels

import { prisma } from "../../db/prisma";
import { NotificationChannel } from "../../domain/enums/NotificationChannel";
import { NotificationStatus } from "../../domain/enums/NotificationStatus";
import { NotificationPriority } from "../../domain/enums/NotificationPriority";

export interface DispatchOptions {
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  retryAttempts?: number;
  scheduledFor?: Date;
}

/**
 * Dispatch a notification through specified channels
 */
export async function dispatchNotification(
  notificationId: string,
  options: DispatchOptions = {},
) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          emailNotifications: true,
          mobileNumber: true,
          smsNotifications: true,
          pushNotifications: true,
        },
      },
    },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  const channels = options.channels || [notification.channel];
  const results: Array<{
    channel: NotificationChannel;
    success: boolean;
    error?: string;
  }> = [];

  for (const channel of channels) {
    try {
      await dispatchToChannel(notification, channel);
      results.push({ channel, success: true });
    } catch (error) {
      results.push({
        channel,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Update notification status based on results
  const anySuccess = results.some((r) => r.success);
  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: anySuccess ? NotificationStatus.SENT : NotificationStatus.FAILED,
      sentAt: anySuccess ? new Date() : undefined,
      deliveryAttempts: { increment: 1 },
      lastError: anySuccess
        ? undefined
        : results.find((r) => !r.success)?.error,
    },
  });

  return {
    notificationId,
    results,
    overallSuccess: anySuccess,
  };
}

/**
 * Dispatch notification to a specific channel
 */
async function dispatchToChannel(
  notification: {
    id: string;
    userId: string;
    title: string;
    message: string;
    shortMessage?: string | null;
    priority: NotificationPriority;
    actionUrl?: string | null;
    user: {
      email: string | null;
      emailNotifications: boolean;
      mobileNumber: string | null;
      smsNotifications: boolean;
      pushNotifications: boolean;
    } | null;
  },
  channel: NotificationChannel,
) {
  switch (channel) {
    case NotificationChannel.EMAIL:
      await dispatchEmail(notification);
      break;
    case NotificationChannel.SMS:
      await dispatchSMS(notification);
      break;
    case NotificationChannel.PUSH:
      await dispatchPush(notification);
      break;
    case NotificationChannel.SLACK:
      await dispatchSlack(notification);
      break;
    case NotificationChannel.TEAMS:
      await dispatchTeams(notification);
      break;
    case NotificationChannel.WEBHOOK:
      await dispatchWebhook(notification);
      break;
    case NotificationChannel.IN_APP:
      // In-app notifications are already created in the database
      break;
    default:
      throw new Error(`Unsupported channel: ${channel}`);
  }
}

/**
 * Dispatch email notification
 */
async function dispatchEmail(notification: {
  id: string;
  user: {
    email: string | null;
    emailNotifications: boolean;
  } | null;
  title: string;
  message: string;
  actionUrl?: string | null;
}) {
  if (!notification.user?.email || !notification.user.emailNotifications) {
    throw new Error("Email not available or disabled");
  }

  // In production, integrate with email service
  console.log(
    `[EMAIL DISPATCH] To: ${notification.user.email}, Subject: ${notification.title}`,
  );

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      emailSentAt: new Date(),
    },
  });
}

/**
 * Dispatch SMS notification
 */
async function dispatchSMS(notification: {
  id: string;
  user: {
    mobileNumber: string | null;
    smsNotifications: boolean;
  } | null;
  shortMessage?: string | null;
  priority: NotificationPriority;
}) {
  // Only send SMS for high priority notifications
  if (
    notification.priority !== NotificationPriority.HIGH &&
    notification.priority !== NotificationPriority.CRITICAL &&
    notification.priority !== NotificationPriority.EMERGENCY
  ) {
    throw new Error("SMS only for high priority notifications");
  }

  if (!notification.user?.mobileNumber || !notification.user.smsNotifications) {
    throw new Error("Mobile number not available or SMS disabled");
  }

  if (!notification.shortMessage) {
    throw new Error("Short message required for SMS");
  }

  // In production, integrate with SMS service
  console.log(
    `[SMS DISPATCH] To: ${notification.user.mobileNumber}, Message: ${notification.shortMessage}`,
  );

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      smsSentAt: new Date(),
    },
  });
}

/**
 * Dispatch push notification
 */
async function dispatchPush(notification: {
  id: string;
  userId: string;
  user: {
    pushNotifications: boolean;
  } | null;
  title: string;
  message: string;
}) {
  if (!notification.user?.pushNotifications) {
    throw new Error("Push notifications disabled");
  }

  // In production, integrate with push service (Firebase, etc.)
  console.log(
    `[PUSH DISPATCH] To: ${notification.userId}, Title: ${notification.title}`,
  );

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      pushSentAt: new Date(),
    },
  });
}

/**
 * Dispatch Slack notification
 */
async function dispatchSlack(notification: {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
}) {
  // In production, integrate with Slack API
  console.log(
    `[SLACK DISPATCH] Title: ${notification.title}, Priority: ${notification.priority}`,
  );
}

/**
 * Dispatch Microsoft Teams notification
 */
async function dispatchTeams(notification: {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
}) {
  // In production, integrate with Teams webhook
  console.log(
    `[TEAMS DISPATCH] Title: ${notification.title}, Priority: ${notification.priority}`,
  );
}

/**
 * Dispatch webhook notification
 */
async function dispatchWebhook(notification: {
  id: string;
  userId: string;
  title: string;
  message: string;
  priority: NotificationPriority;
}) {
  // In production, send to configured webhook URL
  console.log(
    `[WEBHOOK DISPATCH] User: ${notification.userId}, Event: ${notification.title}`,
  );

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      webhookSentAt: new Date(),
    },
  });
}

/**
 * Batch dispatch multiple notifications
 */
export async function batchDispatch(
  notificationIds: string[],
  options: DispatchOptions = {},
) {
  const results = [];

  for (const notificationId of notificationIds) {
    try {
      const result = await dispatchNotification(notificationId, options);
      results.push({ notificationId, success: true, result });
    } catch (error) {
      results.push({
        notificationId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    results,
    summary: {
      total: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    },
  };
}

/**
 * Retry failed notifications
 */
export async function retryFailedNotifications(maxRetries: number = 3) {
  const failedNotifications = await prisma.notification.findMany({
    where: {
      status: NotificationStatus.FAILED,
      deliveryAttempts: { lt: maxRetries },
    },
    take: 100,
  });

  const results = [];

  for (const notification of failedNotifications) {
    try {
      const result = await dispatchNotification(notification.id);
      results.push({ notificationId: notification.id, success: true, result });
    } catch (error) {
      results.push({
        notificationId: notification.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    retried: failedNotifications.length,
    results,
    summary: {
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    },
  };
}

/**
 * Schedule notification for later delivery
 */
export async function scheduleNotification(
  notificationId: string,
  scheduledFor: Date,
) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: NotificationStatus.PENDING,
    },
  });
}

/**
 * Process scheduled notifications
 */
export async function processScheduledNotifications() {
  const now = new Date();

  const scheduledNotifications = await prisma.notification.findMany({
    where: {
      status: NotificationStatus.PENDING,
      sentAt: null,
    },
    take: 100,
  });

  const results = [];

  for (const notification of scheduledNotifications) {
    try {
      const result = await dispatchNotification(notification.id);
      results.push({ notificationId: notification.id, success: true, result });
    } catch (error) {
      results.push({
        notificationId: notification.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    processed: scheduledNotifications.length,
    results,
    summary: {
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    },
  };
}
