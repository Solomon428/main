// ============================================================================
// CreditorFlow - Notification Service
// ============================================================================
// Manages all system notifications:
// - In-app notifications
// - Email notifications (via SMTP)
// - Real-time notifications (via WebSocket - ready for implementation)
// - Notification templates and preferences
// ============================================================================

import { prisma } from "@/lib/database/client";
import { NotificationType, PriorityLevel, DeliveryMethod } from "@/types";

export interface SendNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: PriorityLevel;
  entityType?: string;
  entityId?: string;
  actions?: Array<{
    label: string;
    action: string;
    url?: string;
  }>;
}

export interface ApprovalNotificationInput {
  userId: string;
  invoiceId: string;
  type: "APPROVAL_REQUIRED" | "INVOICE_APPROVED" | "INVOICE_REJECTED";
}

export class NotificationService {
  /**
   * Send a notification
   */
  static async sendNotification(input: SendNotificationInput) {
    const {
      userId,
      title,
      message,
      type,
      priority = "MEDIUM",
      entityType,
      entityId,
      actions,
    } = input;

    // Create notification record
    const notification = await prisma.notifications.create({
      data: {
        userId,
        type,
        title,
        message,
        priority,
        entityType: entityType || null,
        entityId: entityId || null,
        deliveryMethod: DeliveryMethod.IN_APP,
        actions: actions ? JSON.stringify(actions) : null,
        isRead: false,
      },
    });

    // Get user preferences
    const user = await prisma.User.findUnique({
      where: { id: userId },
    });

    if (user?.email) {
      // Send email notification
      await this.sendEmailNotification(user.email, title, message, type);
    }

    return notification;
  }

  /**
   * Send approval-specific notification
   */
  static async sendApprovalNotification(input: ApprovalNotificationInput) {
    const { userId, invoiceId, type } = input;

    // Get invoice details
    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    let title: string;
    let message: string;
    let priority: PriorityLevel = "MEDIUM";

    switch (type) {
      case "APPROVAL_REQUIRED":
        title = "Approval Required";
        message = `Invoice ${invoice.invoiceNumber} from ${invoice.supplierName} for R${Number(
          invoice.totalAmount,
        ).toLocaleString()} requires your approval.`;
        priority = invoice.isUrgent ? "HIGH" : "MEDIUM";
        break;
      case "INVOICE_APPROVED":
        title = "Invoice Approved";
        message = `Invoice ${invoice.invoiceNumber} has been fully approved and is ready for payment.`;
        break;
      case "INVOICE_REJECTED":
        title = "Invoice Rejected";
        message = `Invoice ${invoice.invoiceNumber} has been rejected.`;
        priority = "HIGH";
        break;
      default:
        title = "Invoice Update";
        message = `Invoice ${invoice.invoiceNumber} status has been updated.`;
    }

    return this.sendNotification({
      userId,
      title,
      message,
      type,
      priority,
      entityType: "INVOICE",
      entityId: invoiceId,
      actions:
        type === "APPROVAL_REQUIRED"
          ? [
              {
                label: "Review Now",
                action: "review",
                url: `/invoices/${invoiceId}`,
              },
            ]
          : undefined,
    });
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(
    email: string,
    title: string,
    message: string,
    type: string,
  ): Promise<void> {
    // TODO: Implement SMTP email sending
    // For now, just log
    console.log(`[EMAIL] To: ${email}, Subject: ${title}, Type: ${type}`);
    console.log(`[EMAIL] Body: ${message}`);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string) {
    return prisma.notifications.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readDate: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    return prisma.notifications.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readDate: new Date(),
      },
    });
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    options: {
      unreadOnly?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const { unreadOnly = false, page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notifications.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notifications.count({ where }),
      prisma.notifications.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      pageSize,
    };
  }

  /**
   * Delete old notifications
   */
  static async cleanupOldNotifications(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return prisma.notifications.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        isRead: true,
      },
    });
  }

  /**
   * Send bulk notification
   */
  static async sendBulkNotification(
    userIds: string[],
    title: string,
    message: string,
    type: NotificationType,
  ) {
    const notifications = [];
    for (const userId of userIds) {
      const notification = await this.sendNotification({
        userId,
        title,
        message,
        type,
      });
      notifications.push(notification);
    }
    return notifications;
  }
}

export default NotificationService;
