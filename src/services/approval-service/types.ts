export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export enum ApprovalType {
  INVOICE = 'invoice',
  EXPENSE_REPORT = 'expense_report',
  PURCHASE_ORDER = 'purchase_order',
  CONTRACT = 'contract',
  USER_ACCESS = 'user_access',
  VENDOR_ONBOARDING = 'vendor_onboarding',
  CUSTOM = 'custom'
}

export enum EscalationReason {
  TIMEOUT = 'timeout',
  REJECTION = 'rejection',
  MANUAL = 'manual',
  THRESHOLD_EXCEEDED = 'threshold_exceeded'
}

export interface ApprovalParticipant {
  userId: string;
  role: string;
  email: string;
  approvalOrder: number;
  escalationTimeoutMinutes?: number;
  notifiedAt?: Date;
  respondedAt?: Date;
  decision?: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED;
  comments?: string;
  metadata?: Record<string, any>;
}

export interface ApprovalPolicy {
  id: string;
  name: string;
  approvalType: ApprovalType;
  approvalChain: ApprovalParticipant[];
  escalationChain?: ApprovalParticipant[];
  autoEscalateOnTimeout: boolean;
  autoEscalateOnRejection: boolean;
  requireAllApprovers: boolean;
  timeoutMinutes: number;
  amountThresholds?: {
    minAmount?: number;
    maxAmount?: number;
    approvers: string[];
  }[];
  metadata?: Record<string, any>;
}

export interface ApprovalRequest {
  id: string;
  requestId: string;
  approvalType: ApprovalType;
  policyId: string;
  status: ApprovalStatus;
  currentApproverIndex: number;
  participants: ApprovalParticipant[];
  escalationHistory: {
    reason: EscalationReason;
    fromApprover: string;
    toApprover: string;
    timestamp: Date;
    comments?: string;
  }[];
  amount?: number;
  currency?: string;
  meta: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  completedAt?: Date;
}

export interface ApprovalDecision {
  requestId: string;
  approverId: string;
  decision: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED;
  comments?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ApprovalServiceConfig {
  defaultTimeoutMinutes: number;
  escalationRetryLimit: number;
  notificationTemplates: {
    approvalRequested: string;
    escalationTriggered: string;
    approvalCompleted: string;
  };
  enableParallelApprovals: boolean;
  auditLogRetentionDays: number;
}

export class ApprovalError extends Error {
  constructor(message: string, public readonly code: string) {
    super(`[APPROVAL-${code}] ${message}`);
    this.name = 'ApprovalError';
  }
}

export class TimeoutError extends ApprovalError {
  constructor(approvalId: string) {
    super(`Approval ${approvalId} timed out`, 'TIMEOUT');
    this.name = 'TimeoutError';
  }
}

export class InvalidApproverError extends ApprovalError {
  constructor(approverId: string, approvalId: string) {
    super(`User ${approverId} is not a valid approver for ${approvalId}`, 'INVALID_APPROVER');
    this.name = 'InvalidApproverError';
  }
}

export class AlreadyDecidedError extends ApprovalError {
  constructor(approvalId: string) {
    super(`Approval ${approvalId} already has a final decision`, 'ALREADY_DECIDED');
    this.name = 'AlreadyDecidedError';
  }
}
