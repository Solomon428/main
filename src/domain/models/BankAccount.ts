import { BankAccountType } from '../enums/BankAccountType';
import { Currency } from '../enums/Currency';

export interface BankAccount {
  id: string;
  organizationId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode?: string | null;
  branchName?: string | null;
  branchCode?: string | null;
  swiftCode?: string | null;
  iban?: string | null;
  currency: Currency;
  accountType: BankAccountType;
  isPrimary: boolean;
  isActive: boolean;
  openingBalance: unknown; // Decimal
  currentBalance: unknown; // Decimal
  availableBalance: unknown; // Decimal
  lastReconciledAt?: Date | null;
  integrationId?: string | null;
  lastSyncAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}
