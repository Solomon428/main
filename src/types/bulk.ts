/**
 * Bulk Operations Types
 * CreditorFlow Enterprise Invoice Management System
 */

export type BulkOperationType =
  | "APPROVE"
  | "REJECT"
  | "ASSIGN"
  | "EXPORT"
  | "UPDATE_STATUS"
  | "DELETE";

export interface BulkOperationInput {
  invoiceIds: string[];
  operation: BulkOperationType;
}

export interface BulkApproveInput extends BulkOperationInput {
  operation: "APPROVE";
  approverId: string;
  comments?: string;
}

export interface BulkRejectInput extends BulkOperationInput {
  operation: "REJECT";
  approverId: string;
  reason: string;
}

export interface BulkAssignInput extends BulkOperationInput {
  operation: "ASSIGN";
  assigneeId: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueDate?: Date;
}

export interface BulkExportInput extends BulkOperationInput {
  operation: "EXPORT";
  format: "csv" | "xlsx" | "pdf";
  includeLineItems: boolean;
  includeApprovals: boolean;
  includeAuditLog: boolean;
  columns?: string[];
}

export interface BulkOperationResult {
  operationType: BulkOperationType;
  totalRequested: number;
  successful: number;
  failed: number;
  skipped: number;
  results: Array<{
    invoiceId: string;
    success: boolean;
    message?: string;
    error?: string;
  }>;
  startedAt: Date;
  completedAt: Date;
  duration: number; // milliseconds
}

export interface BulkExportResult extends BulkOperationResult {
  operationType: "EXPORT";
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  expiresAt: Date;
}

export interface BulkOperationPreview {
  eligibleCount: number;
  ineligibleCount: number;
  eligibleInvoices: Array<{
    id: string;
    invoiceNumber: string;
    supplierName: string;
    amount: number;
    status: string;
  }>;
  ineligibleReasons: Array<{
    invoiceId: string;
    invoiceNumber: string;
    reason: string;
  }>;
  warnings: string[];
}

export interface BulkOperationProgress {
  operationId: string;
  status: "QUEUED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
  progress: number; // 0-100
  processed: number;
  total: number;
  currentItem?: string;
  estimatedTimeRemaining?: number; // seconds
  error?: string;
}
