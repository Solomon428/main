import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';

// ==================== DOMAIN TYPES ====================
type DateTimeType = ReturnType<typeof DateTime.now>;

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
  approvalOrder: number; // 1 = first approver, 2 = second, etc.
  escalationTimeoutMinutes?: number; // Individual timeout override
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
  escalationChain?: ApprovalParticipant[]; // Fallback approvers
  autoEscalateOnTimeout: boolean;
  autoEscalateOnRejection: boolean;
  requireAllApprovers: boolean; // vs. first approver wins
  timeoutMinutes: number; // Default timeout for entire approval
  amountThresholds?: {
    minAmount?: number;
    maxAmount?: number;
    approvers: string[]; // Roles/userIds
  }[];
  metadata?: Record<string, any>;
}

export interface ApprovalRequest {
  id: string;
  requestId: string; // ID of the entity being approved (invoiceId, poId, etc.)
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

// ==================== CUSTOM ERRORS ====================
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

// ==================== APPROVAL POLICY ENGINE ====================
export class ApprovalPolicyEngine {
  constructor(
    private readonly policies: ApprovalPolicy[],
    private readonly config: { amountFieldPath?: string } = {}
  ) {}

  findMatchingPolicy(
    approvalType: ApprovalType,
    amount?: number,
    metadata: Record<string, any> = {}
  ): ApprovalPolicy | null {
    // Filter by type first
    let candidates = this.policies.filter(p => p.approvalType === approvalType);
    
    // Apply amount thresholds if provided
    if (amount !== undefined && amount !== null) {
      candidates = candidates.filter(policy => {
        if (!policy.amountThresholds || policy.amountThresholds.length === 0) {
          return true; // No thresholds = always match
        }
        
        return policy.amountThresholds.some(threshold => {
          const min = threshold.minAmount ?? -Infinity;
          const max = threshold.maxAmount ?? Infinity;
          return amount >= min && amount <= max;
        });
      });
    }
    
    // Return most specific match (longest approval chain)
    return candidates.sort((a, b) => b.approvalChain.length - a.approvalChain.length)[0] || null;
  }

  validatePolicy(policy: ApprovalPolicy): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!policy.id || policy.id.trim().length < 3) {
      errors.push('Policy requires valid id (min 3 chars)');
    }
    
    if (policy.approvalChain.length === 0) {
      errors.push('Policy requires at least one approver');
    }
    
    // Validate approver uniqueness in chain
    const userIds = new Set<string>();
    for (const approver of policy.approvalChain) {
      if (!approver.userId || !approver.role) {
        errors.push(`Approver missing userId or role: ${JSON.stringify(approver)}`);
      }
      if (userIds.has(approver.userId)) {
        errors.push(`Duplicate approver in chain: ${approver.userId}`);
      }
      userIds.add(approver.userId);
    }
    
    // Validate escalation chain uniqueness
    if (policy.escalationChain) {
      const escalationIds = new Set<string>();
      for (const approver of policy.escalationChain) {
        if (userIds.has(approver.userId)) {
          errors.push(`Escalation approver ${approver.userId} already in primary chain`);
        }
        if (escalationIds.has(approver.userId)) {
          errors.push(`Duplicate approver in escalation chain: ${approver.userId}`);
        }
        escalationIds.add(approver.userId);
      }
    }
    
    if (policy.timeoutMinutes && policy.timeoutMinutes < 5) {
      errors.push('Timeout must be at least 5 minutes');
    }
    
    return { valid: errors.length === 0, errors };
  }

  getNextApprover(
    approval: ApprovalRequest,
    currentDecision?: ApprovalDecision
  ): ApprovalParticipant | null {
    if (approval.status !== ApprovalStatus.PENDING) return null;
    
    // Sequential approval flow
    if (approval.currentApproverIndex < approval.participants.length) {
      return approval.participants[approval.currentApproverIndex];
    }
    
    return null;
  }

  shouldEscalate(
    approval: ApprovalRequest,
    reason: EscalationReason,
    currentApprover?: ApprovalParticipant
  ): boolean {
    const policy = this.policies.find(p => p.id === approval.policyId);
    if (!policy) return false;
    
    switch (reason) {
      case EscalationReason.TIMEOUT:
        return policy.autoEscalateOnTimeout;
      case EscalationReason.REJECTION:
        return policy.autoEscalateOnRejection;
      case EscalationReason.MANUAL:
        return true; // Manual escalations always allowed
      case EscalationReason.THRESHOLD_EXCEEDED:
        return true;
      default:
        return false;
    }
  }
}

// ==================== ESCALATION MANAGER ====================
export class EscalationManager {
  constructor(
    private readonly policyEngine: ApprovalPolicyEngine,
    private readonly notificationService?: {
      sendEscalationNotification: (
        approval: ApprovalRequest,
        fromApprover: ApprovalParticipant,
        toApprover: ApprovalParticipant,
        reason: EscalationReason
      ) => Promise<void>;
    },
    private readonly logger?: (level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: any) => void
  ) {}

  async escalateApproval(
    approval: ApprovalRequest,
    reason: EscalationReason,
    triggeredBy: string,
    comments?: string
  ): Promise<ApprovalParticipant | null> {
    if (approval.status !== ApprovalStatus.PENDING) {
      throw new ApprovalError('Cannot escalate non-pending approval', 'INVALID_STATE');
    }
    
    const currentApprover = approval.participants[approval.currentApproverIndex];
    if (!currentApprover) {
      throw new ApprovalError('No current approver to escalate from', 'NO_CURRENT_APPROVER');
    }
    
    // Check if escalation is allowed by policy
    if (!this.policyEngine.shouldEscalate(approval, reason, currentApprover)) {
      this.logger?.('warn', 'Escalation blocked by policy', { approvalId: approval.id, reason });
      return null;
    }
    
    // Find escalation target
    const escalationTarget = await this.findEscalationTarget(approval, currentApprover, reason);
    if (!escalationTarget) {
      this.logger?.('warn', 'No escalation target found', { approvalId: approval.id, reason });
      return null;
    }
    
    // Record escalation
    approval.escalationHistory.push({
      reason,
      fromApprover: currentApprover.userId,
      toApprover: escalationTarget.userId,
      timestamp: DateTime.now(),
      comments
    });
    
    // Move to next approver (could be escalation chain or next in primary chain)
    approval.currentApproverIndex += 1;
    approval.participants[approval.currentApproverIndex] = {
      ...escalationTarget,
      notifiedAt: DateTime.now()
    };
    
    approval.updatedAt = DateTime.now();
    
    // Notify new approver
    if (this.notificationService) {
      await this.notificationService.sendEscalationNotification(
        approval,
        currentApprover,
        escalationTarget,
        reason
      );
    }
    
    this.logger?.('info', 'Approval escalated', {
      approvalId: approval.id,
      from: currentApprover.userId,
      to: escalationTarget.userId,
      reason
    });
    
    return escalationTarget;
  }

  private async findEscalationTarget(
    approval: ApprovalRequest,
    currentApprover: ApprovalParticipant,
    reason: EscalationReason
  ): Promise<ApprovalParticipant | null> {
    const policy = this.policyEngine['policies'].find(p => p.id === approval.policyId);
    if (!policy) return null;
    
    // Priority 1: Use escalation chain if defined
    if (policy.escalationChain && policy.escalationChain.length > 0) {
      // Find next escalation approver not already in participants
      for (const candidate of policy.escalationChain) {
        if (!approval.participants.some(p => p.userId === candidate.userId)) {
          return candidate;
        }
      }
    }
    
    // Priority 2: Move to next approver in primary chain
    const nextIndex = approval.currentApproverIndex + 1;
    if (nextIndex < approval.participants.length) {
      return approval.participants[nextIndex];
    }
    
    // Priority 3: Loop back to first approver (with metadata flag to prevent infinite loops)
    if (reason === EscalationReason.TIMEOUT) {
      const firstApprover = approval.participants[0];
      if (!firstApprover.metadata?.escalationLoopCount) {
        return {
          ...firstApprover,
          meta: { ...firstApprover.metadata, escalationLoopCount: 1 }
        };
      }
      
      // Prevent infinite escalation loops
      if (firstApprover.metadata.escalationLoopCount >= 3) {
        this.logger?.('error', 'Escalation loop detected - terminating', { approvalId: approval.id });
        return null;
      }
      
      return {
        ...firstApprover,
        meta: { 
          ...firstApprover.metadata, 
          escalationLoopCount: firstApprover.metadata.escalationLoopCount + 1 
        }
      };
    }
    
    return null;
  }

  async checkTimeouts(
    pendingApprovals: ApprovalRequest[],
    currentTime: Date = new Date()
  ): Promise<ApprovalRequest[]> {
    const escalated: ApprovalRequest[] = [];
    
    for (const approval of pendingApprovals) {
      if (approval.status !== ApprovalStatus.PENDING) continue;
      
      const currentApprover = approval.participants[approval.currentApproverIndex];
      if (!currentApprover?.notifiedAt) continue;
      
      // Determine timeout threshold (individual override or policy default)
      const timeoutMinutes = currentApprover.escalationTimeoutMinutes || 
                           this.getDefaultTimeout(approval);
      
      const elapsedMinutes = currentTime.diff(currentApprover.notifiedAt, 'minutes').minutes;
      
      if (elapsedMinutes >= timeoutMinutes) {
        await this.escalateApproval(
          approval,
          EscalationReason.TIMEOUT,
          'system',
          `Auto-escalated after ${elapsedMinutes.toFixed(1)} minutes (threshold: ${timeoutMinutes}m)`
        );
        escalated.push(approval);
      }
    }
    
    return escalated;
  }

  private getDefaultTimeout(approval: ApprovalRequest): number {
    const policy = this.policyEngine['policies'].find(p => p.id === approval.policyId);
    return policy?.timeoutMinutes || 1440; // Default 24 hours
  }
}

// ==================== APPROVAL SERVICE ====================
export class ApprovalService {
  private readonly policyEngine: ApprovalPolicyEngine;
  private readonly escalationManager: EscalationManager;
  
  constructor(
    private readonly config: ApprovalServiceConfig,
    private readonly repositories: {
      approvalRepo: {
        save: (approval: ApprovalRequest) => Promise<ApprovalRequest>;
        findById: (id: string) => Promise<ApprovalRequest | null>;
        findByRequestId: (requestId: string, type: ApprovalType) => Promise<ApprovalRequest | null>;
        findPending: (before: Date) => Promise<ApprovalRequest[]>;
      };
      policyRepo: {
        findAll: () => Promise<ApprovalPolicy[]>;
        findById: (id: string) => Promise<ApprovalPolicy | null>;
      };
      auditRepo?: {
        logEvent: (eventId: string, approvalId: string, eventType: string,  any) => Promise<void>;
      };
    },
    private readonly opts: {
      notificationService?: {
        sendApprovalRequest: (approval: ApprovalRequest, approver: ApprovalParticipant) => Promise<void>;
        sendApprovalCompleted: (approval: ApprovalRequest) => Promise<void>;
      };
      identityService?: {
        getUserById: (userId: string) => Promise<{ id: string; email: string; roles: string[] } | null>;
      };
      logger?: (level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: any) => void;
    } = {}
  ) {
    this.policyEngine = new ApprovalPolicyEngine([]);
    this.escalationManager = new EscalationManager(
      this.policyEngine,
      opts.notificationService ? {
        sendEscalationNotification: async (approval, fromApprover, toApprover, reason) => {
          // Implementation would send email/Slack/etc.
          opts.logger?.('info', 'Escalation notification sent', { 
            approvalId: approval.id, 
            to: toApprover.email,
            reason 
          });
        }
      } : undefined,
      opts.logger
    );
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    const policies = await this.repositories.policyRepo.findAll();
    this.policyEngine = new ApprovalPolicyEngine(policies);
  }

  async requestApproval(
    requestId: string,
    approvalType: ApprovalType,
    amount: number,
    meta: Record<string, any> = {},
    overridePolicyId?: string
  ): Promise<ApprovalRequest> {
    // Find matching policy
    let policy: ApprovalPolicy | null = null;
    
    if (overridePolicyId) {
      policy = await this.repositories.policyRepo.findById(overridePolicyId);
      if (!policy) {
        throw new ApprovalError(`Policy ${overridePolicyId} not found`, 'POLICY_NOT_FOUND');
      }
    } else {
      policy = this.policyEngine.findMatchingPolicy(approvalType, amount, meta);
      if (!policy) {
        throw new ApprovalError(
          `No approval policy found for type ${approvalType}` + (amount ? ` and amount ${amount}` : ''),
          'NO_POLICY'
        );
      }
    }
    
    // Validate policy
    const validation = this.policyEngine.validatePolicy(policy);
    if (!validation.valid) {
      throw new ApprovalError(
        `Policy validation failed: ${validation.errors.join('; ')}`,
        'POLICY_INVALID'
      );
    }
    
    // Create approval request
    const approval: ApprovalRequest = {
      id: uuidv4(),
      requestId,
      approvalType,
      policyId: policy.id,
      status: ApprovalStatus.PENDING,
      currentApproverIndex: 0,
      participants: policy.approvalChain.map((approver, idx) => ({
        ...approver,
        approvalOrder: idx + 1,
        notifiedAt: idx === 0 ? DateTime.now() : undefined // Only notify first approver immediately
      })),
      escalationHistory: [],
      amount,
      currency: metadata.currency || 'USD',
      metadata: { ...metadata, policyName: policy.name },
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      expiresAt: DateTime.now().plus({ minutes: policy.timeoutMinutes || this.config.defaultTimeoutMinutes })
    };
    
    // Notify first approver
    const firstApprover = approval.participants[0];
    if (this.opts.notificationService && firstApprover) {
      await this.opts.notificationService.sendApprovalRequest(approval, firstApprover);
    }
    
    // Persist
    const savedApproval = await this.repositories.approvalRepo.save(approval);
    
    await this.logAuditEvent(approval.id, 'approval_requested', {
      requestId,
      approvalType,
      policyId: policy.id,
      firstApprover: firstApprover.userId
    });
    
    this.opts.logger?.('info', 'Approval request created', {
      approvalId: approval.id,
      requestId,
      firstApprover: firstApprover.userId
    });
    
    return savedApproval;
  }

  async submitDecision(
    approvalId: string,
    decision: ApprovalDecision
  ): Promise<ApprovalRequest> {
    const approval = await this.repositories.approvalRepo.findById(approvalId);
    if (!approval) {
      throw new ApprovalError(`Approval ${approvalId} not found`, 'NOT_FOUND');
    }
    
    if (approval.status !== ApprovalStatus.PENDING) {
      throw new AlreadyDecidedError(approvalId);
    }
    
    const currentApprover = approval.participants[approval.currentApproverIndex];
    if (!currentApprover || currentApprover.userId !== decision.approverId) {
      throw new InvalidApproverError(decision.approverId, approvalId);
    }
    
    if (currentApprover.respondedAt) {
      throw new ApprovalError('Approver has already responded', 'ALREADY_RESPONDED');
    }
    
    // Record decision
    currentApprover.decision = decision.decision;
    currentApprover.respondedAt = decision.timestamp;
    currentApprover.comments = decision.comments;
    approval.updatedAt = DateTime.now();
    
    // Determine next state
    let finalStatus: ApprovalStatus | null = null;
    
    if (decision.decision === ApprovalStatus.APPROVED) {
      // Check if this was the last required approver
      const policy = this.policyEngine['policies'].find(p => p.id === approval.policyId);
      const requireAll = policy?.requireAllApprovers ?? true;
      
      if (requireAll) {
        // Need all approvers to approve
        const allResponded = approval.participants.every(p => p.respondedAt);
        const allApproved = approval.participants.every(p => p.decision === ApprovalStatus.APPROVED);
        
        if (allResponded) {
          finalStatus = allApproved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
        } else {
          // Move to next approver
          approval.currentApproverIndex += 1;
          const nextApprover = approval.participants[approval.currentApproverIndex];
          if (nextApprover) {
            nextApprover.notifiedAt = DateTime.now();
            if (this.opts.notificationService) {
              await this.opts.notificationService.sendApprovalRequest(approval, nextApprover);
            }
          } else {
            finalStatus = ApprovalStatus.APPROVED; // All approved
          }
        }
      } else {
        // First approver wins
        finalStatus = ApprovalStatus.APPROVED;
      }
    } else if (decision.decision === ApprovalStatus.REJECTED) {
      // Rejection immediately terminates (unless policy allows escalation on rejection)
      const policy = this.policyEngine['policies'].find(p => p.id === approval.policyId);
      
      if (policy?.autoEscalateOnRejection) {
        // Escalate instead of rejecting
        await this.escalationManager.escalateApproval(
          approval,
          EscalationReason.REJECTION,
          decision.approverId,
          decision.comments || 'Rejected by approver'
        );
      } else {
        finalStatus = ApprovalStatus.REJECTED;
      }
    }
    
    // Apply final status if determined
    if (finalStatus) {
      approval.status = finalStatus;
      approval.completedAt = DateTime.now();
      
      // Notify requestor/completers
      if (this.opts.notificationService) {
        await this.opts.notificationService.sendApprovalCompleted(approval);
      }
      
      await this.logAuditEvent(approval.id, 'approval_completed', {
        status: finalStatus,
        approvedBy: decision.approverId,
        comments: decision.comments
      });
    } else {
      await this.logAuditEvent(approval.id, 'approval_decision_recorded', {
        approverId: decision.approverId,
        decision: decision.decision,
        comments: decision.comments
      });
    }
    
    return this.repositories.approvalRepo.save(approval);
  }

  async escalateManually(
    approvalId: string,
    escalatedBy: string,
    reason: string,
    comments?: string
  ): Promise<ApprovalRequest> {
    const approval = await this.repositories.approvalRepo.findById(approvalId);
    if (!approval) throw new ApprovalError(`Approval ${approvalId} not found`, 'NOT_FOUND');
    
    const escalatedTo = await this.escalationManager.escalateApproval(
      approval,
      EscalationReason.MANUAL,
      escalatedBy,
      `${reason}${comments ? `: ${comments}` : ''}`
    );
    
    if (!escalatedTo) {
      throw new ApprovalError('No escalation target available', 'NO_ESCALATION_TARGET');
    }
    
    await this.logAuditEvent(approval.id, 'approval_escalated', {
      escalatedBy,
      escalatedTo: escalatedTo.userId,
      reason,
      comments
    });
    
    return this.repositories.approvalRepo.save(approval);
  }

  async cancelApproval(
    approvalId: string,
    cancelledBy: string,
    reason: string
  ): Promise<ApprovalRequest> {
    const approval = await this.repositories.approvalRepo.findById(approvalId);
    if (!approval) throw new ApprovalError(`Approval ${approvalId} not found`, 'NOT_FOUND');
    
    if (![ApprovalStatus.PENDING, ApprovalStatus.ESCALATED].includes(approval.status)) {
      throw new ApprovalError('Only pending/escalated approvals can be cancelled', 'INVALID_STATE');
    }
    
    approval.status = ApprovalStatus.CANCELLED;
    approval.completedAt = DateTime.now();
    approval.metadata = {
      ...approval.metadata,
      cancelledBy,
      cancelledReason: reason,
      cancelledAt: DateTime.now().toISO()
    };
    
    await this.logAuditEvent(approval.id, 'approval_cancelled', { cancelledBy, reason });
    
    return this.repositories.approvalRepo.save(approval);
  }

  async processTimeouts(batchSize: number = 100): Promise<number> {
    const cutoff = DateTime.now();
    const pendingApprovals = await this.repositories.approvalRepo.findPending(cutoff);
    
    const toProcess = pendingApprovals.slice(0, batchSize);
    const escalated = await this.escalationManager.checkTimeouts(toProcess);
    
    // Save escalated approvals
    for (const approval of escalated) {
      await this.repositories.approvalRepo.save(approval);
      
      // If no escalation target found and timeout reached final threshold, mark expired
      if (approval.status === ApprovalStatus.PENDING && 
          approval.currentApproverIndex >= approval.participants.length - 1) {
        approval.status = ApprovalStatus.EXPIRED;
        approval.completedAt = DateTime.now();
        await this.repositories.approvalRepo.save(approval);
        
        await this.logAuditEvent(approval.id, 'approval_expired', {
          reason: 'All approvers timed out without response'
        });
      }
    }
    
    return escalated.length;
  }

  async getApprovalStatus(requestId: string, approvalType: ApprovalType): Promise<ApprovalRequest | null> {
    return this.repositories.approvalRepo.findByRequestId(requestId, approvalType);
  }

  private async logAuditEvent(
    approvalId: string,
    eventType: string,
     any
  ): Promise<void> {
    if (this.repositories.auditRepo) {
      await this.repositories.auditRepo.logEvent(
        uuidv4(),
        approvalId,
        eventType,
        {
          ...data,
          timestamp: DateTime.now().toISO(),
          approvalId
        }
      );
    }
  }

  async getApprovalChain(approvalId: string): Promise<{
    approval: ApprovalRequest;
    policy: ApprovalPolicy | null;
    history: any[];
  }> {
    const approval = await this.repositories.approvalRepo.findById(approvalId);
    if (!approval) throw new ApprovalError(`Approval ${approvalId} not found`, 'NOT_FOUND');
    
    const policy = await this.repositories.policyRepo.findById(approval.policyId);
    
    // In production: fetch actual decision history from audit log
    const history = approval.escalationHistory.map(h => ({
      type: 'escalation',
      ...h
    }));
    
    return { approval, policy, history };
  }
}

// ==================== MOCK REPOSITORIES FOR EXAMPLE ====================
export class MockApprovalRepository {
  private readonly store = new Map<string, ApprovalRequest>();
  
  async save(approval: ApprovalRequest): Promise<ApprovalRequest> {
    this.store.set(approval.id, approval);
    return approval;
  }
  
  async findById(id: string): Promise<ApprovalRequest | null> {
    return this.store.get(id) || null;
  }
  
  async findByRequestId(requestId: string, _type: ApprovalType): Promise<ApprovalRequest | null> {
    for (const approval of this.store.values()) {
      if (approval.requestId === requestId) return approval;
    }
    return null;
  }
  
  async findPending(_before: DateTime): Promise<ApprovalRequest[]> {
    return Array.from(this.store.values()).filter(a => a.status === ApprovalStatus.PENDING);
  }
}

export class MockPolicyRepository {
  private readonly policies: ApprovalPolicy[] = [
    {
      id: 'policy-invoice-standard',
      name: 'Standard Invoice Approval',
      approvalType: ApprovalType.INVOICE,
      approvalChain: [
        { userId: 'user-101', role: 'manager', email: 'mgr@company.com', approvalOrder: 1 },
        { userId: 'user-201', role: 'finance_director', email: 'fd@company.com', approvalOrder: 2 }
      ],
      escalationChain: [
        { userId: 'user-301', role: 'cfo', email: 'cfo@company.com', approvalOrder: 1 }
      ],
      autoEscalateOnTimeout: true,
      autoEscalateOnRejection: false,
      requireAllApprovers: true,
      timeoutMinutes: 1440, // 24 hours
      amountThresholds: [
        { maxAmount: 5000, approvers: ['manager'] },
        { minAmount: 5000, maxAmount: 25000, approvers: ['manager', 'finance_director'] },
        { minAmount: 25000, approvers: ['manager', 'finance_director', 'cfo'] }
      ]
    }
  ];
  
  async findAll(): Promise<ApprovalPolicy[]> {
    return this.policies;
  }
  
  async findById(id: string): Promise<ApprovalPolicy | null> {
    return this.policies.find(p => p.id === id) || null;
  }
}

// ==================== EXAMPLE USAGE ====================
/*
const approvalService = new ApprovalService(
  {
    defaultTimeoutMinutes: 1440,
    escalationRetryLimit: 3,
    notificationTemplates: {} as any,
    enableParallelApprovals: false,
    auditLogRetentionDays: 90
  },
  {
    approvalRepo: new MockApprovalRepository(),
    policyRepo: new MockPolicyRepository()
  }
);

// Usage:
// const approval = await approvalService.requestApproval('invoice-789', ApprovalType.INVOICE, 7500);
// await approvalService.submitDecision(approval.id, {
//   requestId: approval.id,
//   approverId: 'user-101',
//   decision: ApprovalStatus.APPROVED,
//   timestamp: DateTime.now()
// });
*/
