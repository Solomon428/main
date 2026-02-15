export interface SupplierContact {
  id: string;
  supplierId: string;
  name: string;
  title?: string | null;
  department?: string | null;
  email: string;
  phone?: string | null;
  mobile?: string | null;
  isPrimary: boolean;
  isAccountsContact: boolean;
  isTechnicalContact: boolean;
  isEmergencyContact: boolean;
  isActive: boolean;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
