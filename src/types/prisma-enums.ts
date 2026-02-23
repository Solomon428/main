// Lightweight bridge to reduce TypeScript enum conflicts between domain enums and Prisma enums.
// This uses permissive string aliases to allow existing code paths to compile while you migrate
// domain enums to rely on Prisma's generated enums via @prisma/client.

export type UserRole = string;
export type Department = string;
export type ComplianceCheckType = string;
export type InvoiceStatus = string;
export type PaymentStatus = string;
export type ApprovalStatus = string;
export type PaymentMethod = string;
export type RiskLevel = string;
export type SLAStatus = string;
export type BankAccountType = string;
export type ReconciliationStatus = string;
export type TransactionType = string;
export type ReconciliationItemStatus = string;
export type NotificationType = string;
export type NotificationPriority = string;
export type NotificationChannel = string;
export type NotificationStatus = string;
export type ScheduledTaskType = string;
export type ScheduledTaskStatus = string;
export type StorageProvider = string;
export type IntegrationType = string;
export type IntegrationStatus = string;
export type SyncStatus = string;
export type WebhookStatus = string;
export type SupplierCategory = string;
export type SupplierStatus = string;
export type EntityType = string;
export type AuditAction = string;
export type Currency = string;
export type DocumentType = string;
export type TaxType = string;
export type MatchingStatus = string;
export type ApprovalChainType = string;
export type FraudScoreLevel = string;
