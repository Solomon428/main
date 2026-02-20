import { z } from "zod";
import { IntegrationType } from "../../domain/enums/IntegrationType";
import { IntegrationStatus } from "../../domain/enums/IntegrationStatus";
import { SyncStatus } from "../../domain/enums/SyncStatus";
import { WebhookStatus } from "../../domain/enums/WebhookStatus";

export const createIntegrationSchema = z.object({
  organizationId: z.string().uuid("Valid organization ID is required"),
  name: z.string().min(1, "Integration name is required"),
  description: z.string().optional(),
  type: z.nativeEnum(IntegrationType),
  provider: z.string().min(1, "Provider is required"),
  baseUrl: z.string().url("Valid URL is required").optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  webhookUrl: z.string().url("Valid URL is required").optional(),
  webhookSecret: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
  mappings: z.record(z.unknown()).optional(),
  syncFrequency: z.string().optional(),
});

export const updateIntegrationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
  mappings: z.record(z.unknown()).optional(),
  syncFrequency: z.string().optional(),
  status: z.nativeEnum(IntegrationStatus).optional(),
  isActive: z.boolean().optional(),
});

export const syncIntegrationSchema = z.object({
  syncType: z
    .enum(["IMPORT", "EXPORT", "BIDIRECTIONAL", "DELTA"])
    .default("BIDIRECTIONAL"),
  entityTypes: z.array(z.string()).optional(),
  filters: z.record(z.unknown()).optional(),
});

export const createWebhookSchema = z.object({
  integrationId: z.string().uuid("Valid integration ID is required"),
  url: z.string().url("Valid URL is required"),
  eventTypes: z.array(z.string()).min(1, "At least one event type is required"),
  secretKey: z.string().optional(),
  isActive: z.boolean().default(true),
  retryPolicy: z
    .object({
      maxRetries: z.number().int().default(3),
      retryInterval: z.number().int().default(60),
    })
    .optional(),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  eventTypes: z.array(z.string()).optional(),
  secretKey: z.string().optional(),
  isActive: z.boolean().optional(),
  retryPolicy: z
    .object({
      maxRetries: z.number().int(),
      retryInterval: z.number().int(),
    })
    .optional(),
});

export const createSyncLogSchema = z.object({
  integrationId: z.string().uuid("Valid integration ID is required"),
  syncType: z.enum(["IMPORT", "EXPORT", "BIDIRECTIONAL", "DELTA"]),
  status: z.nativeEnum(SyncStatus),
  recordsProcessed: z.number().int().default(0),
  recordsSucceeded: z.number().int().default(0),
  recordsFailed: z.number().int().default(0),
  errorMessage: z.string().optional(),
  errorDetails: z.record(z.unknown()).optional(),
  triggeredBy: z.string().default("SYSTEM"),
  metadata: z.record(z.unknown()).optional(),
});

export const updateSyncLogSchema = z.object({
  status: z.nativeEnum(SyncStatus),
  recordsProcessed: z.number().int().optional(),
  recordsSucceeded: z.number().int().optional(),
  recordsFailed: z.number().int().optional(),
  errorMessage: z.string().optional(),
  errorDetails: z.record(z.unknown()).optional(),
});

export const listIntegrationsQuerySchema = z.object({
  organizationId: z.string().uuid().optional(),
  type: z.nativeEnum(IntegrationType).optional(),
  status: z.nativeEnum(IntegrationStatus).optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const listSyncLogsQuerySchema = z.object({
  integrationId: z.string().uuid().optional(),
  status: z.nativeEnum(SyncStatus).optional(),
  syncType: z.enum(["IMPORT", "EXPORT", "BIDIRECTIONAL", "DELTA"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const listWebhookDeliveriesQuerySchema = z.object({
  webhookId: z.string().uuid().optional(),
  status: z.nativeEnum(WebhookStatus).optional(),
  event: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const retryDeliverySchema = z.object({
  deliveryId: z.string().uuid("Valid delivery ID is required"),
});

export const testIntegrationSchema = z.object({
  integrationId: z.string().uuid("Valid integration ID is required"),
});

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;
export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>;
export type SyncIntegrationInput = z.infer<typeof syncIntegrationSchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type CreateSyncLogInput = z.infer<typeof createSyncLogSchema>;
export type UpdateSyncLogInput = z.infer<typeof updateSyncLogSchema>;
export type ListIntegrationsQuery = z.infer<typeof listIntegrationsQuerySchema>;
export type ListSyncLogsQuery = z.infer<typeof listSyncLogsQuerySchema>;
export type ListWebhookDeliveriesQuery = z.infer<
  typeof listWebhookDeliveriesQuerySchema
>;
export type RetryDeliveryInput = z.infer<typeof retryDeliverySchema>;
export type TestIntegrationInput = z.infer<typeof testIntegrationSchema>;
