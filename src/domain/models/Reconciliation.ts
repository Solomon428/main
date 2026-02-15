import { ReconciliationStatus } from '../enums/ReconciliationStatus';

export interface Reconciliation {
  id: string;
  organizationId: string;
  bankAccountId: string;
  statementNumber?: string | null;
  statementDate: Date;
  startDate: Date;
  endDate: Date;
  openingBalance: unknown; // Decimal
  closingBalance: unknown; // Decimal
  statementBalance: unknown; // Decimal
  difference: unknown; // Decimal
  status: ReconciliationStatus;
  preparedBy?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  notes?: string | null;
  adjustments?: Record<string, unknown> | null;
  statementFileUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}
