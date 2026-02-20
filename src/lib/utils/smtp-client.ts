import nodemailer from "nodemailer";
import { auditLogger } from "./audit-logger";
import { LogSeverity, EntityType } from "@/types";

interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  replyTo?: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  pool?: boolean;
  maxConnections?: number;
  rateDelta?: number;
  rateLimit?: number;
}

export class SMTPClient {
  private static transporter: nodemailer.Transporter | null = null;
  private static config: SMTPConfig | null = null;

  static initialize(): boolean {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    if (!host || !user || !pass) {
      console.warn(
        "[SMTPClient] SMTP not configured. Emails will be logged only.",
      );
      return false;
    }

    this.config = {
      host,
      port,
      secure,
      auth: { user, pass },
      pool: true,
      maxConnections: 5,
      rateDelta: 1000,
      rateLimit: 5,
    };

    try {
      this.transporter = nodemailer.createTransport(this.config);
      console.log(`[SMTPClient] Initialized with host: ${host}:${port}`);
      return true;
    } catch (error) {
      console.error("[SMTPClient] Failed to initialize:", error);
      return false;
    }
  }

  static async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("[SMTPClient] Connection verification failed:", error);
      return false;
    }
  }

  static async sendEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter && !this.initialize()) {
      console.log("[SMTPClient] Email (not sent - SMTP not configured):", {
        to: options.to,
        subject: options.subject,
      });
      return { success: false, error: "SMTP not configured" };
    }

    const defaultFrom =
      process.env.SMTP_FROM || `CreditorFlow <${process.env.SMTP_USER}>`;

    try {
      const result = await this.transporter!.sendMail({
        from: options.from || defaultFrom,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        replyTo: options.replyTo,
      });

      await auditLogger.log({
        action: "SYSTEM_ALERT",
        entityType: EntityType.SYSTEM,
        entityId: "EMAIL_SENT",
        entityDescription: `Email sent: ${options.subject}`,
        severity: LogSeverity.INFO,
        metadata: {
          to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
          subject: options.subject,
          messageId: result.messageId,
        },
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[SMTPClient] Failed to send email:", error);

      await auditLogger.log({
        action: "SYSTEM_ALERT",
        entityType: EntityType.SYSTEM,
        entityId: "EMAIL_FAILED",
        entityDescription: `Email failed: ${errorMessage}`,
        severity: LogSeverity.ERROR,
        metadata: {
          to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
          subject: options.subject,
          error: errorMessage,
        },
      });

      return { success: false, error: errorMessage };
    }
  }

  static async sendBulkEmails(
    recipients: string[],
    options: Omit<EmailOptions, "to">,
  ): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const results = { sent: 0, failed: 0, errors: [] as string[] };

    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchPromises = batch.map((recipient) =>
        this.sendEmail({ ...options, to: recipient }),
      );

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((result, index) => {
        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`${batch[index]}: ${result.error}`);
        }
      });

      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return {
      success: results.failed === 0,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
    };
  }

  static getTransporter(): nodemailer.Transporter | null {
    return this.transporter;
  }

  static isConfigured(): boolean {
    return !!this.transporter || !!process.env.SMTP_HOST;
  }
}

SMTPClient.initialize();
