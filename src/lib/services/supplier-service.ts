import { BaseService } from "./base-service";
import type { Supplier, SupplierStatus } from "@prisma/client";

export interface CreateSupplierInput {
  name: string;
  code?: string;
  taxId?: string;
  registrationNumber?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  paymentTerms?: number;
  currency?: string;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    swiftCode?: string;
  };
  riskLevel?: string;
  notes?: string;
}

export interface SupplierFilters {
  status?: string;
  search?: string;
  riskLevel?: string;
}

export class SupplierService extends BaseService {
  async create(data: CreateSupplierInput) {
    const orgId = this.requireOrg();
    const userId = this.requireUser();

    const supplier = await this.prisma.supplier.create({
      data: {
        ...data,
        organizationId: orgId,
        status: "ACTIVE",
      } as any,
    });

    await this.audit("CREATE", "Supplier", supplier.id, { name: data.name });

    return supplier;
  }

  async findAll(filters: SupplierFilters = {}, page = 1, limit = 20) {
    const orgId = this.requireOrg();

    const where: any = {
      organizationId: orgId,
      ...(filters.status && { status: filters.status }),
      ...(filters.riskLevel && { riskLevel: filters.riskLevel }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
          { code: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
    };

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      suppliers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const orgId = this.requireOrg();

    const supplier = await this.prisma.supplier.findFirst({
      where: { id, organizationId: orgId },
      include: {
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
            dueDate: true,
          },
        },
        _count: {
          select: { invoices: true },
        },
      },
    });

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    return supplier;
  }

  async update(id: string, data: Partial<CreateSupplierInput>) {
    const orgId = this.requireOrg();

    const supplier = await this.prisma.supplier.update({
      where: { id, organizationId: orgId },
      data: data as any,
    });

    await this.audit("UPDATE", "Supplier", id, data);

    return supplier;
  }

  async updateStatus(id: string, status: SupplierStatus) {
    const orgId = this.requireOrg();

    const supplier = await this.prisma.supplier.update({
      where: { id, organizationId: orgId },
      data: {
        status,
      } as any,
    });

    await this.audit("UPDATE_STATUS", "Supplier", id, { status });

    return supplier;
  }

  async delete(id: string) {
    const orgId = this.requireOrg();

    const invoiceCount = await this.prisma.invoice.count({
      where: { supplierId: id, organizationId: orgId },
    });

    if (invoiceCount > 0) {
      throw new Error("Cannot delete supplier with existing invoices");
    }

    await this.prisma.supplier.delete({
      where: { id, organizationId: orgId },
    });

    await this.audit("DELETE", "Supplier", id, {});

    return { success: true };
  }

  async getStats() {
    const orgId = this.requireOrg();

    const [totalCount, activeCount, inactiveCount, highRiskCount] =
      await Promise.all([
        this.prisma.supplier.count({ where: { organizationId: orgId } }),
        this.prisma.supplier.count({
          where: { organizationId: orgId, status: "ACTIVE" },
        }),
        this.prisma.supplier.count({
          where: { organizationId: orgId, status: "INACTIVE" },
        }),
        this.prisma.supplier.count({
          where: { organizationId: orgId, riskLevel: "HIGH" },
        }),
      ]);

    return {
      totalCount,
      activeCount,
      inactiveCount,
      highRiskCount,
    };
  }
}
