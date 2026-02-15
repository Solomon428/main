import { Currency } from '../enums/Currency';

export interface SupplierBankAccount {
  id: string;
  supplierId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode?: string | null;
  branchName?: string | null;
  branchCode?: string | null;
  swiftCode?: string | null;
  iban?: string | null;
  currency: Currency;
  isPrimary: boolean;
  isActive: boolean;
  verifiedAt?: Date | null;
  verificationMethod?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
