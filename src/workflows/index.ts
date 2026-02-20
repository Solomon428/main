// ============================================================================
// CreditorFlow - Workflows Index
// ============================================================================
// Exports all workflow modules for easy importing
// ============================================================================

export { ApprovalWorkflow } from "./approval-workflow";
export { EscalationWorkflow } from "./escalation-workflow";
export { PaymentWorkflow } from "./payment-workflow";

// Re-export types
export type {
  WorkflowInitiationResult,
  WorkflowAdvanceResult,
  WorkflowRejectionResult,
} from "./approval-workflow";
export type { EscalationResult } from "./escalation-workflow";
export type { PaymentBatchInput, PaymentBatchResult } from "./payment-workflow";
