export interface InvoiceComment {
  id: string;
  invoiceId: string;
  userId?: string | null;
  userName?: string | null;
  content: string;
  isInternal: boolean;
  isSystemGenerated: boolean;
  isPinned: boolean;
  parentId?: string | null;
  mentions: string[];
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
