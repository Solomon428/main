import { ApprovalRoutingResult } from './types';

export function isValidApprovalRoutingResult(obj: unknown): obj is ApprovalRoutingResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'routingId' in obj &&
    'invoiceId' in obj &&
    'escalationLevel' in obj &&
    'stages' in obj &&
    Array.isArray((obj as any).stages) &&
    'meta' in obj &&
    (obj as any).meta?.saComplianceRules?.sarsApprovalLimitsEnforced === true
  );
}
