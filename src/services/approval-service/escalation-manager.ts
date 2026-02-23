import { DateTime } from 'luxon';
import { ApprovalRequest, ApprovalParticipant, ApprovalStatus, EscalationReason } from './types';
import { ApprovalPolicyEngine } from './policy-engine';

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
      throw new Error('Cannot escalate non-pending approval');
    }
    
    const currentApprover = approval.participants[approval.currentApproverIndex];
    if (!currentApprover) {
      throw new Error('No current approver to escalate from');
    }
    
    if (!this.policyEngine.shouldEscalate(approval, reason, currentApprover)) {
      this.logger?.('warn', 'Escalation blocked by policy', { approvalId: approval.id, reason });
      return null;
    }
    
    const escalationTarget = await this.findEscalationTarget(approval, currentApprover, reason);
    if (!escalationTarget) {
      this.logger?.('warn', 'No escalation target found', { approvalId: approval.id, reason });
      return null;
    }
    
    approval.escalationHistory.push({
      reason,
      fromApprover: currentApprover.userId,
      toApprover: escalationTarget.userId,
      timestamp: DateTime.now(),
      comments
    });
    
    approval.currentApproverIndex += 1;
    approval.participants[approval.currentApproverIndex] = {
      ...escalationTarget,
      notifiedAt: DateTime.now()
    };
    
    approval.updatedAt = DateTime.now();
    
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
    const policy = this.policyEngine['policies'].find((p: any) => p.id === approval.policyId);
    if (!policy) return null;
    
    if (policy.escalationChain && policy.escalationChain.length > 0) {
      for (const candidate of policy.escalationChain) {
        if (!approval.participants.some(p => p.userId === candidate.userId)) {
          return candidate;
        }
      }
    }
    
    const nextIndex = approval.currentApproverIndex + 1;
    if (nextIndex < approval.participants.length) {
      return approval.participants[nextIndex];
    }
    
    if (reason === EscalationReason.TIMEOUT) {
      const firstApprover = approval.participants[0];
      if (!firstApprover.metadata?.escalationLoopCount) {
        return {
          ...firstApprover,
          meta: { ...firstApprover.metadata, escalationLoopCount: 1 }
        };
      }
      
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
      
      const timeoutMinutes = currentApprover.escalationTimeoutMinutes || 
                           this.getDefaultTimeout(approval);
      
      const elapsedMinutes = currentTime.getTime() - new Date(currentApprover.notifiedAt).getTime();
      const elapsedMins = elapsedMinutes / 60000;
      
      if (elapsedMins >= timeoutMinutes) {
        await this.escalateApproval(
          approval,
          EscalationReason.TIMEOUT,
          'system',
          `Auto-escalated after ${elapsedMins.toFixed(1)} minutes (threshold: ${timeoutMinutes}m)`
        );
        escalated.push(approval);
      }
    }
    
    return escalated;
  }

  private getDefaultTimeout(approval: ApprovalRequest): number {
    const policy = this.policyEngine['policies'].find((p: any) => p.id === approval.policyId);
    return policy?.timeoutMinutes || 1440;
  }
}
