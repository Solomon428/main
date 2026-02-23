import { ApprovalPolicy, ApprovalRequest, ApprovalParticipant, ApprovalType, ApprovalStatus, EscalationReason } from './types';

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
    let candidates = this.policies.filter(p => p.approvalType === approvalType);
    
    if (amount !== undefined && amount !== null) {
      candidates = candidates.filter(policy => {
        if (!policy.amountThresholds || policy.amountThresholds.length === 0) {
          return true;
        }
        
        return policy.amountThresholds.some(threshold => {
          const min = threshold.minAmount ?? -Infinity;
          const max = threshold.maxAmount ?? Infinity;
          return amount >= min && amount <= max;
        });
      });
    }
    
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
    currentDecision?: { approverId: string; decision: ApprovalStatus }
  ): ApprovalParticipant | null {
    if (approval.status !== ApprovalStatus.PENDING) return null;
    
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
        return true;
      case EscalationReason.THRESHOLD_EXCEEDED:
        return true;
      default:
        return false;
    }
  }
}
