import { z } from "zod";

export const bankDetailsSchema = z.object({
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  swiftCode: z.string().optional(),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  taxId: z.string().optional(),
  registrationNumber: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  paymentTerms: z.number().int().positive().optional(),
  currency: z.string().default("USD"),
  bankDetails: bankDetailsSchema.optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW"),
  notes: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const updateSupplierStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "BLACKLISTED"]),
});

export const supplierFiltersSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "BLACKLISTED"]).optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type UpdateSupplierStatusInput = z.infer<typeof updateSupplierStatusSchema>;
export type SupplierFilters = z.infer<typeof supplierFiltersSchema>;
