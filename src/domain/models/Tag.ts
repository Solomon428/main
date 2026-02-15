export interface Tag {
  id: string;
  organizationId: string;
  name: string;
  color: string;
  description?: string | null;
  entityTypes: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
