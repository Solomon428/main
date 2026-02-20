import { PaymentStatus } from "../enums/PaymentStatus";
import { PaymentMethod } from "../enums/PaymentMethod";
import { Currency } from "../enums/Currency";

export interface Payment {
  id: string;
  organizationId: string;
  invoiceId?: string | null;
  supplierId?: string | null;
  bankAccountId?: string | null;
  paymentBatchId?: string | null;
  processedBy?: string | null;
  paymentNumber: string;
  paymentDate: Date;
  amount: unknown; // Decimal
  currency: Currency;
  exchangeRate?: unknown | null; // Decimal
  baseCurrencyAmount?: unknown | null; // Decimal
  paymentMethod: PaymentMethod;
  bankReference?: string | null;
  checkNumber?: string | null;
  transactionId?: string | null;
  status: PaymentStatus;
  processedAt?: Date | null;
  confirmedAt?: Date | null;
  failedAt?: Date | null;
  failureReason?: string | null;
  reconciliationId?: string | null;
  isReconciled: boolean;
  reconciledAt?: Date | null;
  notes?: string | null;
  internalNotes?: string | null;
  metadata?: Record<string, unknown> | null;
  externalId?: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}
