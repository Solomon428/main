// Simplified Payment Tracking Service for SQLite
import { prisma } from "@/lib/database/client";
import { InvoiceStatus, PaymentMethod, BatchStatus } from "@/types";
import { auditLogger } from "@/lib/utils/audit-logger";

interface PaymentRecord {
  invoiceId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  referenceNumber: string;
  notes?: string;
}

interface PaymentStats {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  upcomingPayments: number;
  averagePaymentTime: number;
}

export class PaymentTrackingService {
  /**
   * Record a payment for a single invoice
   */
  static async recordPayment(
    data: PaymentRecord,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const invoice = await prisma.invoices.findUnique({
        where: { id: data.invoiceId },
      });

      if (!invoice) {
        return { success: false, message: "Invoice not found" };
      }

      const paymentAmount = data.amount;
      const currentAmountPaid = invoice.amountPaid || 0;
      const newAmountPaid = currentAmountPaid + paymentAmount;
      const remainingAmount = invoice.totalAmount - newAmountPaid;
      const isFullyPaid = remainingAmount <= 0;
      const isPartiallyPaid = !isFullyPaid && newAmountPaid > 0;

      // Determine new status
      let newStatus: InvoiceStatus = invoice.status as InvoiceStatus;
      if (isFullyPaid) {
        newStatus = "PAID";
      } else if (isPartiallyPaid) {
        newStatus = "PARTIALLY_PAID";
      }

      await prisma.invoices.update({
        where: { id: data.invoiceId },
        data: {
          amountPaid: newAmountPaid,
          status: newStatus,
          paymentDate: isFullyPaid ? data.paymentDate : invoice.paymentDate,
          paidDate: isFullyPaid ? data.paymentDate : invoice.paidDate,
        },
      });

      // Log payment
      await auditLogger.log({
        action: "UPDATE",
        entityType: "INVOICE",
        entityId: data.invoiceId,
        entityDescription: `Payment recorded: R ${paymentAmount.toFixed(2)}`,
        severity: "INFO",
        userId,
        metadata: {
          amount: paymentAmount,
          referenceNumber: data.referenceNumber,
          paymentMethod: data.paymentMethod,
          isFullyPaid,
          remainingAmount,
        },
      });

      return {
        success: true,
        message: isFullyPaid
          ? "Invoice fully paid"
          : `Partial payment recorded. Remaining: R ${remainingAmount.toFixed(2)}`,
      };
    } catch (error) {
      console.error("Error recording payment:", error);
      return { success: false, message: "Failed to record payment" };
    }
  }

  /**
   * Get payment statistics for dashboard
   */
  static async getPaymentStats(): Promise<PaymentStats> {
    try {
      const today = new Date();
      const sevenDaysFromNow = new Date(
        today.getTime() + 7 * 24 * 60 * 60 * 1000,
      );

      const [paidInvoices, pendingInvoices, overdueInvoices, upcomingInvoices] =
        await Promise.all([
          prisma.invoices.findMany({
            where: { status: "PAID" },
            select: { totalAmount: true, amountPaid: true },
          }),
          prisma.invoices.findMany({
            where: {
              status: { in: ["APPROVED", "READY_FOR_PAYMENT"] },
            },
            select: { totalAmount: true },
          }),
          prisma.invoices.findMany({
            where: {
              status: { notIn: ["PAID", "CANCELLED", "REJECTED"] },
              dueDate: { lt: today },
            },
            select: { totalAmount: true },
          }),
          prisma.invoices.count({
            where: {
              status: { in: ["APPROVED", "READY_FOR_PAYMENT"] },
              dueDate: {
                gte: today,
                lte: sevenDaysFromNow,
              },
            },
          }),
        ]);

      const totalPaid = paidInvoices.reduce(
        (sum, inv) => sum + (inv.amountPaid || 0),
        0,
      );
      const totalPending = pendingInvoices.reduce(
        (sum, inv) => sum + inv.totalAmount,
        0,
      );
      const totalOverdue = overdueInvoices.reduce(
        (sum, inv) => sum + inv.totalAmount,
        0,
      );

      return {
        totalPaid,
        totalPending,
        totalOverdue,
        upcomingPayments: upcomingInvoices,
        averagePaymentTime: 5, // Placeholder - would calculate from actual data
      };
    } catch (error) {
      console.error("Error getting payment stats:", error);
      return {
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        upcomingPayments: 0,
        averagePaymentTime: 0,
      };
    }
  }

  /**
   * Get upcoming payments
   */
  static async getUpcomingPayments(days: number = 7) {
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    return prisma.invoices.findMany({
      where: {
        status: { in: ["APPROVED", "READY_FOR_PAYMENT"] },
        dueDate: {
          gte: today,
          lte: futureDate,
        },
      },
      orderBy: { dueDate: "asc" },
      take: 20,
    });
  }
}
