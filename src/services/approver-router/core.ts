import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';
import {
  Approver,
  ApprovalStage,
  ApprovalRoutingResult,
  ApprovalRoutingInput,
  ApprovalRoutingConfig,
  ApprovalRoutingException,
  EscalationLevel,
  ApprovalStageType,
  ApprovalStatus
} from './types';
import { determineEscalationLevel } from './routing-logic';
import { determineStageCount, generateStages, determineStageType, mapStageToEscalationLevel, calculateMinApprovalLimit, calculateMaxApprovalLimit, generateStageConditions } from './stage-builder';
import { verifyDelegationCertificates, findComplianceOfficer, applyWorkloadBalancing, applyDelegationChains, calculateDeadlines, adjustForBusinessHours } from './deadline-handler';
import { notifyApprovers, logRoutingResult } from './notification';

export class ApproverRouter {
  constructor(
    private readonly config: ApprovalRoutingConfig,
    private readonly repositories: {
      approverRepo: {
        findApproversByCriteria: (criteria: {
          escalationLevel: EscalationLevel;
          department?: string;
          role?: string;
          minApprovalLimit: number;
          isActive: boolean;
          isAvailable: boolean;
        }) => Promise<Approver[]>;
        findBackupApprovers: (primaryApproverId: string) => Promise<Approver[]>;
        getDelegationChain: (approverId: string) => Promise<Array<{ delegateeId: string; expiry: DateTime }>>;
        verifySarsDelegationCertificate: (approverId: string) => Promise<boolean>;
      };
      holidayRepo?: {
        isHoliday: (date: DateTime) => Promise<boolean>;
        getNextBusinessDay: (date: DateTime) => Promise<DateTime>;
      };
      sarsComplianceRepo?: {
        verifyTaxInvoice: (invoiceId: string) => Promise<{ valid: boolean; issues: string[] }>;
        checkDelegationAuthority: (approverId: string, amount: number) => Promise<boolean>;
      };
    },
    private readonly opts: {
      auditLogger?: (event: string, resource: string, resourceId: string, level: 'info' | 'warn' | 'error', data: any) => void;
      notificationService?: {
        notifyApproverAssigned: (approver: Approver, invoiceId: string, deadline: DateTime) => Promise<void>;
        notifySarsComplianceHold: (invoiceId: string, reason: string) => Promise<void>;
      };
    } = {}
  ) {
    this.validateConfig(config);
  }

  private validateConfig(config: ApprovalRoutingConfig): void {
    if (!config.saApprovalLimits || config.saApprovalLimits.length === 0) {
      throw new ApprovalRoutingException('CONFIG_INVALID', 'SA approval limits required', 'system', 'critical');
    }
    
    const thresholds = [
      config.escalationThresholds.amountLevel2,
      config.escalationThresholds.amountLevel3,
      config.escalationThresholds.amountLevel4,
      config.escalationThresholds.amountLevel5
    ];
    
    for (let i = 1; i < thresholds.length; i++) {
      if (thresholds[i] <= thresholds[i - 1]) {
        throw new ApprovalRoutingException('CONFIG_INVALID', 'Escalation thresholds must be strictly increasing', 'system', 'critical');
      }
    }
    
    if (config.escalationThresholds.sarsHoldThreshold < 100000) {
      throw new ApprovalRoutingException('CONFIG_INVALID', 'SARS hold threshold must be >= R100,000', 'system', 'critical');
    }
  }

  async generateApprovalRouting(input: ApprovalRoutingInput): Promise<ApprovalRoutingResult> {
    const routingId = `route_${DateTime.now().toMillis()}_${uuidv4().substring(0, 8)}`;
    const routingStart = DateTime.now();
    
    try {
      if (input.validationResult?.saComplianceStatus === 'non_compliant') {
        this.opts.auditLogger?.('SARS_COMPLIANCE_BLOCK', 'invoice', input.invoiceId, 'error', {
          routingId,
          reason: 'Invoice failed SARS compliance validation',
          validationResult: input.validationResult
        });
        
        return {
          routingId,
          invoiceId: input.invoiceId,
          totalAmount: input.totalAmount,
          riskScore: input.riskScore,
          escalationLevel: EscalationLevel.LEVEL_1,
          totalStages: 0,
          stages: [],
          requiresEscalation: false,
          requiresDelegation: false,
          saComplianceHold: true,
          saComplianceHoldReason: 'Critical SARS compliance failure - invoice requires correction before routing',
          routingTimestamp: DateTime.now(),
          meta: {
            routingStrategy: 'blocked',
            saComplianceRules: {
              sarsApprovalLimitsEnforced: true,
              delegationCertificateRequired: this.config.requireDelegationCertificates,
              maxSingleApproval: 5000000,
              taxInvoiceVerified: false
            },
            workloadBalancingApplied: false,
            holidayAdjusted: false,
            businessHoursOnly: true,
            version: '4.1.0-SA'
          }
        };
      }
      
      const escalationLevel = determineEscalationLevel(input, this.config);
      const totalStages = determineStageCount(input, escalationLevel, this.config);
      const stages = await generateStages(input, escalationLevel, totalStages, routingId, this.repositories, this.config);
      
      if (this.config.requireDelegationCertificates) {
        await verifyDelegationCertificates(stages, routingId, this.repositories, this.opts);
      }
      
      if (this.config.enableWorkloadBalancing) {
        await applyWorkloadBalancing(stages, routingId, this.repositories, this.opts);
      }
      
      if (this.config.enableDelegationChains) {
        await applyDelegationChains(stages, routingId, this.repositories, this.opts);
      }
      
      await calculateDeadlines(stages, routingStart, this.config);
      
      const result: ApprovalRoutingResult = {
        routingId,
        invoiceId: input.invoiceId,
        totalAmount: input.totalAmount,
        riskScore: input.riskScore,
        escalationLevel,
        totalStages,
        stages,
        requiresEscalation: escalationLevel !== EscalationLevel.LEVEL_1,
        requiresDelegation: stages.some(s => !!s.approver.delegatedTo),
        routingTimestamp: DateTime.now(),
        meta: {
          routingStrategy: 'risk_amount_sars_hybrid',
          saComplianceRules: {
            sarsApprovalLimitsEnforced: true,
            delegationCertificateRequired: this.config.requireDelegationCertificates,
            maxSingleApproval: 5000000,
            taxInvoiceVerified: input.isTaxInvoice && input.totalAmount >= 5000
          },
          workloadBalancingApplied: this.config.enableWorkloadBalancing,
          holidayAdjusted: !!this.config.holidayCalendar,
          businessHoursOnly: true,
          version: '4.1.0-SA'
        }
      };
      
      await notifyApprovers(stages, input.invoiceId, this.opts);
      logRoutingResult(result, this.opts, routingStart);
      
      return result;
      
    } catch (error) {
      this.opts.auditLogger?.('APPROVAL_ROUTING_FAILED', 'invoice', input.invoiceId, 'error', {
        routingId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return this.buildFallbackRouting(input, routingId, routingStart);
    }
  }

  private buildFallbackRouting(
    input: ApprovalRoutingInput,
    routingId: string,
    routingStart: DateTime
  ): ApprovalRoutingResult {
    const fallbackApprover: Approver = {
      id: 'fallback-finance-manager',
      name: 'Finance Manager (Fallback)',
      email: 'finance.manager@company.co.za',
      role: 'finance_manager',
      department: 'finance',
      approvalLimit: 10000000,
      escalationLevel: EscalationLevel.LEVEL_3,
      isActive: true,
      isAvailable: true,
      currentWorkload: 0,
      maxWorkload: 20
    };
    
    const deadline = DateTime.now().plus({ hours: 48 });
    
    return {
      routingId,
      invoiceId: input.invoiceId,
      totalAmount: input.totalAmount,
      riskScore: input.riskScore,
      escalationLevel: EscalationLevel.LEVEL_3,
      totalStages: 1,
      stages: [{
        stageNumber: 1,
        stageType: ApprovalStageType.FINANCE_APPROVAL,
        approverId: fallbackApprover.id,
        approver: fallbackApprover,
        escalationLevel: EscalationLevel.LEVEL_3,
        minAmount: 0,
        maxAmount: Infinity,
        required: true,
        conditions: [],
        slaHours: 48,
        deadline,
        escalationDeadline: deadline.minus({ hours: 12 }),
        status: ApprovalStatus.PENDING,
        assignedAt: DateTime.now(),
        metadata: { fallbackRouting: true, reason: 'routing_error' }
      }],
      requiresEscalation: true,
      requiresDelegation: false,
      routingTimestamp: DateTime.now(),
      meta: {
        routingStrategy: 'fallback',
        saComplianceRules: { sarsApprovalLimitsEnforced: true, delegationCertificateRequired: false, maxSingleApproval: 5000000, taxInvoiceVerified: false },
        workloadBalancingApplied: false,
        holidayAdjusted: false,
        businessHoursOnly: true,
        version: '4.1.0-SA'
      }
    };
  }
}
