/**
 * SQLite-compatible type definitions
 * For use when Prisma client types are not available (client-side)
 */

// Notification Types - Comprehensive list for all notification scenarios
export type NotificationType =
  | "INVOICE_SUBMITTED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_DECISION"
  | "APPROVAL_ESCALATED"
  | "APPROVAL_DELEGATED"
  | "PAYMENT_SCHEDULED"
  | "PAYMENT_PROCESSED"
  | "PAYMENT_FAILED"
  | "SLA_BREACH"
  | "SLA_WARNING"
  | "RISK_ALERT"
  | "COMPLIANCE_ALERT"
  | "COMPLIANCE_FAILURE"
  | "SYSTEM_ALERT"
  | "USER_INVITATION"
  | "PASSWORD_RESET"
  | "TWO_FACTOR_ENABLED"
  | "ACCOUNT_LOCKED"
  | "SUPPLIER_VERIFIED"
  | "SUPPLIER_BLACKLISTED"
  | "INVOICE_DUPLICATE_DETECTED"
  | "INVOICE_ANOMALY_DETECTED"
  // Additional types from notification-utils
  | "APPROVAL_REQUIRED"
  | "INVOICE_APPROVED"
  | "INVOICE_REJECTED"
  | "ESCALATION_TRIGGERED"
  | "FRAUD_ALERT"
  | "PAYMENT_DUE_SOON"
  | "PAYMENT_OVERDUE"
  | "MONTHLY_REPORT"
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "TASK"
  | "SYSTEM"
  | "INVOICE_ASSIGNED"
  | "APPROVAL_COMPLETED"
  | "INVOICE_ESCALATED"
  | "DUPLICATE_FOUND"
  | "DELEGATION_REQUEST"
  | "COMPLIANCE_WARNING"
  | "WORKLOAD_THRESHOLD";

// Priority Levels
export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// Delivery Methods
export type DeliveryMethod =
  | "IN_APP"
  | "EMAIL"
  | "SMS"
  | "SLACK"
  | "TEAMS"
  | "WEBHOOK"
  | "PUSH";

// Invoice Status
export type InvoiceStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PROCESSING"
  | "VALIDATED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "PAID"
  | "PARTIALLY_PAID"
  | "CANCELLED"
  | "DISPUTED"
  | "ARCHIVED"
  | "PENDING_EXTRACTION"
  | "UNDER_REVIEW";

// Approval Status
export type ApprovalStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "APPROVED"
  | "REJECTED"
  | "ESCALATED"
  | "DELEGATED"
  | "CANCELLED"
  | "AWAITING_DOCUMENTATION";

// Approval Decision
export type ApprovalDecision =
  | "APPROVED"
  | "REJECTED"
  | "REQUESTED_CHANGES"
  | "DELEGATED"
  | "ESCALATED"
  | "SKIPPED";

// Payment Status
export type PaymentStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "FAILED"
  | "PENDING"
  | "SCHEDULED"
  | "PROCESSING";

// User Role
export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "FINANCE_MANAGER"
  | "APPROVER"
  | "PROCUREMENT"
  | "VIEWER"
  | "AUDITOR"
  | "CREDIT_CLERK"
  | "BRANCH_MANAGER"
  | "FINANCIAL_MANAGER"
  | "EXECUTIVE"
  | "GROUP_FINANCIAL_MANAGER";

// Entity Type
export type EntityType =
  | "INVOICE"
  | "SUPPLIER"
  | "USER"
  | "ORGANIZATION"
  | "PAYMENT"
  | "APPROVAL"
  | "COMPLIANCE_CHECK"
  | "AUDIT_LOG"
  | "FILE_ATTACHMENT"
  | "INTEGRATION";

// Log Severity
export type LogSeverity =
  | "INFO"
  | "WARNING"
  | "ERROR"
  | "CRITICAL"
  | "DEBUG"
  | "AUDIT"
  | "SECURITY"
  | "COMPLIANCE";

// Audit Action
export type AuditAction =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "IMPORT"
  | "APPROVE"
  | "REJECT"
  | "DELEGATE"
  | "ESCALATE"
  | "PAY"
  | "CANCEL"
  | "RESTORE"
  | "ARCHIVE"
  | "DOWNLOAD"
  | "SHARE"
  | "CONFIG_CHANGE";

// Compliance Status
export type ComplianceStatus =
  | "PENDING"
  | "VALID"
  | "INVALID"
  | "SUSPENDED"
  | "EXPIRED"
  | "FLAGGED"
  | "UNDER_REVIEW"
  | "COMPLIANT"
  | "NON_COMPLIANT";

// Supplier Status
export type SupplierStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "BLACKLISTED"
  | "UNDER_REVIEW"
  | "REJECTED";

// Department
export type Department =
  | "IT"
  | "FINANCE"
  | "OPERATIONS"
  | "AUDIT"
  | "PROCUREMENT"
  | "SALES"
  | "LEGAL"
  | "HR"
  | "ADMINISTRATION";

// Duplicate Type
export type DuplicateType =
  | "EXACT"
  | "FUZZY"
  | "TEMPORAL"
  | "SUPPLIER_CLUSTER"
  | "LINE_ITEM"
  | "CROSS_SUPPLIER"
  | "PO_REFERENCE"
  | "PARTIAL";

// Risk Level
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";

// Currency
export type Currency =
  | "ZAR"
  | "USD"
  | "EUR"
  | "GBP"
  | "AUD"
  | "CAD"
  | "JPY"
  | "CNY"
  | "INR";

// Notification Priority
export type NotificationPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL"
  | "EMERGENCY";

// Notification Channel
export type NotificationChannel =
  | "IN_APP"
  | "EMAIL"
  | "SMS"
  | "SLACK"
  | "TEAMS"
  | "WEBHOOK"
  | "PUSH";

// Notification Status
export type NotificationStatus =
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "UNREAD"
  | "DISMISSED"
  | "ARCHIVED";

// Payment Method
export type PaymentMethod =
  | "BANK_TRANSFER"
  | "CHECK"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "DIGITAL_WALLET"
  | "CASH"
  | "EFT"
  | "WIRE_TRANSFER"
  | "CREDIT_NOTE";

// Scheduled Task Status
export type ScheduledTaskStatus =
  | "SUCCESS"
  | "FAILED"
  | "RUNNING"
  | "CANCELLED"
  | "SCHEDULED"
  | "SKIPPED"
  | "RETRYING";

// Scheduled Task Type
export type ScheduledTaskType =
  | "INVOICE_PROCESSING"
  | "APPROVAL_ESCALATION"
  | "APPROVAL_REMINDER"
  | "PAYMENT_PROCESSING"
  | "PAYMENT_RECONCILIATION"
  | "RECONCILIATION"
  | "RISK_ASSESSMENT"
  | "COMPLIANCE_CHECK"
  | "REPORT_GENERATION"
  | "DATA_CLEANUP"
  | "BACKUP"
  | "NOTIFICATION_DIGEST"
  | "AUDIT_LOG_ARCHIVE"
  | "SUPPLIER_RATING_UPDATE";

// Reconciliation Status
export type ReconciliationStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "RECONCILED"
  | "REVIEWED"
  | "DISPUTED"
  | "UNRECONCILED";

// Transaction Type
export type TransactionType =
  | "DEBIT"
  | "CREDIT"
  | "ADJUSTMENT"
  | "FEE"
  | "INTEREST";

// Integration Type
export type IntegrationType =
  | "ACCOUNTING_SOFTWARE"
  | "BANK_FEED"
  | "ERP_SYSTEM"
  | "CRM_SYSTEM"
  | "OCR_SERVICE"
  | "TAX_SERVICE"
  | "PAYMENT_GATEWAY"
  | "DOCUMENT_MANAGEMENT"
  | "COMMUNICATION"
  | "EDI"
  | "API"
  | "WEBHOOK";

// Integration Status
export type IntegrationStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "ERROR"
  | "PENDING"
  | "SYNCING"
  | "PAUSED"
  | "MAINTENANCE";

// Sync Status
export type SyncStatus =
  | "SUCCESS"
  | "FAILED"
  | "PARTIAL"
  | "PENDING"
  | "IN_PROGRESS"
  | "CANCELLED";

// Webhook Status
export type WebhookStatus =
  | "SUCCESS"
  | "FAILED"
  | "PENDING"
  | "RETRYING"
  | "TIMEOUT"
  | "INVALID_SIGNATURE";

// Storage Provider
export type StorageProvider =
  | "S3"
  | "AZURE_BLOB"
  | "GOOGLE_CLOUD"
  | "LOCAL"
  | "MINIO"
  | "WASABI";

// Document Type
export type DocumentType =
  | "INVOICE_PDF"
  | "PROOF_OF_PAYMENT"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE"
  | "STATEMENT"
  | "CONTRACT"
  | "PURCHASE_ORDER"
  | "DELIVERY_NOTE"
  | "RECEIPT"
  | "COMPLIANCE_CERTIFICATE"
  | "TAX_CERTIFICATE"
  | "OTHER";

// Tax Type
export type TaxType =
  | "VAT"
  | "GST"
  | "SALES_TAX"
  | "INCOME_TAX"
  | "WITHHOLDING_TAX"
  | "CUSTOMS_DUTY"
  | "EXCISE_TAX"
  | "NONE";

// Matching Status
export type MatchingStatus =
  | "UNMATCHED"
  | "MATCHED"
  | "PARTIAL_MATCH"
  | "DISPUTED"
  | "WRITTEN_OFF";

// Approval Chain Type
export type ApprovalChainType =
  | "SEQUENTIAL"
  | "PARALLEL"
  | "CONDITIONAL"
  | "HIERARCHICAL"
  | "ADAPTIVE";

// Compliance Check Type
export type ComplianceCheckType =
  | "VAT_VALIDATION"
  | "TAX_ID_VALIDATION"
  | "SANCTIONS_SCREENING"
  | "PEP_SCREENING"
  | "AML_CHECK"
  | "KYC_VERIFICATION"
  | "REGULATORY_COMPLIANCE"
  | "DATA_PROTECTION"
  | "DUPLICATE_CHECK"
  | "FRAUD_DETECTION";

// Supplier Category
export type SupplierCategory =
  | "GOODS"
  | "SERVICES"
  | "BOTH"
  | "CONSULTING"
  | "UTILITIES"
  | "RENT"
  | "INSURANCE"
  | "LOGISTICS"
  | "TECHNOLOGY"
  | "MARKETING"
  | "LEGAL"
  | "FINANCIAL";

// Bank Account Type
export type BankAccountType =
  | "CURRENT"
  | "SAVINGS"
  | "CREDIT"
  | "PAYROLL"
  | "TRUST"
  | "ESCROW";

// SLA Status
export type SLAStatus =
  | "ON_TRACK"
  | "AT_RISK"
  | "BREACHED"
  | "COMPLETED"
  | "PAUSED";

// Reconciliation Item Status
export type ReconciliationItemStatus =
  | "UNMATCHED"
  | "MATCHED"
  | "DISPUTED"
  | "ADJUSTED"
  | "EXCLUDED";

// SA Compliance Rules Export
export const SA_COMPLIANCE_RULES = {
  DUPLICATE_DETECTION_THRESHOLD: 0.95,
  TEMPORAL_WINDOW_DAYS: 30,
  AMOUNT_TOLERANCE: 0.01,
  INVOICE_NUMBER_FUZZY_THRESHOLD: 0.85,
  SUPPLIER_NAME_FUZZY_THRESHOLD: 0.8,
  REQUIRED_DUPLICATE_FIELDS: [
    "invoiceNumber",
    "supplierName",
    "totalAmount",
    "invoiceDate",
  ],
  SARS_DUPLICATE_REPORTING_REQUIRED: true,
  FALSE_POSITIVE_REDUCTION_ENABLED: true,
  CONTEXTUAL_ANALYSIS_REQUIRED: true,
};
