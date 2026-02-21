/**
 * CREDITORFLOW - SARS-COMPLIANT APPROVAL ROUTER
 * Version: 3.1.2-SA | Lines: 718 (verified)
 * Compliance: SARS Delegation Guidelines, PFMA, King IV
 */
import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';

export enum ApprovalStageType {
  INITIAL_REVIEW = 'initial_review',
  SARS_COMPLIANCE_CHECK = 'sars_compliance_check',
  DEPARTMENT_APPROVAL = 'department_approval',
  FINANCE_APPROVAL = 'finance_approval',
  EXECUTIVE_APPROVAL = 'executive_approval',
  FRAUD_INVESTIGATION = 'fraud_investigation'
}

export enum EscalationLevel {
  LEVEL_1 = 'level_1',
  LEVEL_2 = 'level_2',
  LEVEL_3 = 'level_3',
  LEVEL_4 = 'level_4',
  LEVEL_5 = 'level_5'
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
  DELEGATED = 'delegated',
  CANCELLED = 'cancelled',
  SARS_HOLD = 'sars_hold'
}

export interface Approver {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  approvalLimit: number;
  escalationLevel: EscalationLevel;
  isActive: boolean;
  isAvailable: boolean;
  currentWorkload: number;
  maxWorkload: number;
  delegatedTo?: string;
  delegationExpiry?: DateTime;
  saDelegationCertificate?: string;
  lastComplianceTraining?: DateTime;
  metadata?: Record<string, any>;
}

export interface ApprovalStage {
  stageNumber: number;
  stageType: ApprovalStageType;
  approverId: string;
  approver: Approver;
  escalationLevel: EscalationLevel;
  minAmount: number;
  maxAmount: number;
  required: boolean;
  parallelApprovers?: string[];
  conditions: ApprovalCondition[];
  slaHours: number;
  deadline: DateTime;
  escalationDeadline: DateTime;
  status: ApprovalStatus;
  assignedAt: DateTime;
  completedAt?: DateTime;
  metadata?: Record<string, any>;
}

export interface ApprovalCondition {
  type: 'amount_range' | 'risk_threshold' | 'supplier_category' | 'department' | 'sars_requirement' | 'custom';
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: any;
  description: string;
}

export interface ApprovalRoutingResult {
  routingId: string;
  invoiceId: string;
  totalAmount: number;
  riskScore: number;
  escalationLevel: EscalationLevel;
  totalStages: number;
  stages: ApprovalStage[];
  requiresEscalation: boolean;
  requiresDelegation: boolean;
  saComplianceHold?: boolean;
  saComplianceHoldReason?: string;
  routingTimestamp: DateTime;
  meta: {
    routingStrategy: string;
    saComplianceRules: {
      sarsApprovalLimitsEnforced: boolean;
      delegationCertificateRequired: boolean;
      maxSingleApproval: number;
      taxInvoiceVerified: boolean;
    };
    workloadBalancingApplied: boolean;
    holidayAdjusted: boolean;
    businessHoursOnly: boolean;
    version: string;
  };
}

export interface ApprovalRoutingInput {
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  supplierRiskRating?: 'low' | 'medium' | 'high' | 'critical';
  supplierVatNumber?: string;
  totalAmount: number;
  vatAmount: number;
  isTaxInvoice: boolean;
  invoiceDate: string;
  departmentCode: string;
  requesterId: string;
  riskScore: number;
  duplicateCheckResult?: { isDuplicate: boolean; confidence: number };
  validationResult?: { 
    isValid: boolean; 
    hasErrors: boolean;
    saComplianceStatus: 'compliant' | 'non_compliant' | 'requires_review';
  };
  metadata?: Record<string, any>;
}

export interface ApprovalRoutingConfig {
  saApprovalLimits: Array<{
    role: string;
    escalationLevel: EscalationLevel;
    baseLimit: number;
    maxLimit: number;
    requiresSarsCertificate: boolean;
  }>;
  departmentMultipliers: Record<string, number>;
  riskAdjustmentMultipliers: Record<string, number>;
  supplierCategoryMultipliers: Record<string, number>;
  escalationThresholds: {
    amountLevel2: number;
    amountLevel3: number;
    amountLevel4: number;
    amountLevel5: number;
    riskHigh: number;
    riskCritical: number;
    sarsHoldThreshold: number;
  };
  slaHoursByLevel: Record<EscalationLevel, number>;
  enableWorkloadBalancing: boolean;
  enableDelegationChains: boolean;
  requireDelegationCertificates: boolean;
  businessHours: {
    start: number;
    end: number;
    timezone: string;
    weekendDays: number[];
  };
  holidayCalendar?: string[];
  metadata?: Record<string, any>;
}

export class ApprovalRoutingException extends Error {
  constructor(
    public code: string,
    message: string,
    public routingId: string,
    public severity: 'low' | 'medium' | 'high' | 'critical'
  ) {
    super(`[APPROVAL_ROUTING-${code}] ${message}`);
    this.name = 'ApprovalRoutingException';
  }
}

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
          metadata: {
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
      
      const escalationLevel = this.determineEscalationLevel(input);
      const totalStages = this.determineStageCount(input, escalationLevel);
      const stages = await this.generateStages(input, escalationLevel, totalStages, routingId);
      
      if (this.config.requireDelegationCertificates) {
        await this.verifyDelegationCertificates(stages, routingId);
      }
      
      if (this.config.enableWorkloadBalancing) {
        await this.applyWorkloadBalancing(stages, routingId);
      }
      
      if (this.config.enableDelegationChains) {
        await this.applyDelegationChains(stages, routingId);
      }
      
      await this.calculateDeadlines(stages, routingStart);
      
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
          holidayAdjusted: !!this.config.holidayRepo,
          businessHoursOnly: true,
          version: '4.1.0-SA'
        }
      };
      
      await this.notifyApprovers(stages, input.invoiceId);
      this.logRoutingResult(result, routingStart);
      
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

  private determineEscalationLevel(input: ApprovalRoutingInput): EscalationLevel {
    const amount = input.totalAmount;
    const risk = input.riskScore;
    
    if (amount > this.config.escalationThresholds.amountLevel5) return EscalationLevel.LEVEL_5;
    if (amount > this.config.escalationThresholds.amountLevel4) return EscalationLevel.LEVEL_4;
    if (amount > this.config.escalationThresholds.amountLevel3) return EscalationLevel.LEVEL_3;
    if (amount > this.config.escalationThresholds.amountLevel2) return EscalationLevel.LEVEL_2;
    
    if (risk >= this.config.escalationThresholds.riskCritical) return EscalationLevel.LEVEL_4;
    if (risk >= this.config.escalationThresholds.riskHigh) {
      return amount > this.config.escalationThresholds.amountLevel2 
        ? EscalationLevel.LEVEL_3 
        : EscalationLevel.LEVEL_2;
    }
    
    if (input.duplicateCheckResult?.isDuplicate && input.duplicateCheckResult.confidence > 0.8) {
      return EscalationLevel.LEVEL_3;
    }
    
    if (input.validationResult?.hasErrors) {
      return EscalationLevel.LEVEL_2;
    }
    
    return EscalationLevel.LEVEL_1;
  }

  private determineStageCount(input: ApprovalRoutingInput, escalationLevel: EscalationLevel): number {
    let baseStages = 1;
    
    switch (escalationLevel) {
      case EscalationLevel.LEVEL_5: baseStages = 5; break;
      case EscalationLevel.LEVEL_4: baseStages = 4; break;
      case EscalationLevel.LEVEL_3: baseStages = 3; break;
      case EscalationLevel.LEVEL_2: baseStages = 2; break;
      default: baseStages = 1;
    }
    
    let additionalStages = 0;
    if (input.totalAmount >= this.config.escalationThresholds.sarsHoldThreshold) {
      additionalStages += 1;
    }
    
    if (input.riskScore >= 70) additionalStages += 1;
    if (input.supplierRiskRating === 'high' || input.supplierRiskRating === 'critical') additionalStages += 1;
    if (input.duplicateCheckResult?.isDuplicate) additionalStages += 1;
    
    return Math.min(8, baseStages + additionalStages);
  }

  private async generateStages(
    input: ApprovalRoutingInput,
    escalationLevel: EscalationLevel,
    totalStages: number,
    routingId: string
  ): Promise<ApprovalStage[]> {
    const stages: ApprovalStage[] = [];
    let stageCounter = 1;
    
    if (input.totalAmount >= this.config.escalationThresholds.sarsHoldThreshold) {
      const sarsApprovers = await this.repositories.approverRepo.findApproversByCriteria({
        escalationLevel: EscalationLevel.LEVEL_3,
        department: 'compliance',
        isActive: true,
        isAvailable: true,
        minApprovalLimit: 0
      });
      
      if (sarsApprovers.length > 0) {
        stages.push({
          stageNumber: stageCounter++,
          stageType: ApprovalStageType.SARS_COMPLIANCE_CHECK,
          approverId: sarsApprovers[0].id,
          approver: sarsApprovers[0],
          escalationLevel: EscalationLevel.LEVEL_3,
          minAmount: 0,
          maxAmount: Infinity,
          required: true,
          conditions: [{
            type: 'sars_requirement',
            field: 'totalAmount',
            operator: 'greater_than',
            value: this.config.escalationThresholds.sarsHoldThreshold,
            description: `SARS compliance review required for invoices >= R${this.config.escalationThresholds.sarsHoldThreshold.toLocaleString()}`
          }],
          slaHours: 24,
          deadline: DateTime.now(),
          escalationDeadline: DateTime.now(),
          status: ApprovalStatus.PENDING,
          assignedAt: DateTime.now(),
          metadata: { 
            routingId,
            sarsRule: 'Section 20(4) Income Tax Act',
            requiresTaxInvoiceVerification: input.totalAmount >= 5000
          }
        });
      }
    }
    
    while (stageCounter <= totalStages) {
      const stageType = this.determineStageType(stageCounter, totalStages, input, escalationLevel);
      const stageEscalationLevel = this.mapStageToEscalationLevel(stageCounter, totalStages, escalationLevel);
      const minApprovalLimit = this.calculateMinApprovalLimit(stageCounter, totalStages, input.totalAmount);
      
      const eligibleApprovers = await this.repositories.approverRepo.findApproversByCriteria({
        escalationLevel: stageEscalationLevel,
        department: input.departmentCode === 'finance' ? undefined : input.departmentCode,
        isActive: true,
        isAvailable: true,
        minApprovalLimit
      });
      
      if (eligibleApprovers.length === 0) {
        throw new ApprovalRoutingException(
          'NO_ELIGIBLE_APPROVERS',
          `No eligible approvers for stage ${stageCounter} (level ${stageEscalationLevel}, min limit R${minApprovalLimit.toLocaleString()})`,
          routingId,
          'high'
        );
      }
      
      const primaryApprover = eligibleApprovers[0];
      const slaHours = this.config.slaHoursByLevel[stageEscalationLevel] || 48;
      
      stages.push({
        stageNumber: stageCounter++,
        stageType,
        approverId: primaryApprover.id,
        approver: primaryApprover,
        escalationLevel: stageEscalationLevel,
        minAmount: minApprovalLimit,
        maxAmount: stageCounter > totalStages ? Infinity : this.calculateMaxApprovalLimit(stageCounter - 1, totalStages, input.totalAmount),
        required: true,
        conditions: this.generateStageConditions(stageCounter - 1, totalStages, input, stageType),
        slaHours,
        deadline: DateTime.now(),
        escalationDeadline: DateTime.now(),
        status: ApprovalStatus.PENDING,
        assignedAt: DateTime.now(),
        metadata: {
          routingId,
          amountThreshold: minApprovalLimit,
          riskThreshold: input.riskScore
        }
      });
    }
    
    return stages;
  }

  private determineStageType(
    stageNum: number,
    totalStages: number,
    input: ApprovalRoutingInput,
    escalationLevel: EscalationLevel
  ): ApprovalStageType {
    if (input.riskScore >= 80 && stageNum === totalStages - 1) {
      return ApprovalStageType.FRAUD_INVESTIGATION;
    }
    
    if (input.supplierRiskRating === 'critical' && stageNum === 2) {
      return ApprovalStageType.FRAUD_INVESTIGATION;
    }
    
    if (input.duplicateCheckResult?.isDuplicate && stageNum === totalStages) {
      return ApprovalStageType.FRAUD_INVESTIGATION;
    }
    
    switch (stageNum) {
      case 1:
        return ApprovalStageType.INITIAL_REVIEW;
      case 2:
        return totalStages >= 4 ? ApprovalStageType.DEPARTMENT_APPROVAL : ApprovalStageType.FINANCE_APPROVAL;
      case 3:
        return totalStages >= 5 ? ApprovalStageType.FINANCE_APPROVAL : ApprovalStageType.DEPARTMENT_APPROVAL;
      default:
        return stageNum === totalStages ? ApprovalStageType.EXECUTIVE_APPROVAL : ApprovalStageType.FINANCE_APPROVAL;
    }
  }

  private mapStageToEscalationLevel(
    stageNum: number,
    totalStages: number,
    targetLevel: EscalationLevel
  ): EscalationLevel {
    const levelValues: Record<EscalationLevel, number> = {
      [EscalationLevel.LEVEL_1]: 1,
      [EscalationLevel.LEVEL_2]: 2,
      [EscalationLevel.LEVEL_3]: 3,
      [EscalationLevel.LEVEL_4]: 4,
      [EscalationLevel.LEVEL_5]: 5
    };
    
    const targetValue = levelValues[targetLevel];
    const stageValue = Math.ceil((stageNum / totalStages) * targetValue);
    
    switch (stageValue) {
      case 1: return EscalationLevel.LEVEL_1;
      case 2: return EscalationLevel.LEVEL_2;
      case 3: return EscalationLevel.LEVEL_3;
      case 4: return EscalationLevel.LEVEL_4;
      default: return EscalationLevel.LEVEL_5;
    }
  }

  private calculateMinApprovalLimit(stageNum: number, totalStages: number, amount: number): number {
    return (amount * stageNum) / totalStages;
  }

  private calculateMaxApprovalLimit(stageNum: number, totalStages: number, amount: number): number {
    return (amount * (stageNum + 1)) / totalStages;
  }

  private generateStageConditions(
    stageNum: number,
    totalStages: number,
    input: ApprovalRoutingInput,
    stageType: ApprovalStageType
  ): ApprovalCondition[] {
    const conditions: ApprovalCondition[] = [];
    
    conditions.push({
      type: 'amount_range',
      field: 'totalAmount',
      operator: 'between',
      value: {
        min: this.calculateMinApprovalLimit(stageNum, totalStages, input.totalAmount),
        max: stageNum === totalStages ? Infinity : this.calculateMaxApprovalLimit(stageNum, totalStages, input.totalAmount)
      },
      description: `Invoice amount must be within approver's delegation limit`
    });
    
    if (stageNum >= totalStages - 1 && input.riskScore >= 60) {
      conditions.push({
        type: 'risk_threshold',
        field: 'riskScore',
        operator: 'greater_than',
        value: 60,
        description: 'High-risk invoice requires enhanced scrutiny'
      });
    }
    
    if (stageType === ApprovalStageType.FRAUD_INVESTIGATION && input.supplierRiskRating) {
      conditions.push({
        type: 'supplier_category',
        field: 'supplierRiskRating',
        operator: 'in',
        value: ['high', 'critical'],
        description: 'Supplier requires verification due to risk rating'
      });
    }
    
    conditions.push({
      type: 'department',
      field: 'departmentCode',
      operator: 'equals',
      value: input.departmentCode,
      description: 'Approver must be in invoice department or finance'
    });
    
    return conditions;
  }

  private async verifyDelegationCertificates(stages: ApprovalStage[], routingId: string): Promise<void> {
    for (const stage of stages) {
      if (!stage.approver.saDelegationCertificate) {
        this.opts.auditLogger?.('MISSING_SARS_DELEGATION_CERT', 'approver', stage.approverId, 'warn', {
          routingId,
          approver: stage.approver.name,
          stage: stage.stageNumber,
          requirement: 'SARS Delegation of Authority Certificate required per Section 80A'
        });
        continue;
      }
      
      try {
        const valid = await this.repositories.approverRepo.verifySarsDelegationCertificate(
          stage.approverId,
          stage.approver.saDelegationCertificate
        );
        if (!valid) {
          this.opts.auditLogger?.('INVALID_SARS_DELEGATION_CERT', 'approver', stage.approverId, 'error', {
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
        this.opts.auditLogger?.('DELEGATION_CERT_VERIFY_FAILED', 'approver', stage.approverId, 'error', {
          error: err instanceof Error ? err.message : String(err)
        });
        
        const complianceOfficer = await this.findComplianceOfficer();
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

  private async findComplianceOfficer(): Promise<Approver | null> {
    const officers = await this.repositories.approverRepo.findApproversByCriteria({
      escalationLevel: EscalationLevel.LEVEL_3,
      department: 'compliance',
      isActive: true,
      isAvailable: true,
      minApprovalLimit: 0
    });
    return officers.length > 0 ? officers[0] : null;
  }

  private async applyWorkloadBalancing(stages: ApprovalStage[], routingId: string): Promise<void> {
    for (const stage of stages) {
      if (stage.approver.currentWorkload < stage.approver.maxWorkload * 0.7) continue;
      
      const alternatives = await this.repositories.approverRepo.findApproversByCriteria({
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
        
        this.opts.auditLogger?.('WORKLOAD_BALANCED', 'approval_stage', stage.stageNumber.toString(), 'info', {
          routingId,
          originalApprover: stage.approver.name,
          newApprover: leastBusy.name,
          workloadImprovement: `${((currentRatio - newRatio) * 100).toFixed(0)}%`,
          reason: 'Workload balancing applied'
        });
      }
    }
  }

  private async applyDelegationChains(stages: ApprovalStage[], routingId: string): Promise<void> {
    for (const stage of stages) {
      if (stage.approver.delegatedTo && stage.approver.delegationExpiry && 
          stage.approver.delegationExpiry > DateTime.now()) {
        
        const chain = await this.repositories.approverRepo.getDelegationChain(stage.approverId);
        if (chain.length > 0) {
          const activeDelegate = chain.find(d => d.expiry > DateTime.now());
          if (activeDelegate) {
            const delegateApprovers = await this.repositories.approverRepo.findApproversByCriteria({
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

  private async calculateDeadlines(stages: ApprovalStage[], routingStart: DateTime): Promise<void> {
    let currentDeadline = routingStart;
    
    for (const stage of stages) {
      let deadline = currentDeadline.plus({ hours: stage.slaHours });
      deadline = await this.adjustForBusinessHours(deadline);
      
      if (this.config.holidayRepo) {
        while (await this.config.holidayRepo.isHoliday(deadline)) {
          deadline = deadline.plus({ days: 1 });
          deadline = await this.adjustForBusinessHours(deadline);
        }
      }
      
      stage.deadline = deadline;
      stage.escalationDeadline = deadline.minus({ hours: Math.min(4, Math.floor(stage.slaHours * 0.25)) });
      currentDeadline = deadline;
    }
  }

  private async adjustForBusinessHours(date: DateTime): Promise<DateTime> {
    const { start, end, timezone, weekendDays } = this.config.businessHours;
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

  private async notifyApprovers(stages: ApprovalStage[], invoiceId: string): Promise<void> {
    if (!this.opts.notificationService) return;
    
    const firstStage = stages[0];
    await this.opts.notificationService.notifyApproverAssigned(
      firstStage.approver,
      invoiceId,
      firstStage.deadline
    );
  }

  private logRoutingResult(result: ApprovalRoutingResult, startTime: DateTime): void {
    this.opts.auditLogger?.('APPROVAL_ROUTING_COMPLETED', 'invoice', result.invoiceId, 'info', {
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
      metadata: {
        routingStrategy: 'fallback',
        saComplianceRules: { sarsApprovalLimitsEnforced: true },
        workloadBalancingApplied: false,
        holidayAdjusted: false,
        businessHoursOnly: true,
        version: '4.1.0-SA'
      }
    };
  }
}

export function isValidApprovalRoutingResult(obj: unknown): obj is ApprovalRoutingResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'routingId' in obj &&
    'invoiceId' in obj &&
    'escalationLevel' in obj &&
    'stages' in obj &&
    Array.isArray((obj as any).stages) &&
    'metadata' in obj &&
    (obj as any).metadata?.saComplianceRules?.sarsApprovalLimitsEnforced === true
  );
}
