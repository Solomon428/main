import { DateTime } from 'luxon';
import {
  ApprovalRoutingInput,
  ApprovalRoutingConfig,
  EscalationLevel,
  ApprovalStage,
  ApprovalStageType,
  ApprovalStatus,
  ApprovalCondition,
  Approver
} from './types';

export function determineStageCount(input: ApprovalRoutingInput, escalationLevel: EscalationLevel, config: ApprovalRoutingConfig): number {
  let baseStages = 1;
  
  switch (escalationLevel) {
    case EscalationLevel.LEVEL_5: baseStages = 5; break;
    case EscalationLevel.LEVEL_4: baseStages = 4; break;
    case EscalationLevel.LEVEL_3: baseStages = 3; break;
    case EscalationLevel.LEVEL_2: baseStages = 2; break;
    default: baseStages = 1;
  }
  
  let additionalStages = 0;
  if (input.totalAmount >= config.escalationThresholds.sarsHoldThreshold) {
    additionalStages += 1;
  }
  
  if (input.riskScore >= 70) additionalStages += 1;
  if (input.supplierRiskRating === 'high' || input.supplierRiskRating === 'critical') additionalStages += 1;
  if (input.duplicateCheckResult?.isDuplicate) additionalStages += 1;
  
  return Math.min(8, baseStages + additionalStages);
}

export async function generateStages(
  input: ApprovalRoutingInput,
  escalationLevel: EscalationLevel,
  totalStages: number,
  routingId: string,
  repositories: {
    approverRepo: {
      findApproversByCriteria: (criteria: any) => Promise<Approver[]>;
    };
  },
  config: ApprovalRoutingConfig
): Promise<ApprovalStage[]> {
  const stages: ApprovalStage[] = [];
  let stageCounter = 1;
  
  if (input.totalAmount >= config.escalationThresholds.sarsHoldThreshold) {
    const sarsApprovers = await repositories.approverRepo.findApproversByCriteria({
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
          value: config.escalationThresholds.sarsHoldThreshold,
          description: `SARS compliance review required for invoices >= R${config.escalationThresholds.sarsHoldThreshold.toLocaleString()}`
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
    const stageType = determineStageType(stageCounter, totalStages, input, escalationLevel);
    const stageEscalationLevel = mapStageToEscalationLevel(stageCounter, totalStages, escalationLevel);
    const minApprovalLimit = calculateMinApprovalLimit(stageCounter, totalStages, input.totalAmount);
    
    const eligibleApprovers = await repositories.approverRepo.findApproversByCriteria({
      escalationLevel: stageEscalationLevel,
      department: input.departmentCode === 'finance' ? undefined : input.departmentCode,
      isActive: true,
      isAvailable: true,
      minApprovalLimit
    });
    
    if (eligibleApprovers.length === 0) {
      throw new Error(`No eligible approvers for stage ${stageCounter}`);
    }
    
    const primaryApprover = eligibleApprovers[0];
    const slaHours = config.slaHoursByLevel[stageEscalationLevel] || 48;
    
    stages.push({
      stageNumber: stageCounter++,
      stageType,
      approverId: primaryApprover.id,
      approver: primaryApprover,
      escalationLevel: stageEscalationLevel,
      minAmount: minApprovalLimit,
      maxAmount: stageCounter > totalStages ? Infinity : calculateMaxApprovalLimit(stageCounter - 1, totalStages, input.totalAmount),
      required: true,
      conditions: generateStageConditions(stageCounter - 1, totalStages, input, stageType),
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

export function determineStageType(
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

export function mapStageToEscalationLevel(
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

export function calculateMinApprovalLimit(stageNum: number, totalStages: number, amount: number): number {
  return (amount * stageNum) / totalStages;
}

export function calculateMaxApprovalLimit(stageNum: number, totalStages: number, amount: number): number {
  return (amount * (stageNum + 1)) / totalStages;
}

export function generateStageConditions(
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
      min: calculateMinApprovalLimit(stageNum, totalStages, input.totalAmount),
      max: stageNum === totalStages ? Infinity : calculateMaxApprovalLimit(stageNum, totalStages, input.totalAmount)
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
