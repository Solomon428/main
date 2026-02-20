import { ApprovalChainType } from "../enums/ApprovalChainType";
import { Currency } from "../enums/Currency";

export interface ApprovalChain {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  type: ApprovalChainType;
  department?: string | null;
  category?: string | null;
  minAmount?: unknown | null; // Decimal
  maxAmount?: unknown | null; // Decimal
  currency: Currency;
  levels: unknown; // Json - Array of approval levels
  approverRoles: string[];
  specificApprovers: string[];
  alternateApprovers: string[];
  autoEscalation: boolean;
  escalationHours: number;
  reminderHours: number;
  allowDelegation: boolean;
  requireAllApprovers: boolean;
  conditions?: Record<string, unknown> | null;
  rules?: Record<string, unknown> | null;
  isActive: boolean;
  priority: number;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
