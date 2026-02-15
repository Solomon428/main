import { IntegrationType } from '../enums/IntegrationType';
import { IntegrationStatus } from '../enums/IntegrationStatus';
import { SyncStatus } from '../enums/SyncStatus';

export interface Integration {
  id: string;
  organizationId: string;
  name: string;
  type: IntegrationType;
  provider: string;
  config: Record<string, unknown>;
  credentials?: Record<string, unknown> | null;
  settings?: Record<string, unknown> | null;
  status: IntegrationStatus;
  lastSyncAt?: Date | null;
  lastSyncStatus?: SyncStatus | null;
  lastSyncError?: string | null;
  nextSyncAt?: Date | null;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
