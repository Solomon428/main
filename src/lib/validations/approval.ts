import { z } from "zod";

export const submitForApprovalSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID"),
  notes: z.string().optional(),
});

export const processApprovalSchema = z.object({
  approvalId: z.string().uuid("Invalid approval ID"),
  decision: z.enum(["APPROVE", "REJECT", "ESCALATE"]),
  notes: z.string().optional(),
});

export const approvalFiltersSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "ESCALATED", "AUTO_APPROVED"]).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type SubmitForApprovalInput = z.infer<typeof submitForApprovalSchema>;
export type ProcessApprovalInput = z.infer<typeof processApprovalSchema>;
export type ApprovalFilters = z.infer<typeof approvalFiltersSchema>;
