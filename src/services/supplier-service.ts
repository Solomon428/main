// ============================================================================
// CreditorFlow - Supplier Service
// ============================================================================
// Manages supplier operations:
// - CRUD operations for suppliers
// - Supplier verification and risk assessment
// - Supplier analytics and reporting
// - Bank detail validation
// ============================================================================

import { prisma } from "@/lib/database/client";
import { auditLogger } from "@/lib/utils/audit-logger";
import {
  SupplierStatus,
  RiskLevel,
  EntityType,
  LogSeverity,
  SupplierCategory,
} from "@/types";

export interface CreateSupplierInput {
  name: string;
  tradingName?: string;
  vatNumber?: string;
  registrationNumber?: string;
  email?: string;
  phone?: string;
  physicalAddress?: string;
  bankName?: string;
  branchCode?: string;
  accountNumber?: string;
  accountType?: string;
  paymentTerms?: number;
  category?: SupplierCategory;
  createdById?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  tradingName?: string;
  email?: string;
  phone?: string;
  status?: SupplierStatus;
  riskLevel?: RiskLevel;
  isBlacklisted?: boolean;
  blacklistReason?: string;
}

export class SupplierService {
  /**
   * Create a new supplier
   */
  static async createSupplier(input: CreateSupplierInput) {
    // Check for duplicate VAT number
    if (input.vatNumber) {
      const existing = await prisma.supplier.findFirst({
        where: { vatNumber: input.vatNumber },
      });
      if (existing) {
        return {
          success: false,
          error: `Supplier with VAT number ${input.vatNumber} already exists`,
        };
      }
    }

    // Check for duplicate name
    const existingName = await prisma.supplier.findFirst({
      where: {
        name: {
          equals: input.name,
          mode: "insensitive",
        },
      },
    });
    if (existingName) {
      return {
        success: false,
        error: `Supplier with name "${input.name}" already exists`,
      };
    }

    // Create supplier
    const supplier = await prisma.supplier.create({
      data: {
        name: input.name,
        tradingName: input.tradingName,
        vatNumber: input.vatNumber,
        registrationNumber: input.registrationNumber,
        email: input.email,
        phone: input.phone,
        physicalAddress: input.physicalAddress,
        bankName: input.bankName,
        branchCode: input.branchCode,
        accountNumber: input.accountNumber,
        accountType: input.accountType || "CURRENT",
        paymentTerms: input.paymentTerms || 30,
        category: input.category || "OTHER",
        status: "PENDING_VERIFICATION",
        riskLevel: "MEDIUM",
        country: "South Africa",
      },
    });

    // Log creation
    await auditLogger.log({
      action: "CREATE",
      entityType: EntityType.SUPPLIER,
      entityId: supplier.id,
      entityDescription: `Supplier created: ${input.name}`,
      severity: LogSeverity.INFO,
      userId: input.createdById,
      metadata: { vatNumber: input.vatNumber },
    });

    return {
      success: true,
      supplier,
    };
  }

  /**
   * Get supplier by ID
   */
  static async getSupplier(id: string) {
    return prisma.supplier.findUnique({
      where: { id },
      include: {
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  }

  /**
   * Update supplier
   */
  static async updateSupplier(
    id: string,
    input: UpdateSupplierInput,
    userId?: string,
  ) {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: input,
    });

    await auditLogger.log({
      action: "UPDATE",
      entityType: EntityType.SUPPLIER,
      entityId: id,
      entityDescription: `Supplier updated: ${supplier.name}`,
      severity: LogSeverity.INFO,
      userId,
      metadata: input,
    });

    return supplier;
  }

  /**
   * Get all suppliers with pagination
   */
  static async getSuppliers(
    options: {
      page?: number;
      pageSize?: number;
      status?: SupplierStatus;
      riskLevel?: RiskLevel;
      search?: string;
    } = {},
  ) {
    const { page = 1, pageSize = 20, status, riskLevel, search } = options;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (status) where.status = status;
    if (riskLevel) where.riskLevel = riskLevel;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { vatNumber: { contains: search } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.supplier.count({ where }),
    ]);

    return {
      suppliers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Verify supplier (mark as active)
   */
  static async verifySupplier(id: string, userId: string) {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        status: "ACTIVE",
        verifiedBy: userId,
        verifiedAt: new Date(),
      },
    });

    await auditLogger.log({
      action: "UPDATE",
      entityType: EntityType.SUPPLIER,
      entityId: id,
      entityDescription: `Supplier verified: ${supplier.name}`,
      severity: LogSeverity.INFO,
      userId,
    });

    return supplier;
  }

  /**
   * Blacklist supplier
   */
  static async blacklistSupplier(id: string, reason: string, userId: string) {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        isBlacklisted: true,
        blacklistReason: reason,
        status: "SUSPENDED",
        riskLevel: "CRITICAL",
      },
    });

    await auditLogger.log({
      action: "UPDATE",
      entityType: EntityType.SUPPLIER,
      entityId: id,
      entityDescription: `Supplier blacklisted: ${supplier.name}`,
      severity: LogSeverity.WARNING,
      userId,
      metadata: { reason },
    });

    return supplier;
  }

  /**
   * Get supplier analytics
   */
  static async getSupplierAnalytics(supplierId: string) {
    const [invoices, totalAmount, averageAmount] = await Promise.all([
      prisma.invoice.findMany({
        where: { supplierId },
        orderBy: { invoiceDate: "desc" },
      }),
      prisma.invoice.aggregate({
        where: { supplierId },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { supplierId },
        _avg: { totalAmount: true },
      }),
    ]);

    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((inv) => inv.status === "PAID").length;
    const pendingInvoices = invoices.filter((inv) =>
      ["PENDING_APPROVAL", "UNDER_REVIEW"].includes(inv.status),
    ).length;

    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalAmount: totalAmount._sum.totalAmount || 0,
      averageAmount: averageAmount._avg.totalAmount || 0,
      paymentRate: totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0,
      lastInvoiceDate: invoices[0]?.invoiceDate,
    };
  }

  /**
   * Find supplier by VAT number
   */
  static async findByVAT(vatNumber: string) {
    return prisma.supplier.findFirst({
      where: { vatNumber },
    });
  }

  /**
   * Find or create supplier (used during invoice upload)
   */
  static async findOrCreate(
    name: string,
    vatNumber: string | null | undefined,
    userId: string,
  ) {
    // Try to find existing supplier
    let supplier = await prisma.supplier.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          ...(vatNumber ? [{ vatNumber }] : []),
        ],
      },
    });

    if (supplier) {
      return { supplier, isNew: false };
    }

    // Create new supplier
    const result = await this.createSupplier({
      name,
      vatNumber: vatNumber || undefined,
      createdById: userId,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return { supplier: result.supplier, isNew: true };
  }
}

export default SupplierService;
