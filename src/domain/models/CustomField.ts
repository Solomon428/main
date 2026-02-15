import { EntityType } from '../enums/EntityType';

export interface CustomField {
  id: string;
  organizationId: string;
  entityType: EntityType;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  options?: Record<string, unknown> | null;
  defaultValue?: string | null;
  isRequired: boolean;
  isActive: boolean;
  order: number;
  validation?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}
