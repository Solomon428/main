import { z } from "zod";
import { ApprovalStatus } from "../../domain/enums/ApprovalStatus";
import { ApprovalDecision } from "../../domain/enums/ApprovalDecision";
import { ApprovalChainType } from "../../domain/enums/ApprovalChainType";
import { Currency } from "../../domain/enums/Currency";

const decimalSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === "string" ? parseFloat(val) : val));

export const approvalDecisionSchema = z.object({
  decision: z.nativeEnum(ApprovalDecision),
  notes: z.string().optional(),
});

export const approvalLevelSchema = z.object({
  level: z.number().int().min(1),
  name: z.string(),
  approverIds: z.array(z.string().uuid()).optional(),
  approverRoles: z.array(z.string()).optional(),
  minAmount: decimalSchema.optional(),
  maxAmount: decimalSchema.optional(),
  requireAll: z.boolean().default(false),
  autoEscalationHours: z.number().int().optional(),
});

export const createApprovalChainSchema = z.object({
  name: z.string().min(1, "Approval chain name is required"),
  description: z.string().optional(),
  type: z.nativeEnum(ApprovalChainType).default(ApprovalChainType.SEQUENTIAL),
  department: z.string().optional(),
  category: z.string().optional(),
  minAmount: decimalSchema.default(0),
  maxAmount: decimalSchema.optional(),
  currency: z.nativeEnum(Currency).default(Currency.ZAR),
  levels: z
    .array(approvalLevelSchema)
    .min(1, "At least one approval level is required"),
  approverRoles: z.array(z.string()).default([]),
  specificApprovers: z.array(z.string().uuid()).default([]),
  alternateApprovers: z.array(z.string().uuid()).default([]),
  autoEscalation: z.boolean().default(true),
  escalationHours: z.number().int().default(24),
  reminderHours: z.number().int().default(12),
  allowDelegation: z.boolean().default(true),
  requireAllApprovers: z.boolean().default(false),
  conditions: z.record(z.unknown()).optional(),
  rules: z.record(z.unknown()).optional(),
  priority: z.number().int().default(0),
});

export const updateApprovalChainSchema = createApprovalChainSchema.partial();

export const delegationSchema = z.object({
  delegateeId: z.string().uuid("Valid delegatee ID is required"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
  scope: z.string().default("ALL"),
  specificCategories: z.array(z.string()).default([]),
});

export const cancelDelegationSchema = z.object({
  cancelReason: z.string().optional(),
});

export const escalateApprovalSchema = z.object({
  reason: z.string().min(1, "Escalation reason is required"),
  escalateToId: z.string().uuid().optional(),
});

export const createApprovalRequestSchema = z.object({
  invoiceId: z.string().uuid("Valid invoice ID is required"),
  approverId: z.string().uuid("Valid approver ID is required"),
  approvalChainId: z.string().uuid().optional(),
  level: z.number().int().min(1).default(1),
  sequence: z.number().int().default(1),
  slaDueDate: z.coerce.date(),
});

export const bulkApprovalActionSchema = z.object({
  approvalIds: z.array(z.string().uuid()).min(1),
  decision: z.nativeEnum(ApprovalDecision),
  notes: z.string().optional(),
});

export const listApprovalsQuerySchema = z.object({
  status: z.nativeEnum(ApprovalStatus).optional(),
  approverId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  isDelegated: z.boolean().optional(),
  isEscalated: z.boolean().optional(),
  slaBreached: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const listApprovalChainsQuerySchema = z.object({
  department: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>;
export type CreateApprovalChainInput = z.infer<
  typeof createApprovalChainSchema
>;
export type UpdateApprovalChainInput = z.infer<
  typeof updateApprovalChainSchema
>;
export type DelegationInput = z.infer<typeof delegationSchema>;
export type CancelDelegationInput = z.infer<typeof cancelDelegationSchema>;
export type EscalateApprovalInput = z.infer<typeof escalateApprovalSchema>;
export type CreateApprovalRequestInput = z.infer<
  typeof createApprovalRequestSchema
>;
export type BulkApprovalActionInput = z.infer<typeof bulkApprovalActionSchema>;
export type ListApprovalsQuery = z.infer<typeof listApprovalsQuerySchema>;
export type ListApprovalChainsQuery = z.infer<
  typeof listApprovalChainsQuerySchema
>;
