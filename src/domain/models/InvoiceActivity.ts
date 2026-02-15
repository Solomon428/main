export interface InvoiceActivity {
  id: string;
  invoiceId: string;
  actorId?: string | null;
  actorType: string;
  actorName?: string | null;
  action: string;
  description?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}
