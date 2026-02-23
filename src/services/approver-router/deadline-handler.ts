import { DateTime } from 'luxon';
import { ApprovalStage, ApprovalRoutingConfig, Approver, ApprovalStatus } from './types';

export async function verifyDelegationCertificates(
  stages: ApprovalStage[],
  routingId: string,
  repositories: {
    approverRepo: {
      findApproversByCriteria: (criteria: any) => Promise<Approver[]>;
      verifySarsDelegationCertificate: (approverId: string) => Promise<boolean>;
    };
  },
  opts: {
    auditLogger?: (event: string, resource: string, resourceId: string, level: 'info' | 'warn' | 'error', data: any) => void;
  }
): Promise<void> {
  for (const stage of stages) {
    if (!stage.approver.saDelegationCertificate) {
      opts.auditLogger?.('MISSING_SARS_DELEGATION_CERT', 'approver', stage.approverId, 'warn', {
        routingId,
        approver: stage.approver.name,
        stage: stage.stageNumber,
        requirement: 'SARS Delegation of Authority Certificate required per Section 80A'
      });
      continue;
    }
    
    try {
      const valid = await repositories.approverRepo.verifySarsDelegationCertificate(
        stage.approverId
      );
      if (!valid) {
        opts.auditLogger?.('INVALID_SARS_DELEGATION_CERT', 'approver', stage.approverId, 'error', {
          routingId,
          approver: stage.approver.name,
          certificateRef: stage.approver.saDelegationCertificate
        });
        
        stage.status = ApprovalStatus.SARS_HOLD;
        stage.metadata = {
          ...stage.metadata,
          sarsHoldReason: 'Invalid delegation certificate',
          requiresComplianceReview: true
        };
      }
    } catch (err) {
      opts.auditLogger?.('DELEGATION_CERT_VERIFY_FAILED', 'approver', stage.approverId, 'error', {
        error: err instanceof Error ? err.message : String(err)
      });
      
      const complianceOfficer = await findComplianceOfficer(repositories);
      if (complianceOfficer) {
        stage.approver = complianceOfficer;
        stage.approverId = complianceOfficer.id;
        stage.metadata = {
          ...stage.metadata,
          delegationVerificationFailed: true,
          manuallyAssignedBy: 'system',
          assignmentReason: 'Delegation certificate verification failed'
        };
      }
    }
  }
}

export async function findComplianceOfficer(
  repositories: {
    approverRepo: {
      findApproversByCriteria: (criteria: any) => Promise<Approver[]>;
    };
  }
): Promise<Approver | null> {
  const officers = await repositories.approverRepo.findApproversByCriteria({
    escalationLevel: 3 as any,
    department: 'compliance',
    isActive: true,
    isAvailable: true,
    minApprovalLimit: 0
  });
  return officers.length > 0 ? officers[0] : null;
}

export async function applyWorkloadBalancing(
  stages: ApprovalStage[],
  routingId: string,
  repositories: {
    approverRepo: {
      findApproversByCriteria: (criteria: any) => Promise<Approver[]>;
    };
  },
  opts: {
    auditLogger?: (event: string, resource: string, resourceId: string, level: 'info' | 'warn' | 'error', data: any) => void;
  }
): Promise<void> {
  for (const stage of stages) {
    if (stage.approver.currentWorkload < stage.approver.maxWorkload * 0.7) continue;
    
    const alternatives = await repositories.approverRepo.findApproversByCriteria({
      escalationLevel: stage.escalationLevel,
      department: stage.approver.department,
      isActive: true,
      isAvailable: true,
      minApprovalLimit: stage.minAmount
    });
    
    if (alternatives.length <= 1) continue;
    
    const leastBusy = alternatives.reduce((min, approver) => {
      const minRatio = min.currentWorkload / (min.maxWorkload || 20);
      const currRatio = approver.currentWorkload / (approver.maxWorkload || 20);
      return currRatio < minRatio ? approver : min;
    }, alternatives[0]);
    
    const currentRatio = stage.approver.currentWorkload / (stage.approver.maxWorkload || 20);
    const newRatio = leastBusy.currentWorkload / (leastBusy.maxWorkload || 20);
    
    if (currentRatio - newRatio > 0.2) {
      stage.approverId = leastBusy.id;
      stage.approver = leastBusy;
      
      opts.auditLogger?.('WORKLOAD_BALANCED', 'approval_stage', stage.stageNumber.toString(), 'info', {
        routingId,
        originalApprover: stage.approver.name,
        newApprover: leastBusy.name,
        workloadImprovement: `${((currentRatio - newRatio) * 100).toFixed(0)}%`,
        reason: 'Workload balancing applied'
      });
    }
  }
}

export async function applyDelegationChains(
  stages: ApprovalStage[],
  routingId: string,
  repositories: {
    approverRepo: {
      findApproversByCriteria: (criteria: any) => Promise<Approver[]>;
      getDelegationChain: (approverId: string) => Promise<Array<{ delegateeId: string; expiry: DateTime }>>;
    };
  },
  opts: {
    auditLogger?: (event: string, resource: string, resourceId: string, level: 'info' | 'warn' | 'error', data: any) => void;
  }
): Promise<void> {
  for (const stage of stages) {
    if (stage.approver.delegatedTo && stage.approver.delegationExpiry && 
        stage.approver.delegationExpiry > DateTime.now()) {
      
      const chain = await repositories.approverRepo.getDelegationChain(stage.approverId);
      if (chain.length > 0) {
        const activeDelegate = chain.find(d => d.expiry > DateTime.now());
        if (activeDelegate) {
          const delegateApprovers = await repositories.approverRepo.findApproversByCriteria({
            escalationLevel: stage.escalationLevel,
            isActive: true,
            isAvailable: true,
            minApprovalLimit: stage.minAmount
          });
          
          const delegate = delegateApprovers.find(a => a.id === activeDelegate.delegateeId);
          if (delegate) {
            stage.approverId = delegate.id;
            stage.approver = delegate;
            stage.metadata = {
              ...stage.metadata,
              delegatedFrom: stage.approverId,
              delegationReason: 'approver_unavailable',
              delegationExpiry: activeDelegate.expiry
            };
          }
        }
      }
    }
  }
}

export async function calculateDeadlines(
  stages: ApprovalStage[],
  routingStart: DateTime,
  config: ApprovalRoutingConfig
): Promise<void> {
  let currentDeadline = routingStart;
  
  for (const stage of stages) {
    let deadline = currentDeadline.plus({ hours: stage.slaHours });
    deadline = await adjustForBusinessHours(deadline, config);
    
    if (config.holidayCalendar) {
      const isHoliday = (date: DateTime): boolean => {
        return config.holidayCalendar?.some(h => date.toISODate() === h) ?? false;
      };
      while (isHoliday(deadline)) {
        deadline = deadline.plus({ days: 1 });
        deadline = await adjustForBusinessHours(deadline, config);
      }
    }
    
    stage.deadline = deadline;
    stage.escalationDeadline = deadline.minus({ hours: Math.min(4, Math.floor(stage.slaHours * 0.25)) });
    currentDeadline = deadline;
  }
}

export async function adjustForBusinessHours(date: DateTime, config: ApprovalRoutingConfig): Promise<DateTime> {
  const { start, end, timezone, weekendDays } = config.businessHours;
  let adjusted = date.setZone(timezone);
  
  while (weekendDays.includes(adjusted.weekday)) {
    adjusted = adjusted.plus({ days: 1 }).set({ hour: start, minute: 0, second: 0, millisecond: 0 });
  }
  
  if (adjusted.hour < start) {
    adjusted = adjusted.set({ hour: start, minute: 0, second: 0, millisecond: 0 });
  } else if (adjusted.hour >= end) {
    adjusted = adjusted.plus({ days: 1 }).set({ hour: start, minute: 0, second: 0, millisecond: 0 });
    
    while (weekendDays.includes(adjusted.weekday)) {
      adjusted = adjusted.plus({ days: 1 }).set({ hour: start, minute: 0, second: 0, millisecond: 0 });
    }
  }
  
  return adjusted;
}
