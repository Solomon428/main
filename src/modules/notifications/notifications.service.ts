import { prisma } from "../../lib/prisma";
import { generateId } from "../../utils/ids";
import { logAuditEvent } from "../../observability/audit";
import { AuditAction } from "../../domain/enums/AuditAction";
import { EntityType } from "../../domain/enums/EntityType";
import { NotificationType } from "../../domain/enums/NotificationType";
import { NotificationPriority } from "../../domain/enums/NotificationPriority";
import { NotificationChannel } from "../../domain/enums/NotificationChannel";
import { NotificationStatus } from "../../domain/enums/NotificationStatus";

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  shortMessage?: string;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  actionUrl?: string;
  actionText?: string;
  imageUrl?: string;
  entityType?: EntityType;
  entityId?: string;
  actions?: Array<{
    label: string;
    url?: string;
    type: string;
  }>;
  metadata?: Record<string, unknown>;
}

export async function createNotification(
  userId: string,
  organizationId: string | null,
  data: CreateNotificationInput,
) {
  const notification = await prisma.notification.create({
    data: {
      id: generateId(),
      userId,
      organizationId,
      type: data.type,
      title: data.title,
      message: data.message,
      shortMessage: data.shortMessage,
      priority: data.priority || NotificationPriority.MEDIUM,
      channel: data.channel || NotificationChannel.IN_APP,
      actionUrl: data.actionUrl,
      actionText: data.actionText,
      imageUrl: data.imageUrl,
      status: NotificationStatus.UNREAD,
      entityType: data.entityType,
      entityId: data.entityId,
      actions: data.actions || [],
      metadata: data.metadata || {},
    },
  });

  // Send through appropriate channel
  await sendNotificationThroughChannel(notification);

  return notification;
}

async function sendNotificationThroughChannel(notification: {
  id: string;
  userId: string;
  channel: NotificationChannel;
  title: string;
  message: string;
  shortMessage?: string | null;
  priority: NotificationPriority;
  actionUrl?: string | null;
}) {
  switch (notification.channel) {
    case NotificationChannel.EMAIL:
      await sendEmailNotification(notification);
      break;
    case NotificationChannel.SMS:
      await sendSMSNotification(notification);
      break;
    case NotificationChannel.PUSH:
      await sendPushNotification(notification);
      break;
    case NotificationChannel.SLACK:
      await sendSlackNotification(notification);
      break;
    case NotificationChannel.WEBHOOK:
      await sendWebhookNotification(notification);
      break;
    default:
      // IN_APP - no external sending needed
      break;
  }

  // Update sent timestamp
  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      sentAt: new Date(),
      status: NotificationStatus.SENT,
    },
  });
}

async function sendEmailNotification(notification: {
  id: string;
  userId: string;
  title: string;
  message: string;
  actionUrl?: string | null;
}) {
  // Get user's email
  const user = await prisma.user.findUnique({
    where: { id: notification.userId },
    select: { email: true, emailNotifications: true },
  });

  if (!user?.email || !user.emailNotifications) {
    return;
  }

  // In production, integrate with email service (SendGrid, AWS SES, etc.)
  console.log(`[EMAIL] To: ${user.email}, Subject: ${notification.title}`);

  // Update email sent timestamp
  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      emailSentAt: new Date(),
    },
  });
}

async function sendSMSNotification(notification: {
  id: string;
  userId: string;
  shortMessage?: string | null;
  priority: NotificationPriority;
}) {
  // Only send SMS for high priority notifications
  if (
    notification.priority !== NotificationPriority.HIGH &&
    notification.priority !== NotificationPriority.CRITICAL &&
    notification.priority !== NotificationPriority.EMERGENCY
  ) {
    return;
  }

  // Get user's mobile number
  const user = await prisma.user.findUnique({
    where: { id: notification.userId },
    select: { mobileNumber: true, smsNotifications: true },
  });

  if (!user?.mobileNumber || !user.smsNotifications) {
    return;
  }

  // In production, integrate with SMS service (Twilio, etc.)
  console.log(
    `[SMS] To: ${user.mobileNumber}, Message: ${notification.shortMessage}`,
  );

  // Update SMS sent timestamp
  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      smsSentAt: new Date(),
    },
  });
}

async function sendPushNotification(notification: {
  id: string;
  userId: string;
  title: string;
  message: string;
  actionUrl?: string | null;
}) {
  // Get user's push notification settings
  const user = await prisma.user.findUnique({
    where: { id: notification.userId },
    select: { pushNotifications: true },
  });

  if (!user?.pushNotifications) {
    return;
  }

  // In production, integrate with push notification service (Firebase, etc.)
  console.log(
    `[PUSH] To: ${notification.userId}, Title: ${notification.title}`,
  );

  // Update push sent timestamp
  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      pushSentAt: new Date(),
    },
  });
}

async function sendSlackNotification(notification: {
  id: string;
  userId: string;
  title: string;
  message: string;
}) {
  // In production, integrate with Slack API
  console.log(
    `[SLACK] To: ${notification.userId}, Title: ${notification.title}`,
  );
}

async function sendWebhookNotification(notification: {
  id: string;
  userId: string;
  title: string;
  message: string;
  entityType?: EntityType | null;
  entityId?: string | null;
}) {
  // In production, send webhook to configured URL
  console.log(
    `[WEBHOOK] User: ${notification.userId}, Event: ${notification.title}`,
  );

  // Update webhook sent timestamp
  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      webhookSentAt: new Date(),
    },
  });
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
) {
  const notification = await prisma.notification.update({
    where: {
      id: notificationId,
      userId, // Ensure user owns this notification
    },
    data: {
      status: NotificationStatus.READ,
      readAt: new Date(),
    },
  });

  return notification;
}

export async function markNotificationAsDelivered(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: NotificationStatus.DELIVERED,
      deliveredAt: new Date(),
    },
  });
}

export async function dismissNotification(
  notificationId: string,
  userId: string,
) {
  return prisma.notification.update({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      status: NotificationStatus.DISMISSED,
      dismissedAt: new Date(),
    },
  });
}

export async function archiveNotification(
  notificationId: string,
  userId: string,
) {
  return prisma.notification.update({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      status: NotificationStatus.ARCHIVED,
      archivedAt: new Date(),
    },
  });
}

export async function getNotification(notificationId: string) {
  return prisma.notification.findUnique({
    where: { id: notificationId },
  });
}

export async function listNotifications(
  userId: string,
  options?: {
    status?: NotificationStatus;
    type?: NotificationType;
    priority?: NotificationPriority;
    unreadOnly?: boolean;
    page?: number;
    limit?: number;
  },
) {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.unreadOnly) {
    where.status = { in: [NotificationStatus.UNREAD, NotificationStatus.SENT] };
  }

  if (options?.type) {
    where.type = options.type;
  }

  if (options?.priority) {
    where.priority = options.priority;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        userId,
        status: { in: [NotificationStatus.UNREAD, NotificationStatus.SENT] },
      },
    }),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    unreadCount,
  };
}

export async function markAllNotificationsAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      status: { in: [NotificationStatus.UNREAD, NotificationStatus.SENT] },
    },
    data: {
      status: NotificationStatus.READ,
      readAt: new Date(),
    },
  });

  return result;
}

export async function deleteNotification(
  notificationId: string,
  userId: string,
) {
  return prisma.notification.delete({
    where: {
      id: notificationId,
      userId,
    },
  });
}

// Notification templates and helpers
export async function notifyInvoiceSubmitted(
  userId: string,
  organizationId: string,
  invoiceId: string,
  invoiceNumber: string,
  amount: string,
  supplierName: string,
) {
  return createNotification(userId, organizationId, {
    type: NotificationType.INVOICE_SUBMITTED,
    title: "New Invoice Submitted",
    message: `Invoice ${invoiceNumber} from ${supplierName} for ${amount} has been submitted for approval.`,
    priority: NotificationPriority.MEDIUM,
    actionUrl: `/invoices/${invoiceId}`,
    actionText: "View Invoice",
    entityType: EntityType.INVOICE,
    entityId: invoiceId,
  });
}

export async function notifyApprovalRequired(
  userId: string,
  organizationId: string,
  approvalId: string,
  invoiceId: string,
  invoiceNumber: string,
  amount: string,
  supplierName: string,
) {
  return createNotification(userId, organizationId, {
    type: NotificationType.APPROVAL_REQUESTED,
    title: "Approval Required",
    message: `Invoice ${invoiceNumber} from ${supplierName} for ${amount} requires your approval.`,
    priority: NotificationPriority.HIGH,
    channel: NotificationChannel.IN_APP,
    actionUrl: `/approvals/${approvalId}`,
    actionText: "Review & Approve",
    entityType: EntityType.INVOICE,
    entityId: invoiceId,
  });
}

export async function notifyPaymentProcessed(
  userId: string,
  organizationId: string,
  paymentId: string,
  invoiceId: string,
  invoiceNumber: string,
  amount: string,
  paymentDate: Date,
) {
  return createNotification(userId, organizationId, {
    type: NotificationType.PAYMENT_PROCESSED,
    title: "Payment Processed",
    message: `Payment of ${amount} for invoice ${invoiceNumber} has been processed successfully.`,
    priority: NotificationPriority.MEDIUM,
    actionUrl: `/payments/${paymentId}`,
    actionText: "View Payment",
    entityType: EntityType.PAYMENT,
    entityId: paymentId,
  });
}

export async function notifySLABreach(
  userId: string,
  organizationId: string,
  entityType: EntityType,
  entityId: string,
  entityDescription: string,
  breachType: string,
) {
  return createNotification(userId, organizationId, {
    type: NotificationType.SLA_BREACH,
    title: "SLA Breach Alert",
    message: `${entityDescription} has breached ${breachType}. Immediate attention required.`,
    priority: NotificationPriority.CRITICAL,
    channel: NotificationChannel.EMAIL,
    entityType,
    entityId,
  });
}

export async function notifyRiskAlert(
  userId: string,
  organizationId: string,
  entityType: EntityType,
  entityId: string,
  riskLevel: string,
  description: string,
) {
  return createNotification(userId, organizationId, {
    type: NotificationType.RISK_ALERT,
    title: `${riskLevel} Risk Alert`,
    message: description,
    priority: NotificationPriority.HIGH,
    channel: NotificationChannel.EMAIL,
    entityType,
    entityId,
  });
}

// Bulk notifications
export async function notifyMultipleUsers(
  userIds: string[],
  organizationId: string | null,
  data: CreateNotificationInput,
) {
  const results = [];

  for (const userId of userIds) {
    try {
      const notification = await createNotification(
        userId,
        organizationId,
        data,
      );
      results.push({ userId, success: true, notificationId: notification.id });
    } catch (error) {
      results.push({
        userId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    results,
    summary: {
      total: results.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    },
  };
}

// Cleanup old notifications
export async function cleanupOldNotifications(daysToKeep: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      status: { in: [NotificationStatus.READ, NotificationStatus.ARCHIVED] },
    },
  });

  return result;
}
