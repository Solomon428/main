import { z } from "zod";
import { SupplierStatus } from "../../domain/enums/SupplierStatus";
import { SupplierCategory } from "../../domain/enums/SupplierCategory";
import { RiskLevel } from "../../domain/enums/RiskLevel";
import { ComplianceStatus } from "../../domain/enums/ComplianceStatus";
import { BankAccountType } from "../../domain/enums/BankAccountType";
import { Currency } from "../../domain/enums/Currency";

const decimalSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === "string" ? parseFloat(val) : val));

export const contactPersonSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
});

export const addressSchema = z.object({
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  state: z.string().optional(),
  postalCode: z.string(),
  country: z.string().default("South Africa"),
});

export const bankDetailsSchema = z.object({
  accountName: z.string(),
  accountNumber: z.string(),
  bankName: z.string(),
  bankCode: z.string().optional(),
  branchName: z.string().optional(),
  branchCode: z.string().optional(),
  swiftCode: z.string().optional(),
  iban: z.string().optional(),
  currency: z.nativeEnum(Currency).default(Currency.ZAR),
  accountType: z.nativeEnum(BankAccountType).default(BankAccountType.CURRENT),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  legalName: z.string().optional(),
  tradingName: z.string().optional(),
  taxId: z.string().optional(),
  vatNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  companyNumber: z.string().optional(),
  category: z.nativeEnum(SupplierCategory).default(SupplierCategory.SERVICES),
  subCategory: z.string().optional(),
  industry: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().optional(),
  accountsContactName: z.string().optional(),
  accountsContactEmail: z.string().email().optional(),
  accountsContactPhone: z.string().optional(),
  contactPerson: contactPersonSchema.optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("South Africa"),
  countryCode: z.string().default("ZA"),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  bankName: z.string().optional(),
  bankCode: z.string().optional(),
  branchName: z.string().optional(),
  branchCode: z.string().optional(),
  accountNumber: z.string().optional(),
  accountType: z.nativeEnum(BankAccountType).default(BankAccountType.CURRENT),
  swiftCode: z.string().optional(),
  iban: z.string().optional(),
  routingNumber: z.string().optional(),
  beneficiaryName: z.string().optional(),
  bankDetails: bankDetailsSchema.optional(),
  paymentTerms: z.number().int().default(30),
  creditLimit: decimalSchema.optional(),
  creditTerms: z.string().optional(),
  earlyPaymentDiscount: decimalSchema.optional(),
  discountDays: z.number().int().optional(),
  currency: z.nativeEnum(Currency).default(Currency.ZAR),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.unknown()).optional(),
  externalId: z.string().optional(),
  source: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const supplierContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  isPrimary: z.boolean().default(false),
  isAccountsContact: z.boolean().default(false),
  isTechnicalContact: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  notes: z.string().optional(),
});

export const supplierBankAccountSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  bankName: z.string().min(1, "Bank name is required"),
  bankCode: z.string().optional(),
  branchName: z.string().optional(),
  branchCode: z.string().optional(),
  swiftCode: z.string().optional(),
  iban: z.string().optional(),
  currency: z.nativeEnum(Currency).default(Currency.ZAR),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional(),
});

export const supplierContractSchema = z.object({
  contractNumber: z.string().optional(),
  contractType: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  value: decimalSchema.optional(),
  terms: z.string().optional(),
  paymentTerms: z.number().int().optional(),
  autoRenew: z.boolean().default(false),
  renewalNoticeDays: z.number().int().default(30),
  documentUrl: z.string().optional(),
});

export const supplierVerificationSchema = z.object({
  status: z.nativeEnum(SupplierStatus),
  notes: z.string().optional(),
});

export const supplierBlacklistSchema = z.object({
  isBlacklisted: z.boolean(),
  reason: z.string().optional(),
});

export const listSuppliersQuerySchema = z.object({
  status: z.nativeEnum(SupplierStatus).optional(),
  category: z.nativeEnum(SupplierCategory).optional(),
  riskLevel: z.nativeEnum(RiskLevel).optional(),
  complianceStatus: z.nativeEnum(ComplianceStatus).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isPreferred: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type SupplierContactInput = z.infer<typeof supplierContactSchema>;
export type SupplierBankAccountInput = z.infer<
  typeof supplierBankAccountSchema
>;
export type SupplierContractInput = z.infer<typeof supplierContractSchema>;
export type SupplierVerificationInput = z.infer<
  typeof supplierVerificationSchema
>;
export type SupplierBlacklistInput = z.infer<typeof supplierBlacklistSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
