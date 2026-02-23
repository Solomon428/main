import { prisma } from "@/lib/database/client";
import {
  InvoiceStatus,
  ApprovalStatus,
  ApprovalDecision,
  EntityType,
  LogSeverity,
} from "@/types";
import { auditLogger } from "@/lib/utils/audit-logger";

export interface BulkApproveInput {
  invoiceIds: string[];
  approverId: string;
  comments?: string;
}

export interface BulkRejectInput {
  invoiceIds: string[];
  approverId: string;
  reason: string;
}

export interface BulkUpdateStatusInput {
  invoiceIds: string[];
  status: InvoiceStatus;
  userId: string;
  reason?: string;
}

export interface BulkExportInput {
  invoiceIds: string[];
  format: "csv" | "excel" | "pdf";
  includeLineItems: boolean;
  includeApprovals: boolean;
}

export interface BulkAssignInput {
  invoiceIds: string[];
  approverId: string;
  assignedById: string;
}

export interface BulkOperationResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    invoiceId: string;
    error: string;
  }>;
  results: Array<{
    invoiceId: string;
    success: boolean;
    message?: string;
  }>;
}

export class BulkOperationsService {
  /**
   * Bulk approve invoices
   */
  static async bulkApprove(
    input: BulkApproveInput,
  ): Promise<BulkOperationResult> {
    const results: BulkOperationResult["results"] = [];
    const errors: BulkOperationResult["errors"] = [];

    for (const invoiceId of input.invoiceIds) {
      try {
        // Check if user has approval authority
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: { approvals: { where: { status: "PENDING" } } },
        });

        if (!invoice) {
          errors.push({ invoiceId, error: "Invoice not found" });
          continue;
        }

        if (invoice.approvals.length === 0) {
          errors.push({ invoiceId, error: "No pending approval found" });
          continue;
        }

        // Update approval
        await prisma.approval.update({
          where: { id: invoice.approvals[0].id },
          data: {
            decision: Decision.APPROVE,
            actionedAt: new Date(),
            comments: input.comments,
            status: ApprovalStatus.APPROVED,
          },
        });

        // Update invoice status if final approval
        const remainingApprovals = await prisma.approval.count({
          where: { invoiceId, status: "PENDING" },
        });

        if (remainingApprovals === 0) {
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
              status: InvoiceStatus.APPROVED,
              approvedDate: new Date(),
            },
          });
        }

        // Log audit
        await auditLogger.log({
          action: "APPROVE",
          entityType: EntityType.INVOICE,
          entityId: invoiceId,
          severity: LogSeverity.INFO,
          userId: input.approverId,
          metadata: { bulkOperation: true, comments: input.comments },
        });

        results.push({
          invoiceId,
          success: true,
          message: "Approved successfully",
        });
      } catch (error) {
        errors.push({
          invoiceId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      total: input.invoiceIds.length,
      successful: results.filter((r) => r.success).length,
      failed: errors.length,
      errors,
      results,
    };
  }

  /**
   * Bulk reject invoices
   */
  static async bulkReject(
    input: BulkRejectInput,
  ): Promise<BulkOperationResult> {
    const results: BulkOperationResult["results"] = [];
    const errors: BulkOperationResult["errors"] = [];

    for (const invoiceId of input.invoiceIds) {
      try {
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: { approvals: { where: { status: "PENDING" } } },
        });

        if (!invoice) {
          errors.push({ invoiceId, error: "Invoice not found" });
          continue;
        }

        // Update all pending approvals to rejected
        if (invoice.approvals.length > 0) {
          await prisma.approval.updateMany({
            where: { invoiceId, status: "PENDING" },
            data: {
              decision: Decision.REJECT,
              actionedAt: new Date(),
              comments: input.reason,
              status: ApprovalStatus.REJECTED,
            },
          });
        }

        // Update invoice status
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: InvoiceStatus.REJECTED,
            rejectionReason: input.reason,
          },
        });

        // Log audit
        await auditLogger.log({
          action: "REJECT",
          entityType: EntityType.INVOICE,
          entityId: invoiceId,
          severity: LogSeverity.WARNING,
          userId: input.approverId,
          metadata: { bulkOperation: true, reason: input.reason },
        });

        results.push({
          invoiceId,
          success: true,
          message: "Rejected successfully",
        });
      } catch (error) {
        errors.push({
          invoiceId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      total: input.invoiceIds.length,
      successful: results.filter((r) => r.success).length,
      failed: errors.length,
      errors,
      results,
    };
  }

  /**
   * Bulk update invoice status
   */
  static async bulkUpdateStatus(
    input: BulkUpdateStatusInput,
  ): Promise<BulkOperationResult> {
    const results: BulkOperationResult["results"] = [];
    const errors: BulkOperationResult["errors"] = [];

    for (const invoiceId of input.invoiceIds) {
      try {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: input.status,
            notes: input.reason
              ? { push: `Status changed to ${input.status}: ${input.reason}` }
              : undefined,
          },
        });

        // Log audit
        await auditLogger.log({
          action: "UPDATE",
          entityType: EntityType.INVOICE,
          entityId: invoiceId,
          severity: LogSeverity.INFO,
          userId: input.userId,
          metadata: {
            bulkOperation: true,
            newStatus: input.status,
            reason: input.reason,
          },
        });

        results.push({
          invoiceId,
          success: true,
          message: `Status updated to ${input.status}`,
        });
      } catch (error) {
        errors.push({
          invoiceId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      total: input.invoiceIds.length,
      successful: results.filter((r) => r.success).length,
      failed: errors.length,
      errors,
      results,
    };
  }

  /**
   * Bulk assign invoices to approver
   */
  static async bulkAssign(
    input: BulkAssignInput,
  ): Promise<BulkOperationResult> {
    const results: BulkOperationResult["results"] = [];
    const errors: BulkOperationResult["errors"] = [];

    // Verify approver exists and is active
    const approver = await prisma.user.findUnique({
      where: { id: input.approverId },
      select: { id: true, name: true, isActive: true },
    });

    if (!approver || !approver.isActive) {
      return {
        total: input.invoiceIds.length,
        successful: 0,
        failed: input.invoiceIds.length,
        errors: input.invoiceIds.map((id) => ({
          invoiceId: id,
          error: "Approver not found or inactive",
        })),
        results: [],
      };
    }

    for (const invoiceId of input.invoiceIds) {
      try {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            currentApproverId: input.approverId,
          },
        });

        // Create approval record
        await prisma.approval.create({
          data: {
            invoiceId,
            approverId: input.approverId,
            stage: 1,
            approverRole: "CREDIT_CLERK",
            approverLimit: 100000,
            slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

        // Log audit
        await auditLogger.log({
          action: "UPDATE",
          entityType: EntityType.INVOICE,
          entityId: invoiceId,
          severity: LogSeverity.INFO,
          userId: input.assignedById,
          metadata: {
            bulkOperation: true,
            assignedTo: input.approverId,
            assignedToName: approver.name,
          },
        });

        results.push({
          invoiceId,
          success: true,
          message: `Assigned to ${approver.name}`,
        });
      } catch (error) {
        errors.push({
          invoiceId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      total: input.invoiceIds.length,
      successful: results.filter((r) => r.success).length,
      failed: errors.length,
      errors,
      results,
    };
  }

  /**
   * Bulk export invoices
   */
  static async bulkExport(input: BulkExportInput): Promise<{
    data: string;
    filename: string;
    contentType: string;
  }> {
    // Fetch invoices with all requested data
    const invoices = await prisma.invoice.findMany({
      where: { id: { in: input.invoiceIds } },
      include: {
        lineItems: input.includeLineItems,
        approvals: input.includeApprovals,
      },
    });

    switch (input.format) {
      case "csv":
        return this.exportToCSV(invoices, input);
      case "excel":
        return this.exportToExcel(invoices, input);
      case "pdf":
        return this.exportToPDF(invoices, input);
      default:
        throw new Error(`Unsupported format: ${input.format}`);
    }
  }

  /**
   * Get bulk operation preview
   */
  static async getBulkOperationPreview(invoiceIds: string[]): Promise<{
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      supplierName: string;
      totalAmount: number;
      currency: string;
      status: string;
      currentApproverName?: string;
    }>;
    totalAmount: number;
    byStatus: Record<string, number>;
    byCurrency: Record<string, number>;
  }> {
    const invoices = await prisma.invoice.findMany({
      where: { id: { in: invoiceIds } },
      include: {
        supplier: { select: { name: true } },
        currentApprover: { select: { name: true } },
      },
    });

    const byStatus: Record<string, number> = {};
    const byCurrency: Record<string, number> = {};
    let totalAmount = 0;

    for (const invoice of invoices) {
      // Count by status
      byStatus[invoice.status] = (byStatus[invoice.status] || 0) + 1;

      // Count by currency
      byCurrency[invoice.currency] = (byCurrency[invoice.currency] || 0) + 1;

      // Sum amounts (convert to base currency if needed)
      totalAmount += Number(invoice.totalAmount);
    }

    return {
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        supplierName: inv.supplier?.name || "Unknown",
        totalAmount: Number(inv.totalAmount),
        currency: inv.currency,
        status: inv.status,
        currentApproverName: inv.currentApprover?.name,
      })),
      totalAmount,
      byStatus,
      byCurrency,
    };
  }

  // Private export methods

  private static exportToCSV(
    invoices: any[],
    input: BulkExportInput,
  ): { data: string; filename: string; contentType: string } {
    const headers = [
      "Invoice Number",
      "Supplier",
      "Invoice Date",
      "Due Date",
      "Total Amount",
      "Currency",
      "Status",
      "Priority",
      "Current Approver",
    ];

    if (input.includeLineItems) {
      headers.push("Line Items Count");
    }

    if (input.includeApprovals) {
      headers.push("Approval Count");
    }

    const rows = invoices.map((inv) => {
      const row = [
        inv.invoiceNumber,
        inv.supplier?.name || "Unknown",
        inv.invoiceDate.toISOString().split("T")[0],
        inv.dueDate.toISOString().split("T")[0],
        inv.totalAmount.toString(),
        inv.currency,
        inv.status,
        inv.priority,
        inv.currentApprover?.name || "Unassigned",
      ];

      if (input.includeLineItems) {
        row.push(inv.lineItems?.length || 0);
      }

      if (input.includeApprovals) {
        row.push(inv.approvals?.length || 0);
      }

      return row;
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return {
      data: csv,
      filename: `invoices_export_${new Date().toISOString().split("T")[0]}.csv`,
      contentType: "text/csv",
    };
  }

  private static exportToExcel(
    invoices: any[],
    input: BulkExportInput,
  ): { data: string; filename: string; contentType: string } {
    // For now, return CSV format
    // In production, use a library like xlsx
    return this.exportToCSV(invoices, input);
  }

  private static exportToPDF(
    invoices: any[],
    input: BulkExportInput,
  ): { data: string; filename: string; contentType: string } {
    // For now, return CSV format
    // In production, use a library like pdfkit
    return this.exportToCSV(invoices, input);
  }
}
