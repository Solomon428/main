import { DateTime } from 'luxon';
import { ApprovalStage, ApprovalRoutingResult, Approver } from './types';

export async function notifyApprovers(
  stages: ApprovalStage[],
  invoiceId: string,
  opts: {
    notificationService?: {
      notifyApproverAssigned: (approver: Approver, invoiceId: string, deadline: DateTime) => Promise<void>;
      notifySarsComplianceHold: (invoiceId: string, reason: string) => Promise<void>;
    };
  }
): Promise<void> {
  if (!opts.notificationService) return;
  
  const firstStage = stages[0];
  await opts.notificationService.notifyApproverAssigned(
    firstStage.approver,
    invoiceId,
    firstStage.deadline
  );
}

export function logRoutingResult(
  result: ApprovalRoutingResult,
  opts: {
    auditLogger?: (event: string, resource: string, resourceId: string, level: 'info' | 'warn' | 'error', data: any) => void;
  },
  startTime: DateTime
): void {
  opts.auditLogger?.('APPROVAL_ROUTING_COMPLETED', 'invoice', result.invoiceId, 'info', {
    routingId: result.routingId,
    escalationLevel: result.escalationLevel,
    totalStages: result.totalStages,
    approverCount: result.stages.length,
    amount: result.totalAmount,
    riskScore: result.riskScore,
    routingDurationMs: DateTime.now().diff(startTime, 'milliseconds').milliseconds,
    requiresEscalation: result.requiresEscalation,
    requiresDelegation: result.requiresDelegation
  });
}
