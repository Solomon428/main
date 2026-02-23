import {
  UserRole,
  Department,
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

// Bridge Prisma enums to domain-friendly aliases
import type { InvoiceStatus as PrismaInvoiceStatus } from './prisma-enums';
export type InvoiceStatus = PrismaInvoiceStatus;

// Re-export all Prisma types for consistency
export * from "@prisma/client";

// Duplicate detection types
export interface DuplicateCheckResult {
  checkId?: string;
  isDuplicate: boolean;
  confidence: number;
  matchedInvoiceId?: string;
  matchReasons: string[];
  checkTimestamp?: Date;
  inputHash?: string;
}

export interface DuplicateAuditTrail {
  auditId?: string;
  checkId: string;
  userId: string;
  action: string;
  eventType?: string;
  eventDescription?: string;
  ipAddress?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export type DuplicateRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "SEVERE";

export type DuplicateType = 
  | "EXACT"
  | "FUZZY"
  | "SUPPLIER_MATCH"
  | "AMOUNT_MATCH"
  | "DATE_MATCH"
  | "LINE_ITEM_MATCH"
  | "OCR_SIMILARITY"
  | "MANUAL_FLAG";

export type DuplicateMitigationAction =
  | "ACCEPT"
  | "REVIEW"
  | "BLOCK"
  | "ESCALATE"
  | "FLAG_FOR_HUMAN_REVIEW"
  | "FRAUD_INVESTIGATION"
  | "REGULATORY_REPORTING"
  | "PO_VERIFICATION"
  | "CONTRACT_REVIEW"
  | "BLOCK_PAYMENT";

export interface DuplicatePattern {
  patternId: string;
  patternName: string;
  patternDescription: string;
  patternType?: string;
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
  evidenceSource?: DuplicateEvidenceSource;
  confidence: number;
  details: Record<string, any>;
  description?: string;
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
  subtotalExclVAT: number;
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
  totalAmount?: number;
  supplierName?: string;
  department?: string;
  requesterRole?: string;
  supplierCategory?: string;
  riskLevel?: string;
  supplierAgeDays?: number;
  priority?: string;
  totalStages?: number;
};

export type ApprovalRoutingResult = {
  chainId?: string;
  routingId?: string;
  routingTimestamp?: Date;
  inputHash?: string;
  strategy?: string;
  stages?: ApprovalStage[];
  requiresApproval: boolean;
  reason?: string;
  escalationLevel?: string;
  totalStages?: number;
  approvalLimit?: number;
  approvalChain?: any;
  workloadDistribution?: any;
  slaDeadlines?: SLADeadline[];
  requiresEscalation?: boolean;
  requiresDelegation?: boolean;
  requiresBackup?: boolean;
  routingDurationMs?: number;
  auditTrail?: any[];
  metadata?: any;
};

export type ApprovalStage = {
  sequence: number;
  approverId: string;
  approverRole?: string;
  role?: string;
  limit?: number;
  isBackup?: boolean;
  deadline?: Date;
  slaHours?: number;
};

export type SLAConfig = {
  hours: number;
  escalationHours?: number;
  warningThresholdPercent?: number;
};

// SLA deadline representation for approval routing
export type SLADeadline = {
  stage: number;
  approverId: string;
  slaDeadline: Date;
  slaHours: number;
  isBusinessHoursOnly: boolean;
  holidayAdjusted: boolean;
  escalationTime: Date;
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
  // Backwards-compatible OCR extraction confidence fields used across the codebase
  extractionConfidence?: number;
  rawText?: string;
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

// Approval Routing Types
export type ApproverAssignment = {
  approverId: string;
  sequence: number;
  isPrimary: boolean;
  isBackup: boolean;
  backupOf?: string;
};

export type RoutingStrategy = "AMOUNT_BASED" | "DEPARTMENT_BASED" | "SUPPLIER_BASED" | "RISK_BASED" | "HYBRID";

export type EscalationLevel = "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "LEVEL_4" | "LEVEL_5";

export type WorkloadDistribution = {
  approverId: string;
  currentWorkload: number;
  maxWorkload: number;
  capacity: number;
  stageCount: number;
};

export type ApprovalChainEntry = {
  chainId?: string;
  sequence?: number;
  approverId?: string;
  approver?: any;
  role?: string;
  status: ApprovalStatus;
  assignedAt?: Date;
  completedAt?: Date;
  stage?: number;
  description?: string;
  slaHours?: number;
  department?: string;
  minAmount?: number;
  maxAmount?: number;
  conditions?: ApprovalCondition[];
  backupApproverId?: string | null;
  backupApprover?: any;
  delegationChain?: any[];
  escalationPath?: string[];
  slaDeadline?: Date;
  canDelegate?: boolean;
  canEscalate?: boolean;
  requiresComment?: boolean;
};

export type ApprovalCondition = {
  field: string;
  operator?: RoutingRuleOperator;
  value: any;
  type?: string;
  description?: string;
};

export type RoutingRule = {
  id?: string;
  ruleId?: string;
  name?: string;
  type?: RoutingRuleType;
  ruleType?: string;
  conditions?: ApprovalCondition[];
  action?: RoutingRuleAction;
  ruleAction?: string;
  priority: number;
  isActive: boolean;
  ruleOperator?: string;
  ruleValue?: any;
};

export type RoutingRuleType = "AMOUNT_THRESHOLD" | "DEPARTMENT_MATCH" | "SUPPLIER_CATEGORY" | "RISK_LEVEL" | "CUSTOM";

export type RoutingRuleOperator = "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "CONTAINS" | "IN" | "BETWEEN";

export type RoutingRuleAction = "ROUTE_TO_APPROVER" | "ROUTE_TO_ROLE" | "ROUTE_TO_DEPARTMENT" | "ESCALATE" | "BLOCK" | "FLAG";

export type ApproverAvailability = {
  approverId: string;
  isAvailable: boolean;
  unavailableUntil?: Date;
  reason?: string;
};

export type ApproverCapacity = {
  approverId: string;
  currentPending: number;
  maxPending: number;
  capacityPercentage: number;
};

export type ApprovalLimitType = "AMOUNT" | "PERCENTAGE" | "CATEGORY_AMOUNT";

export type ApprovalLimitScope = "INDIVIDUAL" | "DEPARTMENT" | "ROLE" | "ORGANIZATION";

export type RoutingAuditTrail = {
  id?: string;
  auditId?: string;
  routingId?: string;
  userId?: string;
  decision?: string;
  approvers?: string[];
  timestamp?: Date;
  metadata?: Record<string, any>;
  eventType?: string;
  eventDescription?: string;
};

export type RoutingMetadata = {
  invoiceId: string;
  routingId: string;
  strategy: RoutingStrategy;
  timestamp: Date;
  rulesApplied: string[];
};

export type RoutingException = {
  code: RoutingErrorCode;
  message: string;
  severity: RoutingErrorSeverity;
  action: RoutingErrorAction;
  details?: Record<string, any>;
};

export type RoutingErrorCode = "NO_APPROVER_FOUND" | "APPROVER_UNAVAILABLE" | "LIMIT_EXCEEDED" | "CHAIN_INCOMPLETE" | "SLA_BREACH" | "DELEGATION_FAILED";

export type RoutingErrorSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RoutingErrorAction = "ESCALATE" | "NOTIFY" | "BLOCK" | "FALLBACK";

export type SAApprovalLimit = {
  role: string;
  limit: number;
  escalationLevel?: EscalationLevel;
};

export type DepartmentApprovalLimit = {
  department: string;
  baseLimit: number;
  limit?: number;
  escalationLevel?: EscalationLevel;
  escalationThreshold?: number;
};

export type RoleApprovalLimit = {
  role: string;
  baseLimit: number;
  maxLimit?: number;
  limit?: number;
  escalationLevel?: EscalationLevel;
};

export type SupplierCategoryApprovalLimit = {
  category: string;
  limit?: number;
  multiplier?: number;
  escalationLevel?: EscalationLevel;
};

export type RiskLevelApprovalLimit = {
  riskLevel: string;
  limit?: number;
  multiplier?: number;
  escalationLevel?: EscalationLevel;
};

export type CustomApprovalLimit = {
  name: string;
  condition: ApprovalCondition;
  limit: number;
  escalationLevel: EscalationLevel;
};

export const SA_COMPLIANCE_RULES = {
  SMALL_VALUE_LIMIT: 10000,
  MEDIUM_VALUE_LIMIT: 50000,
  LARGE_VALUE_LIMIT: 200000,
  HIGH_VALUE_LIMIT: 1000000,
} as const;
