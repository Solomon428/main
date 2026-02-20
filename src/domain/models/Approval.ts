import { ApprovalStatus } from "../enums/ApprovalStatus";
import { ApprovalDecision } from "../enums/ApprovalDecision";

export interface Approval {
  id: string;
  invoiceId: string;
  approvalChainId?: string | null;
  approverId: string;
  level: number;
  sequence: number;
  status: ApprovalStatus;
  decision?: ApprovalDecision | null;
  decisionNotes?: string | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  isDelegated: boolean;
  delegatedFromId?: string | null;
  delegatedToId?: string | null;
  delegatedAt?: Date | null;
  delegationReason?: string | null;
  isEscalated: boolean;
  escalatedAt?: Date | null;
  escalatedReason?: string | null;
  escalatedToId?: string | null;
  slaDueDate: Date;
  slaBreachDate?: Date | null;
  reminderSentAt?: Date | null;
  escalationSentAt?: Date | null;
  assignedAt: Date;
  viewedAt?: Date | null;
  actionedAt?: Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: string | null;
  geoLocation?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}
