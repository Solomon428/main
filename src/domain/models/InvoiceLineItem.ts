import { MatchingStatus } from "../enums/MatchingStatus";

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  lineNumber: number;
  description: string;
  productCode?: string | null;
  sku?: string | null;
  quantity: unknown; // Decimal
  unitPrice: unknown; // Decimal
  unitOfMeasure?: string | null;
  vatRate?: unknown | null; // Decimal
  vatAmount?: unknown | null; // Decimal
  discountRate?: unknown | null; // Decimal
  discountAmount?: unknown | null; // Decimal
  netAmount: unknown; // Decimal
  lineTotalExclVAT: unknown; // Decimal
  lineTotalInclVAT: unknown; // Decimal
  glCode?: string | null;
  costCenter?: string | null;
  projectCode?: string | null;
  department?: string | null;
  budgetCategory?: string | null;
  isValidated: boolean;
  validationNotes?: string | null;
  validationScore?: unknown | null; // Decimal
  matchedPONumber?: string | null;
  matchedPOQuantity?: unknown | null; // Decimal
  matchedPOPrice?: unknown | null; // Decimal
  matchingStatus: MatchingStatus;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}
