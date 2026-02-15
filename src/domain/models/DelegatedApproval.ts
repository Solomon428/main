export interface DelegatedApproval {
  id: string;
  approvalChainId?: string | null;
  delegatorId: string;
  delegateeId: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  reason?: string | null;
  scope: string;
  specificCategories: string[];
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date | null;
  cancelledBy?: string | null;
  cancelReason?: string | null;
}
