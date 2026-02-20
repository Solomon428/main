import { RiskLevel } from "../enums/RiskLevel";

export interface RiskScore {
  id: string;
  invoiceId?: string | null;
  supplierId?: string | null;
  organizationId: string;
  assessedBy?: string | null;
  score: unknown; // Decimal
  level: RiskLevel;
  previousScore?: unknown | null; // Decimal
  changeReason?: string | null;
  factors: unknown; // Json - Array of risk factors
  indicators?: Record<string, unknown> | null;
  recommendations: string[];
  mitigations?: Record<string, unknown> | null;
  assessedAt: Date;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  isAcknowledged: boolean;
  acknowledgedAt?: Date | null;
  acknowledgedBy?: string | null;
  modelVersion?: string | null;
  calculationMethod?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}
