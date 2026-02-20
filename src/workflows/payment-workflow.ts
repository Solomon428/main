// ============================================================================
// CreditorFlow - Payment Workflow
// ============================================================================
// Manages payment processing:
// - Payment batch creation
// - Payment scheduling
// - Payment execution tracking
// - Payment reconciliation
// ============================================================================

import { prisma } from "@/lib/database/client";
import { NotificationService } from "@/services/notification-service";
import { auditLogger } from "@/lib/utils/audit-logger";
import {
  InvoiceStatus,
  PaymentMethod,
  BatchStatus,
  EntityType,
  LogSeverity,
} from "@/types";

export interface PaymentBatchInput {
  invoiceIds: string[];
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  bankAccount: string;
  createdById: string;
}

export interface PaymentBatchResult {
  success: boolean;
  batchId?: string;
  batchNumber?: string;
  totalAmount: number;
  invoiceCount: number;
  errors: string[];
}

export class PaymentWorkflow {
  /**
   * Create a payment batch
   */
  static async createPaymentBatch(
    input: PaymentBatchInput,
  ): Promise<PaymentBatchResult> {
    const { invoiceIds, paymentDate, paymentMethod, bankAccount, createdById } =
      input;
    const errors: string[] = [];

    // Validate invoices
    const invoices = await prisma.invoices.findMany({
      where: {
        id: { in: invoiceIds },
        status: InvoiceStatus.READY_FOR_PAYMENT,
      },
    });

    if (invoices.length !== invoiceIds.length) {
      const foundIds = invoices.map((inv) => inv.id);
      const missingIds = invoiceIds.filter((id) => !foundIds.includes(id));
      errors.push(
        `Invoices not found or not ready for payment: ${missingIds.join(", ")}`,
      );
    }

    if (invoices.length === 0) {
      return {
        success: false,
        totalAmount: 0,
        invoiceCount: 0,
        errors: [...errors, "No valid invoices for payment batch"],
      };
    }

    // Calculate totals
    const totalAmount = invoices.reduce(
      (sum, inv) => sum + Number(inv.amountDue),
      0,
    );

    // Generate batch number
    const batchNumber = `BATCH-${Date.now()}`;

    // Create batch
    const batch = await prisma.payment_batches.create({
      data: {
        batchNumber,
        paymentDate,
        totalAmount,
        paymentCount: invoices.length,
        status: BatchStatus.PENDING,
        paymentMethod,
        bankAccount,
      },
    });

    // Update invoices with batch ID
    await prisma.invoices.updateMany({
      where: {
        id: { in: invoices.map((inv) => inv.id) },
      },
      data: {
        paymentBatchId: batch.id,
        status: InvoiceStatus.PAYMENT_SCHEDULED,
      },
    });

    // Log batch creation
    await auditLogger.log({
      action: "CREATE",
      entityType: EntityType.PAYMENT,
      entityId: batch.id,
      entityDescription: `Payment batch created: ${batchNumber}`,
      severity: LogSeverity.INFO,
      userId: createdById,
      metadata: {
        batchNumber,
        totalAmount,
        invoiceCount: invoices.length,
        paymentMethod,
      },
    });

    return {
      success: true,
      batchId: batch.id,
      batchNumber,
      totalAmount,
      invoiceCount: invoices.length,
      errors,
    };
  }

  /**
   * Release payment batch for execution
   */
  static async releaseBatch(
    batchId: string,
    releasedById: string,
  ): Promise<{ success: boolean; message: string }> {
    const batch = await prisma.payment_batches.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return { success: false, message: "Batch not found" };
    }

    if (batch.status !== BatchStatus.PENDING) {
      return {
        success: false,
        message: `Batch is already ${batch.status.toLowerCase()}`,
      };
    }

    // Update batch
    await prisma.payment_batches.update({
      where: { id: batchId },
      data: {
        status: BatchStatus.PROCESSING,
        releasedAt: new Date(),
        releasedBy: releasedById,
      },
    });

    // Update invoices
    await prisma.invoices.updateMany({
      where: { paymentBatchId: batchId },
      data: {
        status: InvoiceStatus.PAID,
        paidDate: new Date(),
        amountPaid: batch.totalAmount,
      },
    });

    // Complete batch
    await prisma.payment_batches.update({
      where: { id: batchId },
      data: {
        status: BatchStatus.COMPLETED,
      },
    });

    // Log release
    await auditLogger.log({
      action: "UPDATE",
      entityType: EntityType.PAYMENT,
      entityId: batchId,
      entityDescription: `Payment batch released: ${batch.batchNumber}`,
      severity: LogSeverity.INFO,
      userId: releasedById,
    });

    return { success: true, message: "Batch released successfully" };
  }

  /**
   * Mark individual invoice as paid
   */
  static async markInvoiceAsPaid(
    invoiceId: string,
    amountPaid: number,
    paymentReference: string,
    paidById: string,
  ) {
    const invoice = await prisma.invoices.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        paidDate: new Date(),
        amountPaid,
        // Note: paymentReference not in schema, would need to add
      },
    });

    await auditLogger.log({
      action: "UPDATE",
      entityType: EntityType.INVOICE,
      entityId: invoiceId,
      entityDescription: `Invoice marked as paid: ${invoice.invoiceNumber}`,
      severity: LogSeverity.INFO,
      userId: paidById,
      metadata: {
        amountPaid,
        paymentReference,
      },
    });

    // Notify creator
    if (invoice.createdById) {
      await NotificationService.sendNotification({
        userId: invoice.createdById,
        title: "Invoice Paid",
        message: `Invoice ${invoice.invoiceNumber} has been paid (R${amountPaid.toLocaleString()})`,
        type: "INVOICE_APPROVED",
      });
    }

    return invoice;
  }

  /**
   * Get payment batches
   */
  static async getPaymentBatches(status?: BatchStatus) {
    return prisma.payment_batches.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get invoices ready for payment
   */
  static async getInvoicesReadyForPayment() {
    return prisma.invoices.findMany({
      where: {
        status: InvoiceStatus.READY_FOR_PAYMENT,
      },
      orderBy: { dueDate: "asc" },
    });
  }

  /**
   * Cancel payment batch
   */
  static async cancelBatch(
    batchId: string,
    cancelledById: string,
    reason: string,
  ) {
    const batch = await prisma.payment_batches.update({
      where: { id: batchId },
      data: {
        status: BatchStatus.CANCELLED,
      },
    });

    // Revert invoices
    await prisma.invoices.updateMany({
      where: { paymentBatchId: batchId },
      data: {
        status: InvoiceStatus.READY_FOR_PAYMENT,
        paymentBatchId: null,
      },
    });

    await auditLogger.log({
      action: "DELETE",
      entityType: EntityType.PAYMENT,
      entityId: batchId,
      entityDescription: `Payment batch cancelled: ${batch.batchNumber}`,
      severity: LogSeverity.WARNING,
      userId: cancelledById,
      metadata: { reason },
    });

    return batch;
  }
}

export default PaymentWorkflow;
