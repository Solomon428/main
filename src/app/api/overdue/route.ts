import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authMiddleware } from "@/middleware/auth.middleware";
import { AuditLogger } from "@/lib/utils/audit-logger";

export async function GET(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const supplierId = searchParams.get("supplierId");

    const skip = (page - 1) * limit;

    // Build where clause for overdue invoices
    const where: any = {
      status: { notIn: ["PAID", "CANCELLED"] },
      dueDate: { lt: new Date() },
    };

    if (supplierId) {
      where.supplierId = supplierId;
    }

    // Get overdue invoices
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          lineItems: {
            select: {
              id: true,
              description: true,
              quantity: true,
              unitPrice: true,
              lineTotalInclVAT: true,
            },
          },
          approvals: {
            where: {
              status: "PENDING",
            },
            include: {
              approver: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          dueDate: "asc",
        },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    // Calculate days overdue and penalties
    const now = new Date();
    const invoicesWithDetails = invoices.map((invoice) => {
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.max(
        0,
        Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
      );

      // Calculate penalty (1% per week overdue, capped at 10%)
      const weeksOverdue = Math.floor(daysOverdue / 7);
      const penaltyRate = Math.min(weeksOverdue * 0.01, 0.1);
      const totalAmountNum = Number(invoice.totalAmount);
      const penaltyAmount = totalAmountNum * penaltyRate;

      return {
        ...invoice,
        daysOverdue,
        penaltyAmount,
        totalWithPenalty: totalAmountNum + penaltyAmount,
      };
    });

    // Calculate statistics
    const stats = {
      totalOverdue: total,
      totalAmount: invoicesWithDetails.reduce(
        (sum, inv) => sum + Number(inv.totalAmount),
        0,
      ),
      totalWithPenalty: invoicesWithDetails.reduce(
        (sum, inv) => sum + (inv.totalWithPenalty || 0),
        0,
      ),
      criticalCount: invoicesWithDetails.filter((inv) => inv.daysOverdue > 30)
        .length,
    };

    return NextResponse.json({
      success: true,
      data: {
        invoices: invoicesWithDetails,
        stats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching overdue invoices:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch overdue invoices" },
      { status: 500 },
    );
  }
}

// POST to mark invoices as paid or update status
export async function POST(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  try {
    const body = await request.json();
    const { invoiceId, action, paymentDate, notes } = body;

    if (!invoiceId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const userId = request.headers.get("x-user-id") || "system";

    let updateData: any = {};

    switch (action) {
      case "mark_paid":
        updateData = {
          status: "PAID",
          paidDate: paymentDate ? new Date(paymentDate) : new Date(),
          amountPaid: {
            set: prisma.$queryRaw`SELECT totalAmount FROM invoices WHERE id = ${invoiceId}`,
          },
          amountDue: 0,
        };
        break;
      case "update_penalty":
        // Recalculate and update penalty
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
        });
        if (invoice) {
          const daysOverdue = Math.floor(
            (new Date().getTime() - new Date(invoice.dueDate).getTime()) /
              (1000 * 60 * 60 * 24),
          );
          const weeksOverdue = Math.floor(daysOverdue / 7);
          const penaltyRate = Math.min(weeksOverdue * 0.01, 0.1);
          updateData = {
            penaltyAmount: Number(invoice.totalAmount) * penaltyRate,
          };
        }
        break;
      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 },
        );
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
    });

    // Log the action
    await AuditLogger.log({
      action: "UPDATE",
      entityType: "INVOICE",
      entityId: invoiceId,
      entityDescription: `Overdue invoice ${action}`,
      severity: "INFO",
      userId,
      metadata: { action, notes },
    });

    return NextResponse.json({
      success: true,
      data: updatedInvoice,
    });
  } catch (error) {
    console.error("Error updating overdue invoice:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update invoice" },
      { status: 500 },
    );
  }
}
