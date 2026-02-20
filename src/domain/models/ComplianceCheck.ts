import { ComplianceCheckType } from "../enums/ComplianceCheckType";
import { ComplianceStatus } from "../enums/ComplianceStatus";

export interface ComplianceCheck {
  id: string;
  invoiceId?: string | null;
  supplierId?: string | null;
  organizationId: string;
  validatorId?: string | null;
  checkType: ComplianceCheckType;
  status: ComplianceStatus;
  severity?: string | null;
  details?: Record<string, unknown> | null;
  errors: string[];
  warnings: string[];
  passedChecks: string[];
  recommendations: string[];
  validatedAt?: Date | null;
  validatorNotes?: string | null;
  evidence: string[];
  remediatedAt?: Date | null;
  remediatedBy?: string | null;
  remediationNotes?: string | null;
  rulesVersion?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}
