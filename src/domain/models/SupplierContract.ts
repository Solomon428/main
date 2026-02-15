export interface SupplierContract {
  id: string;
  supplierId: string;
  contractNumber?: string | null;
  contractType?: string | null;
  startDate: Date;
  endDate?: Date | null;
  value?: unknown | null; // Decimal
  terms?: string | null;
  paymentTerms?: number | null;
  autoRenew: boolean;
  renewalNoticeDays: number;
  status: string;
  documentUrl?: string | null;
  signedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
