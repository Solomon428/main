import { z } from "zod";

export const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().positive("Unit price must be positive"),
  taxRate: z.number().min(0).max(100).optional(),
});

export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  supplierId: z.string().uuid("Invalid supplier ID"),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  totalAmount: z.number().positive("Total amount must be positive"),
  currency: z.string().default("USD"),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "At least one line item is required"),
  notes: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  status: z.enum([
    "PENDING",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "PAID",
    "CANCELLED",
    "DISPUTED",
  ]),
  notes: z.string().optional(),
});

export const invoiceFiltersSchema = z.object({
  status: z
    .enum([
      "PENDING",
      "UNDER_REVIEW",
      "APPROVED",
      "REJECTED",
      "PAID",
      "CANCELLED",
      "DISPUTED",
    ])
    .optional(),
  supplierId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceFilters = z.infer<typeof invoiceFiltersSchema>;
