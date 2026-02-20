import { SupplierStatus } from "../enums/SupplierStatus";
import { SupplierCategory } from "../enums/SupplierCategory";
import { RiskLevel } from "../enums/RiskLevel";
import { ComplianceStatus } from "../enums/ComplianceStatus";
import { BankAccountType } from "../enums/BankAccountType";
import { Currency } from "../enums/Currency";

export interface Supplier {
  id: string;
  organizationId: string;
  supplierCode?: string | null;
  name: string;
  legalName?: string | null;
  tradingName?: string | null;
  taxId?: string | null;
  vatNumber?: string | null;
  registrationNumber?: string | null;
  companyNumber?: string | null;
  status: SupplierStatus;
  category: SupplierCategory;
  subCategory?: string | null;
  industry?: string | null;
  riskLevel: RiskLevel;
  riskScore?: unknown | null; // Decimal
  complianceStatus: ComplianceStatus;
  contactPerson?: Record<string, unknown> | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  accountsContactName?: string | null;
  accountsContactEmail?: string | null;
  accountsContactPhone?: string | null;
  billingAddress?: Record<string, unknown> | null;
  shippingAddress?: Record<string, unknown> | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  countryCode: string;
  bankDetails?: Record<string, unknown> | null;
  bankName?: string | null;
  bankCode?: string | null;
  branchName?: string | null;
  branchCode?: string | null;
  accountNumber?: string | null;
  accountType: BankAccountType;
  swiftCode?: string | null;
  iban?: string | null;
  routingNumber?: string | null;
  beneficiaryName?: string | null;
  paymentTerms: number;
  creditLimit?: unknown | null; // Decimal
  creditTerms?: string | null;
  earlyPaymentDiscount?: unknown | null; // Decimal
  discountDays?: number | null;
  currency: Currency;
  totalTransactions: number;
  totalInvoices: number;
  totalAmount: unknown; // Decimal
  totalPaid: unknown; // Decimal
  totalOutstanding: unknown; // Decimal
  averageInvoiceAmount?: unknown | null; // Decimal
  averagePaymentDays?: number | null;
  lastInvoiceDate?: Date | null;
  lastPaymentDate?: Date | null;
  isActive: boolean;
  isPreferred: boolean;
  isVerified: boolean;
  isWhitelisted: boolean;
  isBlacklisted: boolean;
  blacklistedAt?: Date | null;
  blacklistedBy?: string | null;
  blacklistReason?: string | null;
  onHold: boolean;
  holdReason?: string | null;
  verifiedAt?: Date | null;
  verifiedBy?: string | null;
  onboardingCompletedAt?: Date | null;
  notes?: string | null;
  internalNotes?: string | null;
  tags: string[];
  customFields?: Record<string, unknown> | null;
  externalId?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
