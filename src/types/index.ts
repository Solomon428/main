import {
  UserRole,
  Department,
  InvoiceStatus,
  ApprovalStatus,
  ApprovalDecision,
  AuditAction,
  ComplianceStatus,
  NotificationType,
  NotificationPriority,
  SupplierStatus,
  PaymentStatus,
  EntityType,
  LogSeverity,
  ApprovalChainType,
  BankAccountType,
  ComplianceCheckType,
  Currency,
  IntegrationStatus,
  IntegrationType,
  MatchingStatus,
  NotificationChannel,
  PaymentMethod,
  ReconciliationItemStatus,
  ReconciliationStatus,
  ScheduledTaskStatus,
  SLAStatus,
  StorageProvider,
  SupplierCategory,
  TransactionType,
  WebhookStatus,
} from "@prisma/client";

// Re-export all Prisma types for consistency
export * from "@prisma/client";

// Duplicate detection types
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: number;
  matchedInvoiceId?: string;
  matchReasons: string[];
}

export interface DuplicateAuditTrail {
  auditId: string;
  checkId: string;
  userId: string;
  action: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export type DuplicateRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type DuplicateMitigationAction =
  | "ACCEPT"
  | "REVIEW"
  | "BLOCK"
  | "ESCALATE"
  | "FLAG_FOR_HUMAN_REVIEW";

export interface DuplicatePattern {
  patternId: string;
  patternName: string;
  patternDescription: string;
  matchCriteria: Record<string, any>;
  confidenceThreshold: number;
  isActive: boolean;
  lastUpdated: Date;
}

export interface DuplicateEvidence {
  evidenceId: string;
  checkId: string;
  evidenceType: DuplicateEvidenceType;
  source: DuplicateEvidenceSource;
  confidence: number;
  details: Record<string, any>;
  timestamp: Date;
}

export type DuplicateEvidenceType =
  | "INVOICE_NUMBER_MATCH"
  | "SUPPLIER_NAME_MATCH"
  | "AMOUNT_MATCH"
  | "DATE_RANGE_MATCH"
  | "PO_NUMBER_MATCH"
  | "LINE_ITEM_MATCH"
  | "BANK_ACCOUNT_MATCH";

export type DuplicateEvidenceSource =
  | "OCR_EXTRACTION"
  | "MANUAL_ENTRY"
  | "INTEGRATION_FEED"
  | "USER_REPORT"
  | "SYSTEM_ANALYSIS";

// Risk scoring types
export type FraudScoreLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  recommendations: string[];
  assessedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface RiskFactor {
  name: string;
  value: number;
  weight: number;
  description: string;
}

// Compliance types
export interface ComplianceValidationResult {
  isValid: boolean;
  checkType: string;
  details: Record<string, any>;
  passedChecks: string[];
  failedChecks: string[];
  recommendations: string[];
  validatedAt: Date;
}

// VAT Validator
export interface VATValidator {
  validateVAT(vatNumber: string, countryCode?: string): Promise<VATCheckResult>;
  getSupplierInfo(vatNumber: string, countryCode?: string): Promise<SupplierInfo>;
}

export interface SupplierInfo {
  name: string;
  address: string;
  countryCode: string;
  vatNumber: string;
  valid: boolean;
  requestDate: Date;
}

// Invoice with relations type
export interface InvoiceWithRelations {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplier?: {
    id: string;
    name: string;
    vatNumber?: string | null;
  } | null;
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: number;
  subtotal: number;
  vatAmount: number;
  currency: string;
  status: InvoiceStatus;
  lineItems?: LineItemDTO[];
  approvals?: ApprovalDTO[];
}

export interface LineItemDTO {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  glAccount?: string | null;
  costCenter?: string | null;
  category?: string | null;
}

// Permission type
export type Permission =
  | "VIEW_INVOICE"
  | "CREATE_INVOICE"
  | "EDIT_INVOICE"
  | "DELETE_INVOICE"
  | "APPROVE_INVOICE"
  | "VIEW_REPORT"
  | "MANAGE_SUPPLIER"
  | "MANAGE_USER"
  | "MANAGE_SETTINGS"
  | "VIEW_AUDIT_LOG";

// Core DTOs
export interface InvoiceDTO {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: number;
  subTotal: number;
  vatAmount: number;
  currency: string;
  status: InvoiceStatus;
  currentStage: number;
  isDuplicate: boolean;
  duplicateReason?: string;
  complianceStatus: ComplianceStatus;
  riskScore: number;
  fraudScore: number;
}

export interface ApprovalDTO {
  id: string;
  invoiceId: string;
  approverId: string;
  sequenceNumber: number;
  totalStages: number;
  status: ApprovalStatus;
  decision?: ApprovalDecision;
  comments?: string;
  slaDeadline?: Date;
  isWithinSLA?: boolean;
}

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: Department;
  isActive: boolean;
  approvalLimit: number;
  currentWorkload: number;
}

export interface SupplierDTO {
  id: string;
  name: string;
  vatNumber?: string;
  registrationNumber?: string;
  category: string;
  isActive: boolean;
  isBlacklisted: boolean;
  riskScore: number;
}

export interface NotificationDTO {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  priority: NotificationPriority;
  createdAt: Date;
}

export interface AuditLogDTO {
  id: string;
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  entityDescription?: string;
  severity: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Core types for server-side use
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type PriorityLevel = NotificationPriority;
export type DeliveryMethod =
  | "IN_APP"
  | "EMAIL"
  | "SMS"
  | "SLACK"
  | "TEAMS"
  | "WEBHOOK"
  | "PUSH";

export type ApprovalRoutingInput = {
  invoiceId: string;
  organizationId: string;
  amount: number;
  currency: string;
  supplierId?: string;
  requestedBy: string;
};

export type ApprovalRoutingResult = {
  chainId?: string;
  stages: ApprovalStage[];
  requiresApproval: boolean;
  reason?: string;
};

export type ApprovalStage = {
  sequence: number;
  approverId: string;
  approverRole: string;
  limit?: number;
  isBackup?: boolean;
  deadline?: Date;
};

export type SLAConfig = {
  hours: number;
  escalationHours?: number;
  warningThresholdPercent?: number;
};

export type DuplicateCheckInput = {
  invoiceNumber?: string;
  supplierId: string;
  amount: number;
  invoiceDate: Date;
  organizationId: string;
  excludeInvoiceId?: string;
};

export type VATCheckResult = {
  isValid: boolean;
  vatNumber: string;
  supplierName?: string;
  errorCode?: string;
  checkedAt: Date;
};

export type BatchStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL";

export type ExtractedInvoiceData = {
  invoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  totalAmount?: number;
  vatAmount?: number;
  currency?: string;
  supplierName?: string;
  supplierVATNumber?: string;
  lineItems?: ExtractedLineItem[];
  confidence: number;
};

export type ExtractedLineItem = {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  vatRate?: number;
};

export type ParserResult = {
  success: boolean;
  data?: ExtractedInvoiceData;
  confidence: number;
  processingMs?: number;
  errors?: string[];
};