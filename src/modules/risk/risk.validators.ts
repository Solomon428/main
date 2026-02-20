import { z } from "zod";
import { RiskLevel } from "../../domain/enums/RiskLevel";

const decimalSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === "string" ? parseFloat(val) : val));

export const riskFactorSchema = z.object({
  name: z.string(),
  weight: decimalSchema,
  score: decimalSchema,
  description: z.string().optional(),
});

export const calculateRiskScoreSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  amount: decimalSchema,
  supplierRisk: z.nativeEnum(RiskLevel).optional(),
  isNewSupplier: z.boolean().default(false),
  factors: z.array(riskFactorSchema).default([]),
});

export const updateRiskScoreSchema = z.object({
  score: decimalSchema.optional(),
  level: z.nativeEnum(RiskLevel).optional(),
  factors: z.array(riskFactorSchema).optional(),
  indicators: z.record(z.unknown()).optional(),
  recommendations: z.array(z.string()).optional(),
  mitigations: z.record(z.unknown()).optional(),
});

export const acknowledgeRiskSchema = z.object({
  acknowledgedBy: z.string().uuid(),
  notes: z.string().optional(),
});

export const riskAssessmentSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(["INVOICE", "SUPPLIER"]),
  assessmentData: z.record(z.unknown()),
});

export const listRiskScoresQuerySchema = z.object({
  organizationId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  level: z.nativeEnum(RiskLevel).optional(),
  minScore: decimalSchema.optional(),
  maxScore: decimalSchema.optional(),
  isAcknowledged: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const riskAlertSchema = z.object({
  threshold: decimalSchema.default(70),
  level: z.nativeEnum(RiskLevel).optional(),
});

export const bulkRiskAssessmentSchema = z.object({
  entityIds: z.array(z.string().uuid()).min(1),
  entityType: z.enum(["INVOICE", "SUPPLIER"]),
});

export type CalculateRiskScoreInput = z.infer<typeof calculateRiskScoreSchema>;
export type UpdateRiskScoreInput = z.infer<typeof updateRiskScoreSchema>;
export type AcknowledgeRiskInput = z.infer<typeof acknowledgeRiskSchema>;
export type RiskAssessmentInput = z.infer<typeof riskAssessmentSchema>;
export type ListRiskScoresQuery = z.infer<typeof listRiskScoresQuerySchema>;
export type RiskAlertInput = z.infer<typeof riskAlertSchema>;
export type BulkRiskAssessmentInput = z.infer<typeof bulkRiskAssessmentSchema>;
export type RiskFactorInput = z.infer<typeof riskFactorSchema>;
