/**
 * Domain enum barrel — re-exports all enums from @prisma/client.
 * Centralised here to maintain import compatibility throughout the codebase.
 */
export {
  ApprovalChainType,
  ApprovalDecision,
  ApprovalStatus,
  AuditAction,
  BankAccountType,
  Currency,
  EntityType,
  InvoiceStatus,
  LogSeverity,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  RiskLevel,
  StorageProvider,
  SupplierCategory,
  SupplierStatus,
  SyncStatus,
  TransactionType,
  UserRole,
} from "@prisma/client";
