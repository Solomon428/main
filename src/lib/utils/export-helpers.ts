/**
 * Export Helpers
 * CreditorFlow Enterprise Invoice Management System
 */

import { formatCurrency, formatDate } from "./formatting";

// Local type definitions to avoid importing from @prisma/client
interface InvoiceWithRelations {
  id: string;
  invoiceNumber: string;
  supplier: {
    name: string;
    vatNumber?: string | null;
  };
  supplierName?: string | null;
  invoiceDate: Date | string;
  dueDate: Date | string;
  subtotalExclVAT: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  priority: string;
  createdAt: Date | string;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    glAccount?: string | null;
    costCenter?: string | null;
    category?: string | null;
  }[];
  approvals: {
    approverId: string;
    status: string;
    level: number;
    comments?: string | null;
    createdAt: Date | string;
    completedAt?: Date | string | null;
  }[];
}

interface CSVExportOptions {
  includeHeaders: boolean;
  delimiter: string;
  dateFormat: string;
}

const DEFAULT_CSV_OPTIONS: CSVExportOptions = {
  includeHeaders: true,
  delimiter: ",",
  dateFormat: "YYYY-MM-DD",
};

/**
 * Escape CSV field value
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Generate CSV content from invoices
 */
export function generateInvoiceCSV(
  invoices: InvoiceWithRelations[],
  options: Partial<CSVExportOptions> = {},
): string {
  const opts = { ...DEFAULT_CSV_OPTIONS, ...options };
  const rows: string[] = [];

  const headers = [
    "Invoice Number",
    "Supplier Name",
    "Supplier VAT Number",
    "Invoice Date",
    "Due Date",
    "Subtotal",
    "VAT Amount",
    "Total Amount",
    "Currency",
    "Status",
    "Priority",
    "Created At",
  ];

  if (opts.includeHeaders) {
    rows.push(headers.join(opts.delimiter));
  }

  for (const invoice of invoices) {
    const row = [
      escapeCSVField(invoice.invoiceNumber),
      escapeCSVField(invoice.supplier.name),
      escapeCSVField(invoice.supplier.vatNumber),
      escapeCSVField(formatDate(invoice.invoiceDate)),
      escapeCSVField(formatDate(invoice.dueDate)),
      escapeCSVField(Number(invoice.subtotalExclVAT).toFixed(2)),
      escapeCSVField(Number(invoice.vatAmount).toFixed(2)),
      escapeCSVField(Number(invoice.totalAmount).toFixed(2)),
      escapeCSVField(invoice.currency),
      escapeCSVField(invoice.status),
      escapeCSVField(invoice.priority),
      escapeCSVField(formatDate(invoice.createdAt)),
    ];

    rows.push(row.join(opts.delimiter));
  }

  return rows.join("\n");
}

/**
 * Generate line items CSV
 */
export function generateLineItemsCSV(
  invoices: InvoiceWithRelations[],
  options: Partial<CSVExportOptions> = {},
): string {
  const opts = { ...DEFAULT_CSV_OPTIONS, ...options };
  const rows: string[] = [];

  const headers = [
    "Invoice Number",
    "Description",
    "Quantity",
    "Unit Price",
    "Total",
    "GL Account",
    "Cost Center",
    "Category",
  ];

  if (opts.includeHeaders) {
    rows.push(headers.join(opts.delimiter));
  }

  for (const invoice of invoices) {
    for (const item of invoice.lineItems) {
      const row = [
        escapeCSVField(invoice.invoiceNumber),
        escapeCSVField(item.description),
        escapeCSVField(Number(item.quantity).toFixed(2)),
        escapeCSVField(Number(item.unitPrice).toFixed(2)),
        escapeCSVField(Number(item.total).toFixed(2)),
        escapeCSVField(item.glAccount || ""),
        escapeCSVField(item.costCenter || ""),
        escapeCSVField(item.category || ""),
      ];

      rows.push(row.join(opts.delimiter));
    }
  }

  return rows.join("\n");
}

/**
 * Generate approvals CSV
 */
export function generateApprovalsCSV(
  invoices: InvoiceWithRelations[],
  options: Partial<CSVExportOptions> = {},
): string {
  const opts = { ...DEFAULT_CSV_OPTIONS, ...options };
  const rows: string[] = [];

  const headers = [
    "Invoice Number",
    "Approver",
    "Status",
    "Level",
    "Comments",
    "Created At",
    "Completed At",
  ];

  if (opts.includeHeaders) {
    rows.push(headers.join(opts.delimiter));
  }

  for (const invoice of invoices) {
    for (const approval of invoice.approvals) {
      const row = [
        escapeCSVField(invoice.invoiceNumber),
        escapeCSVField(approval.approverId),
        escapeCSVField(approval.status),
        escapeCSVField(approval.level),
        escapeCSVField(approval.comments || ""),
        escapeCSVField(formatDate(approval.createdAt)),
        escapeCSVField(
          approval.completedAt ? formatDate(approval.completedAt) : "",
        ),
      ];

      rows.push(row.join(opts.delimiter));
    }
  }

  return rows.join("\n");
}

/**
 * Create downloadable blob from CSV content
 */
export function createCSVBlob(content: string): Blob {
  return new Blob([content], { type: "text/csv;charset=utf-8;" });
}

/**
 * Generate filename with timestamp
 */
export function generateExportFilename(
  prefix: string,
  extension: string = "csv",
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * Convert data to JSON export format
 */
export function generateJSONExport(
  invoices: InvoiceWithRelations[],
  includeLineItems: boolean = true,
  includeApprovals: boolean = true,
): string {
  const data = invoices.map((invoice) => ({
    invoiceNumber: invoice.invoiceNumber,
    supplier: {
      name: invoice.supplier.name,
      vatNumber: invoice.supplier.vatNumber,
    },
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    subtotal: Number(invoice.subtotalExclVAT),
    vatAmount: Number(invoice.vatAmount),
    totalAmount: Number(invoice.totalAmount),
    currency: invoice.currency,
    status: invoice.status,
    priority: invoice.priority,
    ...(includeLineItems && {
      lineItems: invoice.lineItems.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
        glAccount: item.glAccount,
        costCenter: item.costCenter,
        category: item.category,
      })),
    }),
    ...(includeApprovals && {
      approvals: invoice.approvals.map((approval) => ({
        status: approval.status,
        level: approval.level,
        comments: approval.comments,
        createdAt: approval.createdAt,
        completedAt: approval.completedAt,
      })),
    }),
  }));

  return JSON.stringify(data, null, 2);
}
