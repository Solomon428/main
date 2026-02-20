import { z } from "zod";
import { PaymentStatus } from "../../domain/enums/PaymentStatus";
import { PaymentMethod } from "../../domain/enums/PaymentMethod";
import { Currency } from "../../domain/enums/Currency";
import { BankAccountType } from "../../domain/enums/BankAccountType";

const decimalSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === "string" ? parseFloat(val) : val));

export const createPaymentSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
  paymentNumber: z.string().optional(),
  paymentDate: z.coerce.date(),
  amount: decimalSchema.refine(
    (val) => val > 0,
    "Amount must be greater than 0",
  ),
  currency: z.nativeEnum(Currency).default(Currency.ZAR),
  exchangeRate: decimalSchema.optional(),
  paymentMethod: z
    .nativeEnum(PaymentMethod)
    .default(PaymentMethod.BANK_TRANSFER),
  bankReference: z.string().optional(),
  checkNumber: z.string().optional(),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  externalId: z.string().optional(),
  source: z.string().default("MANUAL"),
});

export const updatePaymentSchema = z.object({
  paymentDate: z.coerce.date().optional(),
  amount: decimalSchema.optional(),
  currency: z.nativeEnum(Currency).optional(),
  exchangeRate: decimalSchema.optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  bankReference: z.string().optional(),
  checkNumber: z.string().optional(),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const createPaymentBatchSchema = z.object({
  description: z.string().optional(),
  paymentDate: z.coerce.date(),
  scheduledFor: z.coerce.date().optional(),
  bankAccountId: z.string().uuid().optional(),
  isRecurring: z.boolean().default(false),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updatePaymentBatchSchema = z.object({
  description: z.string().optional(),
  paymentDate: z.coerce.date().optional(),
  scheduledFor: z.coerce.date().optional(),
  bankAccountId: z.string().uuid().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const addPaymentToBatchSchema = z.object({
  paymentIds: z
    .array(z.string().uuid())
    .min(1, "At least one payment is required"),
});

export const removePaymentFromBatchSchema = z.object({
  paymentIds: z.array(z.string().uuid()).min(1),
});

export const processPaymentBatchSchema = z.object({
  batchId: z.string().uuid(),
  processImmediately: z.boolean().default(false),
});

export const releasePaymentBatchSchema = z.object({
  notes: z.string().optional(),
});

export const cancelPaymentSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required"),
});

export const reconcilePaymentSchema = z.object({
  reconciliationId: z.string().uuid(),
  reconciledAt: z.coerce.date().optional(),
});

export const createBankAccountSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  bankName: z.string().min(1, "Bank name is required"),
  bankCode: z.string().optional(),
  branchName: z.string().optional(),
  branchCode: z.string().optional(),
  swiftCode: z.string().optional(),
  iban: z.string().optional(),
  currency: z.nativeEnum(Currency).default(Currency.ZAR),
  accountType: z.nativeEnum(BankAccountType).default(BankAccountType.CURRENT),
  isPrimary: z.boolean().default(false),
  openingBalance: decimalSchema.default(0),
  metadata: z.record(z.unknown()).optional(),
});

export const updateBankAccountSchema = createBankAccountSchema.partial();

export const bulkPaymentActionSchema = z.object({
  paymentIds: z.array(z.string().uuid()).min(1),
  action: z.enum(["PROCESS", "CANCEL", "RECONCILE"]),
  notes: z.string().optional(),
});

export const listPaymentsQuerySchema = z.object({
  status: z.nativeEnum(PaymentStatus).optional(),
  supplierId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
  paymentBatchId: z.string().uuid().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isReconciled: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const listPaymentBatchesQuerySchema = z.object({
  status: z.nativeEnum(PaymentStatus).optional(),
  isRecurring: z.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type CreatePaymentBatchInput = z.infer<typeof createPaymentBatchSchema>;
export type UpdatePaymentBatchInput = z.infer<typeof updatePaymentBatchSchema>;
export type AddPaymentToBatchInput = z.infer<typeof addPaymentToBatchSchema>;
export type RemovePaymentFromBatchInput = z.infer<
  typeof removePaymentFromBatchSchema
>;
export type ProcessPaymentBatchInput = z.infer<
  typeof processPaymentBatchSchema
>;
export type ReleasePaymentBatchInput = z.infer<
  typeof releasePaymentBatchSchema
>;
export type CancelPaymentInput = z.infer<typeof cancelPaymentSchema>;
export type ReconcilePaymentInput = z.infer<typeof reconcilePaymentSchema>;
export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
export type BulkPaymentActionInput = z.infer<typeof bulkPaymentActionSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
export type ListPaymentBatchesQuery = z.infer<
  typeof listPaymentBatchesQuerySchema
>;
