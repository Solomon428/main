import { prisma } from "../database/client";
import type {
  NotificationType,
  PriorityLevel,
} from "@/types/sqlite";

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message: string;
  priority: PriorityLevel;
}

export const NOTIFICATION_TEMPLATES: Partial<
  Record<NotificationType, NotificationTemplate>
> = {
  APPROVAL_REQUIRED: {
    type: 'APPROVAL_REQUIRED',
    title: "Approval Required",
    message: "An invoice requires your approval.",
    priority: 'HIGH',
  },
  INVOICE_APPROVED: {
    type: 'INVOICE_APPROVED',
    title: "Invoice Approved",
    message: "An invoice has been approved.",
    priority: 'MEDIUM',
  },
  INVOICE_REJECTED: {
    type: 'INVOICE_REJECTED',
    title: "Invoice Rejected",
    message: "An invoice has been rejected.",
    priority: 'HIGH',
  },
  ESCALATION_TRIGGERED: {
    type: "ESCALATION_TRIGGERED",
    title: "Escalation Triggered",
    message: "An escalation has been triggered.",
    priority: "CRITICAL",
  },
  SLA_BREACH: {
    type: "SLA_BREACH",
    title: "SLA Breach",
    message: "An invoice has breached SLA.",
    priority: "CRITICAL",
  },
  FRAUD_ALERT: {
    type: "FRAUD_ALERT",
    title: "Fraud Alert",
    message: "A potential fraud has been detected.",
    priority: "CRITICAL",
  },
  PAYMENT_DUE_SOON: {
    type: "PAYMENT_DUE_SOON",
    title: "Payment Due Soon",
    message: "An invoice payment is due soon.",
    priority: "HIGH",
  },
  PAYMENT_OVERDUE: {
    type: "PAYMENT_OVERDUE",
    title: "Payment Overdue",
    message: "An invoice payment is overdue.",
    priority: "CRITICAL",
  },
  MONTHLY_REPORT: {
    type: "MONTHLY_REPORT",
    title: "Monthly Report",
    message: "Your monthly report is ready.",
    priority: "LOW",
  },
  INFO: {
    type: "INFO",
    title: "Information",
    message: "You have a new notification.",
    priority: "LOW",
  },
  SUCCESS: {
    type: "SUCCESS",
    title: "Success",
    message: "Operation completed successfully.",
    priority: "MEDIUM",
  },
  WARNING: {
    type: "WARNING",
    title: "Warning",
    message: "A warning has been issued.",
    priority: "HIGH",
  },
  ERROR: {
    type: "ERROR",
    title: "Error",
    message: "An error has occurred.",
    priority: "CRITICAL",
  },
  TASK: {
    type: "TASK",
    title: "New Task",
    message: "A new task has been assigned to you.",
    priority: "MEDIUM",
  },
  SYSTEM: {
    type: "SYSTEM",
    title: "System Alert",
    message: "A system alert has been triggered.",
    priority: "MEDIUM",
  },
  INVOICE_ASSIGNED: {
    type: "INVOICE_ASSIGNED",
    title: "Invoice Assigned",
    message: "An invoice has been assigned to you.",
    priority: "MEDIUM",
  },
  APPROVAL_COMPLETED: {
    type: "APPROVAL_COMPLETED",
    title: "Approval Completed",
    message: "An approval workflow has been completed.",
    priority: "MEDIUM",
  },
  INVOICE_ESCALATED: {
    type: "INVOICE_ESCALATED",
    title: "Invoice Escalated",
    message: "An invoice has been escalated.",
    priority: "HIGH",
  },
  DUPLICATE_FOUND: {
    type: "DUPLICATE_FOUND",
    title: "Duplicate Found",
    message: "A potential duplicate invoice has been detected.",
    priority: "HIGH",
  },
  SYSTEM_ALERT: {
    type: "SYSTEM_ALERT",
    title: "System Alert",
    message: "A system alert requires your attention.",
    priority: "HIGH",
  },
  DELEGATION_REQUEST: {
    type: "DELEGATION_REQUEST",
    title: "Delegation Request",
    message: "You have received a delegation request.",
    priority: "MEDIUM",
  },
  COMPLIANCE_WARNING: {
    type: "COMPLIANCE_WARNING",
    title: "Compliance Warning",
    message: "A compliance warning has been issued.",
    priority: "HIGH",
  },
  WORKLOAD_THRESHOLD: {
    type: "WORKLOAD_THRESHOLD",
    title: "Workload Threshold",
    message: "Your workload threshold has been reached.",
    priority: "MEDIUM",
  },
};

export class NotificationUtils {
  static getTemplate(type: NotificationType): NotificationTemplate {
    const template = NOTIFICATION_TEMPLATES[type];
    return (
      template || {
        type: type,
        title: "Notification",
        message: "You have a new notification.",
        priority: "MEDIUM",
      }
    );
  }

  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId: userId,
        status: "UNREAD",
      },
    });
  }

  static async getRecentNotifications(userId: string, limit: number = 10) {
    return prisma.notification.findMany({
      where: {
        userId: userId,
        archivedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }

  static async markAsRead(notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: "READ",
        readAt: new Date(),
      },
    });
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId: userId,
        status: "UNREAD",
      },
      data: {
        status: "READ",
        readAt: new Date(),
      },
    });
  }

  static async archiveNotification(notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        archivedAt: new Date(),
      },
    });
  }
}

export default NotificationUtils;
