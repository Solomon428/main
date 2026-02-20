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
} from "@prisma/client";

// Re-export all SQLite-compatible types
export * from "./sqlite";

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

// Re-export Prisma enums for convenience (for server-side use)
export {
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
} from "@prisma/client";

// Additional types referenced in code
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

// Duplicate Type for duplicate detection
export type DuplicateType =
  | "EXACT"
  | "FUZZY"
  | "TEMPORAL"
  | "SUPPLIER_CLUSTER"
  | "LINE_ITEM"
  | "CROSS_SUPPLIER"
  | "PO_REFERENCE"
  | "PARTIAL";

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

// Added by fix script
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

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  confidence: number;
  matchedInvoiceId?: string;
  matchReasons: string[];
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
