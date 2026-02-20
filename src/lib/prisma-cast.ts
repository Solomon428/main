/**
 * prisma-cast.ts
 *
 * Type-safe casting utilities: domain enums -> Prisma-generated enums.
 *
 * WHY THIS EXISTS:
 * Prisma generates its own enum types in node_modules/.prisma/client.
 * The domain layer maintains parallel enum definitions in src/domain/enums/.
 * TypeScript's nominal type system treats them as incompatible even though
 * the string values are identical. These utilities bridge that gap at Prisma
 * call sites without modifying domain logic.
 *
 * PLACEMENT: src/lib/prisma-cast.ts
 *
 * USAGE:
 * Instead of:   currency: data.currency
 * Use:          currency: toPrismaCurrency(data.currency)
 *
 * Only apply at Prisma call sites (create/update/where clauses).
 * Do NOT use inside pure domain logic or service layer business rules.
 *
 * JSON FIELDS — separate pattern:
 * Instead of:   metadata: data.metadata || {}
 * Use:          metadata: (data.metadata || {}) as Prisma.InputJsonValue
 */

import type {
  Currency as PrismaCurrency,
  InvoiceStatus as PrismaInvoiceStatus,
  SupplierStatus as PrismaSupplierStatus,
  ApprovalStatus as PrismaApprovalStatus,
  NotificationType as PrismaNotificationType,
  NotificationChannel as PrismaNotificationChannel,
  NotificationPriority as PrismaNotificationPriority,
  EntityType as PrismaEntityType,
  AuditAction as PrismaAuditAction,
  LogSeverity as PrismaLogSeverity,
  StorageProvider as PrismaStorageProvider,
  SyncStatus as PrismaSyncStatus,
  TransactionType as PrismaTransactionType,
  BankAccountType as PrismaBankAccountType,
  SupplierCategory as PrismaSupplierCategory,
  ApprovalChainType as PrismaApprovalChainType,
  ApprovalDecision as PrismaApprovalDecision,
  RiskLevel as PrismaRiskLevel,
  UserRole as PrismaUserRole,
} from "@prisma/client";

export const toPrismaCurrency = (v: string): PrismaCurrency =>
  v as PrismaCurrency;

export const toPrismaInvoiceStatus = (v: string): PrismaInvoiceStatus =>
  v as PrismaInvoiceStatus;

export const toPrismaSupplierStatus = (v: string): PrismaSupplierStatus =>
  v as PrismaSupplierStatus;

export const toPrismaApprovalStatus = (v: string): PrismaApprovalStatus =>
  v as PrismaApprovalStatus;

export const toPrismaNotificationType = (v: string): PrismaNotificationType =>
  v as PrismaNotificationType;

export const toPrismaNotificationChannel = (
  v: string,
): PrismaNotificationChannel => v as PrismaNotificationChannel;

export const toPrismaNotificationPriority = (
  v: string,
): PrismaNotificationPriority => v as PrismaNotificationPriority;

export const toPrismaEntityType = (v: string): PrismaEntityType =>
  v as PrismaEntityType;

export const toPrismaAuditAction = (v: string): PrismaAuditAction =>
  v as PrismaAuditAction;

export const toPrismaLogSeverity = (v: string): PrismaLogSeverity =>
  v as PrismaLogSeverity;

export const toPrismaStorageProvider = (v: string): PrismaStorageProvider =>
  v as PrismaStorageProvider;

export const toPrismaSyncStatus = (v: string): PrismaSyncStatus =>
  v as PrismaSyncStatus;

export const toPrismaTransactionType = (v: string): PrismaTransactionType =>
  v as PrismaTransactionType;

export const toPrismaBankAccountType = (v: string): PrismaBankAccountType =>
  v as PrismaBankAccountType;

export const toPrismaSupplierCategory = (v: string): PrismaSupplierCategory =>
  v as PrismaSupplierCategory;

export const toPrismaApprovalChainType = (v: string): PrismaApprovalChainType =>
  v as PrismaApprovalChainType;

export const toPrismaApprovalDecision = (v: string): PrismaApprovalDecision =>
  v as PrismaApprovalDecision;

export const toPrismaRiskLevel = (v: string): PrismaRiskLevel =>
  v as PrismaRiskLevel;

export const toPrismaUserRole = (v: string): PrismaUserRole =>
  v as PrismaUserRole;
