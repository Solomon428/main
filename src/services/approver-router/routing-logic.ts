import { ApprovalRoutingInput, ApprovalRoutingConfig, EscalationLevel } from './types';

export function determineEscalationLevel(input: ApprovalRoutingInput, config: ApprovalRoutingConfig): EscalationLevel {
  const amount = input.totalAmount;
  const risk = input.riskScore;
  
  if (amount > config.escalationThresholds.amountLevel5) return EscalationLevel.LEVEL_5;
  if (amount > config.escalationThresholds.amountLevel4) return EscalationLevel.LEVEL_4;
  if (amount > config.escalationThresholds.amountLevel3) return EscalationLevel.LEVEL_3;
  if (amount > config.escalationThresholds.amountLevel2) return EscalationLevel.LEVEL_2;
  
  if (risk >= config.escalationThresholds.riskCritical) return EscalationLevel.LEVEL_4;
  if (risk >= config.escalationThresholds.riskHigh) {
    return amount > config.escalationThresholds.amountLevel2 
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
