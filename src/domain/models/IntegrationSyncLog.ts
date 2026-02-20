import { SyncStatus } from "../enums/SyncStatus";

export interface IntegrationSyncLog {
  id: string;
  integrationId: string;
  syncType: string;
  status: SyncStatus;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors?: Record<string, unknown> | null;
  startedAt: Date;
  completedAt?: Date | null;
  duration?: number | null;
  triggeredBy: string;
  metadata?: Record<string, unknown> | null;
}
