export interface SystemSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  defaultValue?: Record<string, unknown> | null;
  description?: string | null;
  category: string;
  dataType: string;
  isEncrypted: boolean;
  isEditable: boolean;
  isVisible: boolean;
  requiresRestart: boolean;
  updatedBy?: string | null;
  updatedAt: Date;
  createdAt: Date;
}
