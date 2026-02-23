import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';
import {
  ApprovalServiceConfig,
  ApprovalRequest,
  ApprovalDecision,
  ApprovalStatus,
  ApprovalType,
  ApprovalPolicy,
  ApprovalParticipant,
  ApprovalError,
  InvalidApproverError,
  AlreadyDecidedError
} from './types';
import { ApprovalPolicyEngine } from './policy-engine';
import { EscalationManager } from './escalation-manager';

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
        logEvent: (eventId: string, approvalId: string, eventType: string, data: any) => Promise<void>;
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
    
    const validation = this.policyEngine.validatePolicy(policy);
    if (!validation.valid) {
      throw new ApprovalError(
        `Policy validation failed: ${validation.errors.join('; ')}`,
        'POLICY_INVALID'
      );
    }
    
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
        notifiedAt: idx === 0 ? new Date() : undefined
      })),
      escalationHistory: [],
      amount,
      currency: meta.currency || 'USD',
      metadata: { ...meta, policyName: policy.name },
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + (policy.timeoutMinutes || this.config.defaultTimeoutMinutes) * 60000)
    };
    
    const firstApprover = approval.participants[0];
    if (this.opts.notificationService && firstApprover) {
      await this.opts.notificationService.sendApprovalRequest(approval, firstApprover);
    }
    
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
    
    currentApprover.decision = decision.decision;
    currentApprover.respondedAt = decision.timestamp;
    currentApprover.comments = decision.comments;
    approval.updatedAt = new Date();
    
    let finalStatus: ApprovalStatus | null = null;
    
    if (decision.decision === ApprovalStatus.APPROVED) {
      const policy = this.policyEngine['policies'].find((p: any) => p.id === approval.policyId);
      const requireAll = policy?.requireAllApprovers ?? true;
      
      if (requireAll) {
        const allResponded = approval.participants.every(p => p.respondedAt);
        const allApproved = approval.participants.every(p => p.decision === ApprovalStatus.APPROVED);
        
        if (allResponded) {
          finalStatus = allApproved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
        } else {
          approval.currentApproverIndex += 1;
          const nextApprover = approval.participants[approval.currentApproverIndex];
          if (nextApprover) {
            nextApprover.notifiedAt = new Date();
            if (this.opts.notificationService) {
              await this.opts.notificationService.sendApprovalRequest(approval, nextApprover);
            }
          } else {
            finalStatus = ApprovalStatus.APPROVED;
          }
        }
      } else {
        finalStatus = ApprovalStatus.APPROVED;
      }
    } else if (decision.decision === ApprovalStatus.REJECTED) {
      const policy = this.policyEngine['policies'].find((p: any) => p.id === approval.policyId);
      
      if (policy?.autoEscalateOnRejection) {
        await this.escalationManager.escalateApproval(
          approval,
          3 as any,
          decision.approverId,
          decision.comments || 'Rejected by approver'
        );
      } else {
        finalStatus = ApprovalStatus.REJECTED;
      }
    }
    
    if (finalStatus) {
      approval.status = finalStatus;
      approval.completedAt = new Date();
      
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
      2 as any,
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
    approval.completedAt = new Date();
    approval.metadata = {
      ...approval.metadata,
      cancelledBy,
      cancelledReason: reason,
      cancelledAt: new Date().toISO()
    };
    
    await this.logAuditEvent(approval.id, 'approval_cancelled', { cancelledBy, reason });
    
    return this.repositories.approvalRepo.save(approval);
  }

  async processTimeouts(batchSize: number = 100): Promise<number> {
    const cutoff = new Date();
    const pendingApprovals = await this.repositories.approvalRepo.findPending(cutoff);
    
    const toProcess = pendingApprovals.slice(0, batchSize);
    const escalated = await this.escalationManager.checkTimeouts(toProcess);
    
    for (const approval of escalated) {
      await this.repositories.approvalRepo.save(approval);
      
      if (approval.status === ApprovalStatus.PENDING && 
          approval.currentApproverIndex >= approval.participants.length - 1) {
        approval.status = ApprovalStatus.EXPIRED;
        approval.completedAt = new Date();
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
    data: any
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
    
    const history = approval.escalationHistory.map(h => ({
      type: 'escalation',
      ...h
    }));
    
    return { approval, policy, history };
  }
}
