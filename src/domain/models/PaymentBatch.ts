import { PaymentStatus } from '../enums/PaymentStatus';
import { Currency } from '../enums/Currency';

export interface PaymentBatch {
  id: string;
  organizationId: string;
  batchNumber: string;
  description?: string | null;
  totalAmount: unknown; // Decimal
  paymentCount: number;
  currency: Currency;
  paymentDate: Date;
  scheduledFor?: Date | null;
  status: PaymentStatus;
  isRecurring: boolean;
  processedAt?: Date | null;
  processedBy?: string | null;
  releasedAt?: Date | null;
  releasedBy?: string | null;
  bankAccountId?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}
