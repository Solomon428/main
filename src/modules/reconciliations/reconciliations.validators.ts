import { z } from "zod";
import { ReconciliationStatus } from "../../domain/enums/ReconciliationStatus";
import { ReconciliationItemStatus } from "../../domain/enums/ReconciliationItemStatus";
import { TransactionType } from "../../domain/enums/TransactionType";
import { Currency } from "../../domain/enums/Currency";

const decimalSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === "string" ? parseFloat(val) : val));

export const createReconciliationSchema = z.object({
  bankAccountId: z.string().uuid("Valid bank account ID is required"),
  statementNumber: z.string().optional(),
  statementDate: z.coerce.date(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  openingBalance: decimalSchema,
  closingBalance: decimalSchema,
  statementBalance: decimalSchema,
  notes: z.string().optional(),
});

export const updateReconciliationSchema = z.object({
  statementNumber: z.string().optional(),
  statementDate: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  openingBalance: decimalSchema.optional(),
  closingBalance: decimalSchema.optional(),
  statementBalance: decimalSchema.optional(),
  notes: z.string().optional(),
});

export const reconcileItemSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1, "At least one item is required"),
});

export const approveReconciliationSchema = z.object({
  reviewedBy: z.string().uuid().optional(),
  approvedBy: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const createReconciliationItemSchema = z.object({
  transactionDate: z.coerce.date(),
  description: z.string().min(1, "Description is required"),
  reference: z.string().optional(),
  amount: decimalSchema,
  currency: z.nativeEnum(Currency).default(Currency.ZAR),
  transactionType: z.nativeEnum(TransactionType),
});

export const matchReconciliationItemSchema = z.object({
  paymentId: z.string().uuid("Valid payment ID is required"),
  matchedAmount: decimalSchema.optional(),
  matchingMethod: z.string().optional(),
});

export const updateReconciliationItemSchema = z.object({
  description: z.string().optional(),
  reference: z.string().optional(),
  amount: decimalSchema.optional(),
  notes: z.string().optional(),
});

export const adjustmentSchema = z.object({
  reason: z.string().min(1, "Adjustment reason is required"),
  notes: z.string().optional(),
});

export const importStatementSchema = z.object({
  fileContent: z.string().min(1, "File content is required"),
  format: z.enum(["CSV", "OFX", "QIF", "MT940"]),
});

export const listReconciliationsQuerySchema = z.object({
  bankAccountId: z.string().uuid().optional(),
  status: z.nativeEnum(ReconciliationStatus).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const listReconciliationItemsQuerySchema = z.object({
  status: z.nativeEnum(ReconciliationItemStatus).optional(),
  transactionType: z.nativeEnum(TransactionType).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

export const autoMatchSchema = z.object({
  threshold: z.number().min(0).max(1).default(0.8),
});

export type CreateReconciliationInput = z.infer<
  typeof createReconciliationSchema
>;
export type UpdateReconciliationInput = z.infer<
  typeof updateReconciliationSchema
>;
export type ReconcileItemInput = z.infer<typeof reconcileItemSchema>;
export type ApproveReconciliationInput = z.infer<
  typeof approveReconciliationSchema
>;
export type CreateReconciliationItemInput = z.infer<
  typeof createReconciliationItemSchema
>;
export type MatchReconciliationItemInput = z.infer<
  typeof matchReconciliationItemSchema
>;
export type UpdateReconciliationItemInput = z.infer<
  typeof updateReconciliationItemSchema
>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type ImportStatementInput = z.infer<typeof importStatementSchema>;
export type ListReconciliationsQuery = z.infer<
  typeof listReconciliationsQuerySchema
>;
export type ListReconciliationItemsQuery = z.infer<
  typeof listReconciliationItemsQuerySchema
>;
export type AutoMatchInput = z.infer<typeof autoMatchSchema>;
