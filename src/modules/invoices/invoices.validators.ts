import { z } from "zod";
import { InvoiceStatus } from "../../domain/enums/InvoiceStatus";
import { Currency } from "../../enums/Currency";
import { PaymentMethod } from "../../domain/enums/PaymentMethod";

const decimalSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === "string" ? parseFloat(val) : val));

export const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  productCode: z.string().optional(),
  sku: z.string().optional(),
  quantity: decimalSchema.default(1),
  unitPrice: decimalSchema,
  unitOfMeasure: z.string().default("EA"),
  vatRate: decimalSchema.default(15),
  glCode: z.string().optional(),
  costCenter: z.string().optional(),
  projectCode: z.string().optional(),
  department: z.string().optional(),
  budgetCategory: z.string().optional(),
});

export const createInvoiceSchema = z.object({
  supplierId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  referenceNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  contractNumber: z.string().optional(),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  currency: z.nativeEnum(Currency).default(Currency.ZAR),
  exchangeRate: decimalSchema.optional(),
  subtotalExclVAT: decimalSchema.default(0),
  vatRate: decimalSchema.default(15),
  vatAmount: decimalSchema.default(0),
  totalAmount: decimalSchema,
  discountAmount: decimalSchema.default(0),
  shippingAmount: decimalSchema.default(0),
  paymentTerms: z.number().int().default(30),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  glCode: z.string().optional(),
  costCenter: z.string().optional(),
  projectCode: z.string().optional(),
  department: z.string().optional(),
  budgetCategory: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isUrgent: z.boolean().default(false),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "At least one line item is required"),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export const approveInvoiceSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  notes: z.string().optional(),
});

export const bulkInvoiceActionSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).min(1),
  action: z.enum(["APPROVE", "REJECT", "DELETE", "EXPORT"]),
  notes: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type ApproveInvoiceInput = z.infer<typeof approveInvoiceSchema>;
export type BulkInvoiceActionInput = z.infer<typeof bulkInvoiceActionSchema>;
