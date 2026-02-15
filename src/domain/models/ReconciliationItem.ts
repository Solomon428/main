import { TransactionType } from '../enums/TransactionType';
import { ReconciliationItemStatus } from '../enums/ReconciliationItemStatus';
import { Currency } from '../enums/Currency';

export interface ReconciliationItem {
  id: string;
  reconciliationId: string;
  paymentId?: string | null;
  transactionDate: Date;
  description: string;
  reference?: string | null;
  amount: unknown; // Decimal
  currency: Currency;
  transactionType: TransactionType;
  matchedPaymentId?: string | null;
  matchedAmount?: unknown | null; // Decimal
  matchConfidence?: unknown | null; // Decimal
  matchingMethod?: string | null;
  status: ReconciliationItemStatus;
  isAdjustment: boolean;
  adjustmentReason?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
