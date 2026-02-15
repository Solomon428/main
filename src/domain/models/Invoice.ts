import { InvoiceStatus } from '../enums/InvoiceStatus';
import { PaymentStatus } from '../enums/PaymentStatus';
import { ApprovalStatus } from '../enums/ApprovalStatus';
import { RiskLevel } from '../enums/RiskLevel';
import { SLAStatus } from '../enums/SLAStatus';
import { PaymentMethod } from '../enums/PaymentMethod';
import { Currency } from '../enums/Currency';

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  supplierId?: string | null;
  creatorId?: string | null;
  updaterId?: string | null;
  validatorId?: string | null;
  referenceNumber?: string | null;
  purchaseOrderNumber?: string | null;
  contractNumber?: string | null;
  quoteNumber?: string | null;
  customerReference?: string | null;
  invoiceDate: Date;
  dueDate: Date;
  receivedDate: Date;
  postedDate?: Date | null;
  validatedDate?: Date | null;
  approvedDate?: Date | null;
  paidDate?: Date | null;
  cancelledDate?: Date | null;
  disputedDate?: Date | null;
  subtotalExclVAT: unknown; // Decimal
  subtotalInclVAT?: unknown | null; // Decimal
  vatRate: unknown; // Decimal
  vatAmount: unknown; // Decimal
  totalAmount: unknown; // Decimal
  amountPaid: unknown; // Decimal
  amountDue: unknown; // Decimal
  discountAmount: unknown; // Decimal
  penaltyAmount: unknown; // Decimal
  shippingAmount: unknown; // Decimal
  currency: Currency;
  exchangeRate?: unknown | null; // Decimal
  baseCurrency: Currency;
  baseCurrencyAmount?: unknown | null; // Decimal
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  approvalStatus: ApprovalStatus;
  riskLevel: RiskLevel;
  fraudScore?: unknown | null; // Decimal
  anomalyScore?: unknown | null; // Decimal
  duplicateConfidence?: unknown | null; // Decimal
  duplicateOfId?: string | null;
  isDuplicate: boolean;
  duplicateCheckStatus?: string | null;
  slaStatus: SLAStatus;
  slaDueDate?: Date | null;
  slaBreachDate?: Date | null;
  processingDeadline?: Date | null;
  supplierName?: string | null;
  supplierVAT?: string | null;
  supplierTaxId?: string | null;
  supplierRegNumber?: string | null;
  supplierAddress?: string | null;
  supplierEmail?: string | null;
  supplierPhone?: string | null;
  paymentTerms: number;
  paymentMethod?: PaymentMethod | null;
  bankAccountId?: string | null;
  paymentBatchId?: string | null;
  glCode?: string | null;
  costCenter?: string | null;
  projectCode?: string | null;
  department?: string | null;
  budgetCategory?: string | null;
  pdfUrl?: string | null;
  pdfHash?: string | null;
  xmlUrl?: string | null;
  ocrText?: string | null;
  ocrConfidence?: unknown | null; // Decimal
  extractionMethod?: string | null;
  extractionConfidence: unknown; // Decimal
  validationScore: unknown; // Decimal
  isRecurring: boolean;
  recurrencePattern?: string | null;
  nextRecurrenceDate?: Date | null;
  parentInvoiceId?: string | null;
  originalInvoiceId?: string | null;
  isUrgent: boolean;
  requiresAttention: boolean;
  manualReviewRequired: boolean;
  manualReviewReason?: string | null;
  isEscalated: boolean;
  escalatedAt?: Date | null;
  escalatedBy?: string | null;
  escalationReason?: string | null;
  vatCompliant: boolean;
  termsCompliant: boolean;
  fullyApproved: boolean;
  readyForPayment: boolean;
  currentApproverId?: string | null;
  nextApproverId?: string | null;
  currentStage: number;
  totalStages: number;
  notes?: string | null;
  internalNotes?: string | null;
  rejectionReason?: string | null;
  disputeReason?: string | null;
  tags: string[];
  customFields?: Record<string, unknown> | null;
  source: string;
  externalId?: string | null;
  integrationId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
