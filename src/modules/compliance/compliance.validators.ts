import { z } from "zod";
import { ComplianceStatus } from "../../domain/enums/ComplianceStatus";
import { ComplianceCheckType } from "../../domain/enums/ComplianceCheckType";

export const runComplianceCheckSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  checkType: z.nativeEnum(ComplianceCheckType),
  data: z.record(z.unknown()).optional(),
});

export const complianceResultSchema = z.object({
  passed: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  passedChecks: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  details: z.record(z.unknown()).optional(),
});

export const overrideComplianceSchema = z.object({
  checkId: z.string().uuid(),
  userId: z.string().uuid(),
  notes: z.string().min(1, "Override reason is required"),
});

export const complianceRemediationSchema = z.object({
  checkId: z.string().uuid(),
  remediatedBy: z.string().uuid(),
  remediationNotes: z.string().min(1, "Remediation notes are required"),
  evidence: z.array(z.string()).optional(),
});

export const listComplianceChecksQuerySchema = z.object({
  organizationId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  checkType: z.nativeEnum(ComplianceCheckType).optional(),
  status: z.nativeEnum(ComplianceStatus).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const complianceRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  checkType: z.nativeEnum(ComplianceCheckType),
  enabled: z.boolean().default(true),
  severity: z.enum(["ERROR", "WARNING", "INFO"]).default("ERROR"),
  conditions: z.record(z.unknown()),
  message: z.string(),
});

export const bulkComplianceCheckSchema = z.object({
  entityIds: z.array(z.string().uuid()).min(1),
  entityType: z.enum(["INVOICE", "SUPPLIER"]),
  checkTypes: z.array(z.nativeEnum(ComplianceCheckType)).optional(),
});

export const complianceReportSchema = z.object({
  organizationId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  checkTypes: z.array(z.nativeEnum(ComplianceCheckType)).optional(),
});

export type RunComplianceCheckInput = z.infer<typeof runComplianceCheckSchema>;
export type ComplianceResultInput = z.infer<typeof complianceResultSchema>;
export type OverrideComplianceInput = z.infer<typeof overrideComplianceSchema>;
export type ComplianceRemediationInput = z.infer<
  typeof complianceRemediationSchema
>;
export type ListComplianceChecksQuery = z.infer<
  typeof listComplianceChecksQuerySchema
>;
export type ComplianceRuleInput = z.infer<typeof complianceRuleSchema>;
export type BulkComplianceCheckInput = z.infer<
  typeof bulkComplianceCheckSchema
>;
export type ComplianceReportInput = z.infer<typeof complianceReportSchema>;
