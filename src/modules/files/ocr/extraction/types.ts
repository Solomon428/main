import { Decimal } from "decimal.js";
import { Currency } from "../../../domain/enums/Currency";
import { TaxType } from "../../../domain/enums/TaxType";

export interface ExtractedInvoiceData {
  invoiceNumber?: string;
  referenceNumber?: string;
  issueDate?: Date;
  dueDate?: Date;
  currency?: Currency;
  totalAmount?: Decimal;
  subtotalAmount?: Decimal;
  taxAmount?: Decimal;
  discountAmount?: Decimal;
  shippingAmount?: Decimal;
  supplierName?: string;
  supplierAddress?: string;
  supplierVatNumber?: string;
  supplierEmail?: string;
  supplierPhone?: string;
  buyerName?: string;
  buyerAddress?: string;
  buyerVatNumber?: string;
  paymentTerms?: string;
  notes?: string;
  lineItems: ExtractedLineItem[];
  confidence: number;
  extractionMethod: "regex" | "ml" | "hybrid" | "manual";
  metadata: Record<string, any>;
  warnings: string[];
  errors: string[];
}

export interface ExtractedLineItem {
  lineNumber: number;
  description: string;
  quantity: Decimal;
  unitPrice: Decimal;
  unitOfMeasure?: string;
  taxRate?: Decimal;
  taxType?: TaxType;
  taxAmount?: Decimal;
  discountRate?: Decimal;
  discountAmount?: Decimal;
  totalAmount: Decimal;
  glAccountCode?: string;
  costCenter?: string;
  projectCode?: string;
  departmentCode?: string;
  confidence: number;
  extractedText: string;
}

export interface ExtractionConfig {
  confidenceThreshold: number;
  dateFormats: string[];
  currencySymbols: Record<string, Currency>;
  defaultCurrency: Currency;
  defaultTaxRate: Decimal;
  language: string;
  useMachineLearning: boolean;
  mlModelPath?: string;
  regexPatterns: {
    invoiceNumber: RegExp[];
    date: RegExp[];
    amount: RegExp[];
    vatNumber: RegExp[];
    email: RegExp[];
    phone: RegExp[];
    lineItem: RegExp[];
  };
}

export interface ExtractionResult {
  success: boolean;
  data: ExtractedInvoiceData;
  processingTime: number;
  pagesProcessed: number;
  textLength: number;
  validation: {
    isValid: boolean;
    score: number;
    issues: Array<{
      type: "error" | "warning";
      message: string;
      field?: string;
    }>;
  };
}

export interface ExtractionProgress {
  stage:
    | "parsing"
    | "validating"
    | "matching"
    | "enriching"
    | "completed"
    | "failed";
  progress: number;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export class ExtractionServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>,
    public cause?: Error,
  ) {
    super(message);
    this.name = "ExtractionServiceError";
  }
}

export class ExtractionValidationError extends ExtractionServiceError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, "VALIDATION_ERROR", context, cause);
    this.name = "ExtractionValidationError";
  }
}

export class ExtractionParsingError extends ExtractionServiceError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, "PARSING_ERROR", context, cause);
    this.name = "ExtractionParsingError";
  }
}

export class ExtractionEnrichmentError extends ExtractionServiceError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, "ENRICHMENT_ERROR", context, cause);
    this.name = "ExtractionEnrichmentError";
  }
}
