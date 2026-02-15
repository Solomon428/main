import { BaseService } from "./base-service";
import type { Invoice, InvoiceLineItem, Supplier } from "@prisma/client";

export interface CreateInvoiceInput {
  invoiceNumber: string;
  supplierId: string;
  issueDate: Date;
  dueDate: Date;
  totalAmount: number;
  currency?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
  }>;
  notes?: string;
}

export interface InvoiceFilters {
  status?: string;
  supplierId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface InvoiceWithSupplier extends Invoice {
  supplier: Supplier;
}

export class InvoiceService extends BaseService {
  async create(data: CreateInvoiceInput) {
    const orgId = this.requireOrg();
    const userId = this.requireUser();

    const calculatedLineItems = data.lineItems.map((item) => {
      const subtotal = item.quantity * item.unitPrice;
      const taxAmount = subtotal * (item.taxRate || 0) / 100;
      return {
        ...item,
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
      };
    });

    const subtotal = calculatedLineItems.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = calculatedLineItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const total = subtotal + taxAmount;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        organizationId: orgId,
        supplierId: data.supplierId,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        totalAmount: total,
        currency: data.currency || "USD",
        status: "PENDING",
        lineItems: {
          create: calculatedLineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            taxRate: item.taxRate || 0,
            taxAmount: item.taxAmount,
            total: item.total,
          })),
        },
        notes: data.notes,
        createdById: userId,
        updatedById: userId,
      },
      include: {
        supplier: true,
        lineItems: true,
      },
    });

    await this.audit("CREATE", "Invoice", invoice.id, { invoiceNumber: data.invoiceNumber });

    return invoice;
  }

  async findAll(filters: InvoiceFilters = {}, page = 1, limit = 20) {
    const orgId = this.requireOrg();

    const where: any = {
      organizationId: orgId,
      ...(filters.status && { status: filters.status }),
      ...(filters.supplierId && { supplierId: filters.supplierId }),
      ...(filters.dateFrom && filters.dateTo && {
        issueDate: {
          gte: filters.dateFrom,
          lte: filters.dateTo,
        },
      }),
      ...(filters.search && {
        OR: [
          { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
          { supplier: { name: { contains: filters.search, mode: "insensitive" } } },
        ],
      }),
    };

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          supplier: true,
          lineItems: {
            select: {
              id: true,
              description: true,
              quantity: true,
              unitPrice: true,
              total: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { invoices, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const orgId = this.requireOrg();

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: {
        supplier: true,
        lineItems: true,
        approvals: {
          include: {
            approver: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    return invoice;
  }

  async updateStatus(id: string, status: string, notes?: string) {
    const orgId = this.requireOrg();
    const userId = this.requireUser();

    const invoice = await this.prisma.invoice.update({
      where: { id, organizationId: orgId },
      data: {
        status,
        notes: notes || undefined,
        updatedById: userId,
      },
    });

    await this.audit("UPDATE_STATUS", "Invoice", id, { status, notes });

    return invoice;
  }

  async delete(id: string) {
    const orgId = this.requireOrg();

    await this.prisma.invoice.delete({
      where: { id, organizationId: orgId },
    });

    await this.audit("DELETE", "Invoice", id, {});

    return { success: true };
  }

  async updateFileInfo(id: string, fileData: {
    fileUrl: string;
    fileName: string | null;
    fileType: string | null;
    fileSize: number | null;
  }) {
    const orgId = this.requireOrg();

    const invoice = await this.prisma.invoice.update({
      where: { id, organizationId: orgId },
      data: {
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName,
        fileType: fileData.fileType,
        fileSize: fileData.fileSize,
      },
    });

    return invoice;
  }

  async getStats() {
    const orgId = this.requireOrg();

    const [
      totalCount,
      pendingCount,
      approvedCount,
      paidCount,
      totalAmount,
      outstandingAmount,
    ] = await Promise.all([
      this.prisma.invoice.count({ where: { organizationId: orgId } }),
      this.prisma.invoice.count({ where: { organizationId: orgId, status: "PENDING" } }),
      this.prisma.invoice.count({ where: { organizationId: orgId, status: "APPROVED" } }),
      this.prisma.invoice.count({ where: { organizationId: orgId, status: "PAID" } }),
      this.prisma.invoice.aggregate({
        where: { organizationId: orgId },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { organizationId: orgId, status: { in: ["PENDING", "APPROVED"] } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalCount,
      pendingCount,
      approvedCount,
      paidCount,
      totalAmount: totalAmount._sum.totalAmount || 0,
      outstandingAmount: outstandingAmount._sum.totalAmount || 0,
    };
  }
}
