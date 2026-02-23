import { DateTime } from 'luxon';
import { ApprovalStatus } from '@prisma/client';

export type Approver = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  approvalLimit: number;
  currentWorkload: number;
  maxCapacity: number;
  isAvailable: boolean;
  unavailableUntil?: Date;
  backupApproverId?: string;
  skills?: string[];
  specializations?: string[];
};

export type ApprovalStage = {
  sequence: number;
  stage?: number;
  approverId: string;
  approverRole?: string;
  role?: string;
  limit?: number;
  isBackup?: boolean;
  deadline?: Date;
  slaHours?: number;
  status?: ApprovalStatus;
  assignedAt?: Date;
  completedAt?: Date;
};

export type ApprovalStageType = "INITIAL" | "INTERMEDIATE" | "FINAL" | "ESCALATION" | "DELEGATION";

export type ApprovalRoutingInput = {
  invoiceId: string;
  organizationId: string;
  amount: number;
  currency: string;
  supplierId?: string;
  requestedBy: string;
  totalAmount?: number;
  supplierName?: string;
  department?: string;
  requesterRole?: string;
  supplierCategory?: string;
  riskLevel?: string;
  supplierAgeDays?: number;
  priority?: string;
  totalStages?: number;
};

export type ApprovalRoutingResult = {
  chainId?: string;
  routingId?: string;
  routingTimestamp?: Date;
  inputHash?: string;
  strategy?: string;
  stages: ApprovalStage[];
  requiresApproval: boolean;
  reason?: string;
  escalationLevel?: string;
  totalStages?: number;
  approvalChain?: any;
  workloadDistribution?: any;
};

export type ApprovalRoutingConfig = {
  organizationId: string;
  defaultStrategy: RoutingStrategy;
  enableAutoEscalation: boolean;
  escalationHours: number;
  enableWorkloadBalancing: boolean;
  maxWorkloadPerApprover: number;
  enableBackupApprovers: boolean;
  slaHours: number;
  reminderHours: number;
  rules: RoutingRule[];
  limits: ApprovalLimits;
};

export type ApprovalRoutingException = {
  code: RoutingErrorCode;
  message: string;
  severity: RoutingErrorSeverity;
  action: RoutingErrorAction;
  details?: Record<string, any>;
};

export enum EscalationLevel {
  LEVEL_1 = "LEVEL_1",
  LEVEL_2 = "LEVEL_2",
  LEVEL_3 = "LEVEL_3",
  LEVEL_4 = "LEVEL_4",
  LEVEL_5 = "LEVEL_5",
}

export type RoutingStrategy = "AMOUNT_BASED" | "DEPARTMENT_BASED" | "SUPPLIER_BASED" | "RISK_BASED" | "HYBRID";

export type RoutingErrorCode = 
  | "NO_APPROVER_FOUND" 
  | "APPROVER_UNAVAILABLE" 
  | "LIMIT_EXCEEDED" 
  | "CHAIN_INCOMPLETE" 
  | "SLA_BREACH" 
  | "DELEGATION_FAILED"
  | "MISSING_INVOICE_ID"
  | "INVALID_TOTAL_AMOUNT"
  | "MISSING_SUPPLIER_NAME"
  | "MISSING_DEPARTMENT"
  | "EXCEEDS_MAX_LIMIT"
  | "NO_AVAILABLE_APPROVERS";

export type RoutingErrorSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RoutingErrorAction = "ESCALATE" | "NOTIFY" | "BLOCK" | "FALLBACK";

export type RoutingRuleType = "AMOUNT_THRESHOLD" | "DEPARTMENT_MATCH" | "SUPPLIER_CATEGORY" | "RISK_LEVEL" | "CUSTOM";

export type RoutingRuleOperator = "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "CONTAINS" | "IN";

export type RoutingRuleAction = "ROUTE_TO_APPROVER" | "ROUTE_TO_ROLE" | "ROUTE_TO_DEPARTMENT" | "ESCALATE" | "BLOCK" | "FLAG";

export type ApprovalCondition = {
  field: string;
  operator?: RoutingRuleOperator;
  value: any;
  type?: string;
};

export type RoutingRule = {
  id?: string;
  ruleId?: string;
  name?: string;
  type?: RoutingRuleType;
  ruleType?: string;
  conditions?: ApprovalCondition[];
  action?: RoutingRuleAction;
  ruleAction?: string;
  priority: number;
  isActive: boolean;
  ruleOperator?: string;
  ruleValue?: any;
};

export type ApprovalLimits = {
  departments: DepartmentApprovalLimit[];
  roles: RoleApprovalLimit[];
  supplierCategories: SupplierCategoryApprovalLimit[];
  riskLevels: RiskLevelApprovalLimit[];
  custom: CustomApprovalLimit[];
};

export type DepartmentApprovalLimit = {
  department: string;
  baseLimit: number;
  limit?: number;
  escalationLevel?: EscalationLevel;
  escalationThreshold?: number;
};

export type RoleApprovalLimit = {
  role: string;
  baseLimit: number;
  maxLimit?: number;
  limit?: number;
  escalationLevel?: EscalationLevel;
};

export type SupplierCategoryApprovalLimit = {
  category: string;
  limit?: number;
  multiplier?: number;
  escalationLevel?: EscalationLevel;
};

export type RiskLevelApprovalLimit = {
  riskLevel: string;
  limit?: number;
  multiplier?: number;
  escalationLevel?: EscalationLevel;
};

export type CustomApprovalLimit = {
  name: string;
  condition: ApprovalCondition;
  limit: number;
  escalationLevel: EscalationLevel;
};

export type ApproverAvailability = {
  approverId: string;
  isAvailable: boolean;
  unavailableUntil?: Date;
  reason?: string;
};

export type ApproverCapacity = {
  approverId: string;
  currentPending: number;
  maxPending: number;
  capacityPercentage: number;
};

export type WorkloadDistribution = {
  approverId: string;
  currentLoad: number;
  maxCapacity: number;
  availableSlots: number;
};

export type ApprovalChainEntry = {
  chainId: string;
  sequence: number;
  approverId: string;
  approver?: any;
  status: ApprovalStatus;
  assignedAt: Date;
  completedAt?: Date;
  stage?: number;
};

export type RoutingAuditTrail = {
  id: string;
  routingId: string;
  decision: string;
  approvers: string[];
  timestamp: Date;
  metadata?: Record<string, any>;
};

export type RoutingMetadata = {
  invoiceId: string;
  routingId: string;
  strategy: RoutingStrategy;
  timestamp: Date;
  rulesApplied: string[];
};

export type ApprovalLimitType = "AMOUNT" | "PERCENTAGE" | "CATEGORY_AMOUNT";

export type ApprovalLimitScope = "INDIVIDUAL" | "DEPARTMENT" | "ROLE" | "ORGANIZATION";

export type SLAConfig = {
  hours: number;
  escalationHours?: number;
  warningThresholdPercent?: number;
};

export { DateTime };
