import { prisma } from "@/lib/database/client";
import { Prisma } from "@prisma/client";
import { InvoiceStatus, ApprovalStatus, PriorityLevel } from "@/types";

export interface SearchFilters {
  // Text search
  query?: string;

  // Date filters
  invoiceDateFrom?: Date;
  invoiceDateTo?: Date;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  createdDateFrom?: Date;
  createdDateTo?: Date;

  // Amount filters
  minAmount?: number;
  maxAmount?: number;

  // Status filters
  status?: InvoiceStatus[];
  approvalStatus?: ApprovalStatus[];
  priority?: Priority[];

  // Entity filters
  supplierId?: string[];
  approverId?: string[];
  createdById?: string[];

  // Flags
  isOverdue?: boolean;
  isDuplicate?: boolean;
  requiresAttention?: boolean;
  hasSLABreach?: boolean;
  isEscalated?: boolean;

  // Category/Tags
  category?: string[];
  department?: string[];
  costCenter?: string[];

  // Pagination
  page?: number;
  pageSize?: number;

  // Sorting
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SearchResult {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  supplierId: string;
  status: InvoiceStatus;
  priority: Priority;
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: number;
  currency: string;
  isOverdue: boolean;
  daysOverdue: number;
  currentApproverName?: string;
  approvalStatus?: string;
  matchScore?: number;
  highlightFields: string[];
}

export interface FacetResult {
  field: string;
  values: Array<{
    value: string;
    count: number;
    display: string;
  }>;
}

export class AdvancedSearchService {
  private static readonly searchableFields = [
    "invoiceNumber",
    "purchaseOrderNo",
    "referenceNo",
    "notes",
    "ocrText",
    "supplier.name",
    "lineItems.description",
  ];

  /**
   * Perform advanced search with full-text and filters
   */
  static async search(
    filters: SearchFilters,
    userId?: string,
  ): Promise<{
    results: SearchResult[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    facets: FacetResult[];
  }> {
    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where = this.buildWhereClause(filters);

    // Build order by
    const orderBy = this.buildOrderBy(filters);

    // Execute search
    const [invoices, total] = await Promise.all([
      prisma.invoices.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true },
          },
          currentApprover: {
            select: { id: true, name: true },
          },
          approvals: {
            where: { status: "PENDING" },
            select: { status: true },
            take: 1,
          },
          lineItems: {
            select: { description: true, category: true },
            take: 5,
          },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.invoices.count({ where }),
    ]);

    // Transform results
    const results: SearchResult[] = invoices.map((invoice) => {
      const isOverdue =
        new Date(invoice.dueDate) < new Date() &&
        !["PAID", "CANCELLED"].includes(invoice.status);

      const daysOverdue = isOverdue
        ? Math.floor(
            (Date.now() - new Date(invoice.dueDate).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        supplierName: invoice.supplier?.name || "Unknown",
        supplierId: invoice.supplierId,
        status: invoice.status,
        priority: invoice.priority,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        totalAmount: Number(invoice.totalAmount),
        currency: invoice.currency,
        isOverdue,
        daysOverdue,
        currentApproverName: invoice.currentApprover?.name,
        approvalStatus: invoice.approvals[0]?.status,
        matchScore: this.calculateMatchScore(invoice, filters.query),
        highlightFields: this.getHighlightFields(invoice, filters.query),
      };
    });

    // Generate facets
    const facets = await this.generateFacets(where);

    return {
      results,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      facets,
    };
  }

  /**
   * Quick search for type-ahead
   */
  static async quickSearch(
    query: string,
    limit: number = 10,
  ): Promise<
    Array<{
      id: string;
      type: "invoice" | "supplier" | "po";
      title: string;
      subtitle: string;
      value: string;
    }>
  > {
    const results: Array<{
      id: string;
      type: "invoice" | "supplier" | "po";
      title: string;
      subtitle: string;
      value: string;
    }> = [];

    // Search invoices
    const invoices = await prisma.invoices.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: query, mode: "insensitive" } },
          { purchaseOrderNo: { contains: query, mode: "insensitive" } },
          { referenceNo: { contains: query, mode: "insensitive" } },
        ],
      },
      include: { supplier: { select: { name: true } } },
      take: limit,
    });

    for (const invoice of invoices) {
      results.push({
        id: invoice.id,
        type: "invoice",
        title: invoice.invoiceNumber,
        subtitle: `Invoice from ${invoice.supplier?.name || "Unknown"}`,
        value: invoice.invoiceNumber,
      });
    }

    // Search suppliers
    const suppliers = await prisma.supplier.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
      },
      take: limit,
    });

    for (const supplier of suppliers) {
      results.push({
        id: supplier.id,
        type: "supplier",
        title: supplier.name,
        subtitle: `Supplier (${supplier.category})`,
        value: supplier.name,
      });
    }

    return results.slice(0, limit);
  }

  /**
   * Get saved searches for user
   */
  static async getSavedSearches(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      filters: SearchFilters;
      createdAt: Date;
      lastUsed: Date;
      resultCount: number;
    }>
  > {
    // This would query a saved_searches table
    // For now, return empty array
    return [];
  }

  /**
   * Save search
   */
  static async saveSearch(
    userId: string,
    name: string,
    filters: SearchFilters,
  ): Promise<{ id: string }> {
    // This would save to a saved_searches table
    // For now, just return a mock ID
    return { id: `search_${Date.now()}` };
  }

  /**
   * Export search results
   */
  static async exportResults(
    filters: SearchFilters,
    format: "csv" | "excel" | "pdf",
  ): Promise<{
    data: Buffer | string;
    filename: string;
    contentType: string;
  }> {
    const { results } = await this.search({ ...filters, pageSize: 1000 });

    if (format === "csv") {
      const csv = this.convertToCSV(results);
      return {
        data: csv,
        filename: `invoices_export_${new Date().toISOString().split("T")[0]}.csv`,
        contentType: "text/csv",
      };
    }

    // For other formats, return placeholder
    throw new Error(`Export format ${format} not yet implemented`);
  }

  /**
   * Get search suggestions based on partial query
   */
  static async getSuggestions(
    partialQuery: string,
    field?: string,
  ): Promise<string[]> {
    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }

    const suggestions: string[] = [];

    if (!field || field === "invoiceNumber") {
      const invoices = await prisma.invoices.findMany({
        where: {
          invoiceNumber: { startsWith: partialQuery, mode: "insensitive" },
        },
        select: { invoiceNumber: true },
        take: 5,
        distinct: ["invoiceNumber"],
      });
      suggestions.push(...invoices.map((i) => i.invoiceNumber));
    }

    if (!field || field === "supplier") {
      const suppliers = await prisma.supplier.findMany({
        where: {
          name: { startsWith: partialQuery, mode: "insensitive" },
        },
        select: { name: true },
        take: 5,
      });
      suggestions.push(...suppliers.map((s) => s.name));
    }

    return suggestions;
  }

  // Private helper methods

  private static buildWhereClause(
    filters: SearchFilters,
  ): Prisma.invoicesWhereInput {
    const where: Prisma.invoicesWhereInput = {};

    // Text search
    if (filters.query) {
      const query = filters.query.trim();
      where.OR = [
        { invoiceNumber: { contains: query, mode: "insensitive" } },
        { purchaseOrderNo: { contains: query, mode: "insensitive" } },
        { referenceNo: { contains: query, mode: "insensitive" } },
        { notes: { contains: query, mode: "insensitive" } },
        { ocrText: { contains: query, mode: "insensitive" } },
        { supplier: { name: { contains: query, mode: "insensitive" } } },
        {
          lineItems: {
            some: { description: { contains: query, mode: "insensitive" } },
          },
        },
      ];
    }

    // Date filters
    if (filters.invoiceDateFrom || filters.invoiceDateTo) {
      where.invoiceDate = {};
      if (filters.invoiceDateFrom)
        where.invoiceDate.gte = filters.invoiceDateFrom;
      if (filters.invoiceDateTo) where.invoiceDate.lte = filters.invoiceDateTo;
    }

    if (filters.dueDateFrom || filters.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) where.dueDate.gte = filters.dueDateFrom;
      if (filters.dueDateTo) where.dueDate.lte = filters.dueDateTo;
    }

    if (filters.createdDateFrom || filters.createdDateTo) {
      where.createdAt = {};
      if (filters.createdDateFrom)
        where.createdAt.gte = filters.createdDateFrom;
      if (filters.createdDateTo) where.createdAt.lte = filters.createdDateTo;
    }

    // Amount filters
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      where.totalAmount = {};
      if (filters.minAmount !== undefined) {
        where.totalAmount.gte = new Decimal(filters.minAmount);
      }
      if (filters.maxAmount !== undefined) {
        where.totalAmount.lte = new Decimal(filters.maxAmount);
      }
    }

    // Status filters
    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.priority?.length) {
      where.priority = { in: filters.priority };
    }

    // Entity filters
    if (filters.supplierId?.length) {
      where.supplierId = { in: filters.supplierId };
    }

    if (filters.approverId?.length) {
      where.currentApproverId = { in: filters.approverId };
    }

    // Boolean flags
    if (filters.isDuplicate !== undefined) {
      where.isDuplicate = filters.isDuplicate;
    }

    if (filters.requiresAttention !== undefined) {
      where.requiresAttention = filters.requiresAttention;
    }

    if (filters.isEscalated !== undefined) {
      where.isEscalated = filters.isEscalated;
    }

    // Overdue filter
    if (filters.isOverdue) {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ["PAID", "CANCELLED"] };
    }

    // SLA breach filter
    if (filters.hasSLABreach) {
      where.slaStatus = "BREACHED";
    }

    return where;
  }

  private static buildOrderBy(
    filters: SearchFilters,
  ): Prisma.InvoiceOrderByWithRelationInput {
    const sortBy = filters.sortBy || "createdAt";
    const sortOrder = filters.sortOrder || "desc";

    const validFields: Record<string, string> = {
      invoiceNumber: "invoiceNumber",
      invoiceDate: "invoiceDate",
      dueDate: "dueDate",
      totalAmount: "totalAmount",
      status: "status",
      priority: "priority",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    };

    const field = validFields[sortBy] || "createdAt";

    return { [field]: sortOrder };
  }

  private static calculateMatchScore(invoice: any, query?: string): number {
    if (!query) return 1;

    const queryLower = query.toLowerCase();
    let score = 0;

    // Exact invoice number match
    if (invoice.invoiceNumber.toLowerCase() === queryLower) {
      score += 1.0;
    } else if (invoice.invoiceNumber.toLowerCase().includes(queryLower)) {
      score += 0.8;
    }

    // Supplier name match
    if (invoice.supplier?.name.toLowerCase().includes(queryLower)) {
      score += 0.6;
    }

    // PO number match
    if (invoice.purchaseOrderNo?.toLowerCase().includes(queryLower)) {
      score += 0.7;
    }

    return Math.min(score, 1);
  }

  private static getHighlightFields(invoice: any, query?: string): string[] {
    if (!query) return [];

    const fields: string[] = [];
    const queryLower = query.toLowerCase();

    if (invoice.invoiceNumber.toLowerCase().includes(queryLower)) {
      fields.push("invoiceNumber");
    }

    if (invoice.supplier?.name.toLowerCase().includes(queryLower)) {
      fields.push("supplier");
    }

    if (invoice.purchaseOrderNo?.toLowerCase().includes(queryLower)) {
      fields.push("purchaseOrderNo");
    }

    return fields;
  }

  private static async generateFacets(
    baseWhere: Prisma.invoicesWhereInput,
  ): Promise<FacetResult[]> {
    const facets: FacetResult[] = [];

    // Status facet
    const statusCounts = await prisma.invoices.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { status: true },
    });

    facets.push({
      field: "status",
      values: statusCounts.map((s) => ({
        value: s.status,
        count: s._count.status,
        display: s.status,
      })),
    });

    // Priority facet
    const priorityCounts = await prisma.invoices.groupBy({
      by: ["priority"],
      where: baseWhere,
      _count: { priority: true },
    });

    facets.push({
      field: "priority",
      values: priorityCounts.map((p) => ({
        value: p.priority,
        count: p._count.priority,
        display: p.priority,
      })),
    });

    // Supplier facet (top 10)
    const supplierCounts = await prisma.invoices.groupBy({
      by: ["supplierId"],
      where: baseWhere,
      _count: { supplierId: true },
      orderBy: { _count: { supplierId: "desc" } },
      take: 10,
    });

    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierCounts.map((s) => s.supplierId) } },
      select: { id: true, name: true },
    });

    facets.push({
      field: "supplier",
      values: supplierCounts.map((s) => ({
        value: s.supplierId,
        count: s._count.supplierId,
        display:
          suppliers.find((sup) => sup.id === s.supplierId)?.name || "Unknown",
      })),
    });

    return facets;
  }

  private static convertToCSV(results: SearchResult[]): string {
    const headers = [
      "Invoice Number",
      "Supplier",
      "Status",
      "Priority",
      "Invoice Date",
      "Due Date",
      "Amount",
      "Currency",
      "Overdue",
      "Days Overdue",
    ];

    const rows = results.map((r) => [
      r.invoiceNumber,
      r.supplierName,
      r.status,
      r.priority,
      r.invoiceDate.toISOString().split("T")[0],
      r.dueDate.toISOString().split("T")[0],
      r.totalAmount,
      r.currency,
      r.isOverdue ? "Yes" : "No",
      r.daysOverdue,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }
}
