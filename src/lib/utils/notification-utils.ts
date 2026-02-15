import { prisma } from '../database/client';
import { 
  NotificationType, 
  PriorityLevel,
  DeliveryMethod,
  NotificationType as NotificationTypeEnum,
  PriorityLevel as PriorityLevelEnum,
  DeliveryMethod as DeliveryMethodEnum,
} from '@/types/sqlite';

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message: string;
  priority: PriorityLevel;
}

export const NOTIFICATION_TEMPLATES: Partial<
  Record<NotificationType, NotificationTemplate>
> = {
  [NotificationTypeEnum.APPROVAL_REQUIRED]: {
    type: NotificationTypeEnum.APPROVAL_REQUIRED,
    title: 'Approval Required',
    message: 'An invoice requires your approval.',
    priority: PriorityLevelEnum.HIGH,
  },
  [NotificationTypeEnum.INVOICE_APPROVED]: {
    type: NotificationTypeEnum.INVOICE_APPROVED,
    title: 'Invoice Approved',
    message: 'An invoice has been approved.',
    priority: PriorityLevelEnum.MEDIUM,
  },
  [NotificationTypeEnum.INVOICE_REJECTED]: {
    type: NotificationTypeEnum.INVOICE_REJECTED,
    title: 'Invoice Rejected',
    message: 'An invoice has been rejected.',
    priority: PriorityLevelEnum.HIGH,
  },
  [NotificationTypeEnum.ESCALATION_TRIGGERED]: {
    type: NotificationTypeEnum.ESCALATION_TRIGGERED,
    title: 'Escalation Triggered',
    message: 'An escalation has been triggered.',
    priority: PriorityLevelEnum.CRITICAL,
  },
  [NotificationTypeEnum.SLA_BREACH]: {
    type: NotificationTypeEnum.SLA_BREACH,
    title: 'SLA Breach',
    message: 'An invoice has breached SLA.',
    priority: PriorityLevelEnum.CRITICAL,
  },
  [NotificationTypeEnum.FRAUD_ALERT]: {
    type: NotificationTypeEnum.FRAUD_ALERT,
    title: 'Fraud Alert',
    message: 'A potential fraud has been detected.',
    priority: PriorityLevelEnum.CRITICAL,
  },
  [NotificationTypeEnum.PAYMENT_DUE_SOON]: {
    type: NotificationTypeEnum.PAYMENT_DUE_SOON,
    title: 'Payment Due Soon',
    message: 'An invoice payment is due soon.',
    priority: PriorityLevelEnum.HIGH,
  },
  [NotificationTypeEnum.PAYMENT_OVERDUE]: {
    type: NotificationTypeEnum.PAYMENT_OVERDUE,
    title: 'Payment Overdue',
    message: 'An invoice payment is overdue.',
    priority: PriorityLevelEnum.CRITICAL,
  },
  [NotificationTypeEnum.MONTHLY_REPORT]: {
    type: NotificationTypeEnum.MONTHLY_REPORT,
    title: 'Monthly Report',
    message: 'Your monthly report is ready.',
    priority: PriorityLevelEnum.LOW,
  },
  [NotificationTypeEnum.INFO]: {
    type: NotificationTypeEnum.INFO,
    title: 'Information',
    message: 'You have a new notification.',
    priority: PriorityLevelEnum.LOW,
  },
  [NotificationTypeEnum.SUCCESS]: {
    type: NotificationTypeEnum.SUCCESS,
    title: 'Success',
    message: 'Operation completed successfully.',
    priority: PriorityLevelEnum.MEDIUM,
  },
  [NotificationTypeEnum.WARNING]: {
    type: NotificationTypeEnum.WARNING,
    title: 'Warning',
    message: 'A warning has been issued.',
    priority: PriorityLevelEnum.HIGH,
  },
  [NotificationTypeEnum.ERROR]: {
    type: NotificationTypeEnum.ERROR,
    title: 'Error',
    message: 'An error has occurred.',
    priority: PriorityLevelEnum.CRITICAL,
  },
  [NotificationTypeEnum.TASK]: {
    type: NotificationTypeEnum.TASK,
    title: 'New Task',
    message: 'A new task has been assigned to you.',
    priority: PriorityLevelEnum.MEDIUM,
  },
  [NotificationTypeEnum.SYSTEM]: {
    type: NotificationTypeEnum.SYSTEM,
    title: 'System Alert',
    message: 'A system alert has been triggered.',
    priority: PriorityLevelEnum.MEDIUM,
  },
  [NotificationTypeEnum.INVOICE_ASSIGNED]: {
    type: NotificationTypeEnum.INVOICE_ASSIGNED,
    title: 'Invoice Assigned',
    message: 'An invoice has been assigned to you.',
    priority: PriorityLevelEnum.MEDIUM,
  },
  [NotificationTypeEnum.APPROVAL_COMPLETED]: {
    type: NotificationTypeEnum.APPROVAL_COMPLETED,
    title: 'Approval Completed',
    message: 'An approval workflow has been completed.',
    priority: PriorityLevelEnum.MEDIUM,
  },
  [NotificationTypeEnum.INVOICE_ESCALATED]: {
    type: NotificationTypeEnum.INVOICE_ESCALATED,
    title: 'Invoice Escalated',
    message: 'An invoice has been escalated.',
    priority: PriorityLevelEnum.HIGH,
  },
  [NotificationTypeEnum.DUPLICATE_FOUND]: {
    type: NotificationTypeEnum.DUPLICATE_FOUND,
    title: 'Duplicate Found',
    message: 'A potential duplicate invoice has been detected.',
    priority: PriorityLevelEnum.HIGH,
  },
  [NotificationTypeEnum.SYSTEM_ALERT]: {
    type: NotificationTypeEnum.SYSTEM_ALERT,
    title: 'System Alert',
    message: 'A system alert requires your attention.',
    priority: PriorityLevelEnum.HIGH,
  },
  [NotificationTypeEnum.DELEGATION_REQUEST]: {
    type: NotificationTypeEnum.DELEGATION_REQUEST,
    title: 'Delegation Request',
    message: 'You have received a delegation request.',
    priority: PriorityLevelEnum.MEDIUM,
  },
  [NotificationTypeEnum.COMPLIANCE_WARNING]: {
    type: NotificationTypeEnum.COMPLIANCE_WARNING,
    title: 'Compliance Warning',
    message: 'A compliance warning has been issued.',
    priority: PriorityLevelEnum.HIGH,
  },
  [NotificationTypeEnum.WORKLOAD_THRESHOLD]: {
    type: NotificationTypeEnum.WORKLOAD_THRESHOLD,
    title: 'Workload Threshold',
    message: 'Your workload threshold has been reached.',
    priority: PriorityLevelEnum.WARNING,
  },
};

export class NotificationUtils {
  static getTemplate(type: NotificationType): NotificationTemplate {
    const template = NOTIFICATION_TEMPLATES[type];
    return (
      template || {
        type,
        title: 'Notification',
        message: 'You have a new notification.',
        priority: PriorityLevelEnum.MEDIUM,
      }
    );
  }

  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notifications.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  static async getRecentNotifications(userId: string, limit: number = 10) {
    return prisma.notifications.findMany({
      where: {
        userId,
        isArchived: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  static async markAsRead(notificationId: string): Promise<void> {
    await prisma.notifications.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readDate: new Date(),
      },
    });
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await prisma.notifications.updateMany({
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

  static async archiveNotification(notificationId: string): Promise<void> {
    await prisma.notifications.update({
      where: { id: notificationId },
      data: {
        isArchived: true,
      },
    });
  }
}

export default NotificationUtils;
