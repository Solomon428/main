import { Job } from "bullmq";
import { prisma } from "@/db/prisma";
import { createWorker, QUEUE_NAMES } from "../queue";
import { info, error } from "../../../observability/logger";
import { NotificationChannel } from "../../../domain/enums/NotificationChannel";
import { NotificationStatus } from "../../../domain/enums/NotificationStatus";

interface NotificationJob {
  notificationId: string;
  userId: string;
  channel: NotificationChannel;
  content: {
    title: string;
    message: string;
    actionUrl?: string;
  };
}

/**
 * Process notification delivery jobs
 */
async function processNotificationJob(
  job: Job<NotificationJob>,
): Promise<void> {
  const { notificationId, channel, content } = job.data;

  info(`Sending notification ${notificationId} via ${channel}`, {
    jobId: job.id,
  });

  try {
    let delivered = false;

    switch (channel) {
      case NotificationChannel.EMAIL:
        delivered = await sendEmail(content);
        break;
      case NotificationChannel.SMS:
        delivered = await sendSMS(content);
        break;
      case NotificationChannel.PUSH:
        delivered = await sendPush(content);
        break;
      case NotificationChannel.SLACK:
        delivered = await sendSlack(content);
        break;
      case NotificationChannel.IN_APP:
        delivered = true; // Already in app
        break;
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }

    // Update notification status
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: delivered ? NotificationStatus.SENT : NotificationStatus.FAILED,
        sentAt: delivered ? new Date() : undefined,
        [`${channel.toLowerCase()}SentAt`]: delivered ? new Date() : undefined,
      },
    });

    info(`Notification ${notificationId} delivered via ${channel}`, {
      jobId: job.id,
    });
  } catch (err) {
    error(`Failed to send notification ${notificationId}`, {
      jobId: job.id,
      channel,
      error: err instanceof Error ? err.message : "Unknown error",
    });

    // Update notification with error
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.FAILED,
        lastError: err instanceof Error ? err.message : "Unknown error",
        lastErrorAt: new Date(),
        deliveryAttempts: { increment: 1 },
      },
    });

    throw err;
  }
}

/**
 * Send email notification
 */
async function sendEmail(content: {
  title: string;
  message: string;
  actionUrl?: string;
}): Promise<boolean> {
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  info(`Sending email: ${content.title}`);
  return true;
}

/**
 * Send SMS notification
 */
async function sendSMS(content: {
  title: string;
  message: string;
}): Promise<boolean> {
  // TODO: Integrate with SMS service (Twilio, etc.)
  info(`Sending SMS: ${content.title}`);
  return true;
}

/**
 * Send push notification
 */
async function sendPush(content: {
  title: string;
  message: string;
}): Promise<boolean> {
  // TODO: Integrate with push notification service (Firebase, etc.)
  info(`Sending push: ${content.title}`);
  return true;
}

/**
 * Send Slack notification
 */
async function sendSlack(content: {
  title: string;
  message: string;
}): Promise<boolean> {
  // TODO: Integrate with Slack webhook
  info(`Sending Slack: ${content.title}`);
  return true;
}

/**
 * Create and export the notification worker
 */
export const notificationWorker = createWorker<NotificationJob>(
  QUEUE_NAMES.NOTIFICATION,
  processNotificationJob,
  { concurrency: 10 },
);

export default notificationWorker;
