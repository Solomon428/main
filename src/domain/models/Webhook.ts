import { WebhookStatus } from '../enums/WebhookStatus';

export interface Webhook {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  secret?: string | null;
  events: string[];
  signatureMethod: string;
  verifySsl: boolean;
  allowedIps: string[];
  isActive: boolean;
  lastTriggeredAt?: Date | null;
  lastTriggerStatus?: WebhookStatus | null;
  lastTriggerError?: string | null;
  totalTriggers: number;
  successfulTriggers: number;
  failedTriggers: number;
  retryPolicy?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
}
