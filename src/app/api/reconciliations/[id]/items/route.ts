import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

const DEFAULT_USER_ID = "default-user-id";

function calculateMatchConfidence(
  item: { amount: Decimal; reference: string | null; transactionDate: Date },
  payment: { amount: Decimal; referenceNumber: string | null; paymentDate: Date }
): number {
  let score = 0;

  const amountDiff = Math.abs(Number(item.amount) - Number(payment.amount));
  if (amountDiff === 0) {
    score += 50;
  } else if (amountDiff <= Number(item.amount) * 0.05) {
    score += 30;
  } else if (amountDiff <= Number(item.amount) * 0.1) {
    score += 15;
  }

  if (item.reference && payment.referenceNumber) {
    const ref1 = item.reference.toLowerCase().replace(/[^a-z0-9]/g, "");
    const ref2 = payment.referenceNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (ref1 === ref2) {
      score += 20;
    } else if (ref1.includes(ref2) || ref2.includes(ref1)) {
      score += 15;
    } else if (
      ref1.length > 3 &&
      ref2.length > 3 &&
      (ref1.substring(0, 5) === ref2.substring(0, 5) ||
        ref1.slice(-5) === ref2.slice(-5))
    ) {
      score += 10;
    }
  }

  const dateDiff = Math.abs(
    item.transactionDate.getTime() - payment.paymentDate.getTime()
  );
  const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
  if (daysDiff === 0) {
    score += 30;
  } else if (daysDiff <= 3) {
    score += 20;
  } else if (daysDiff <= 7) {
    score += 10;
  }

  return Math.min(score, 100);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const reconciliation = await prisma.reconciliation.findFirst({
      where: { id: params.id },
      include: {
        bankAccount: {
          select: { id: true, accountName: true, bankName: true, currency: true },
        },
      },
    });

    if (!reconciliation) {
      return NextResponse.json(
        { success: false, error: "Reconciliation not found" },
        { status: 404 }
      );
    }

    const where: Record<string, unknown> = { reconciliationId: params.id };
    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.reconciliationItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transactionDate: "desc" },
        include: {
          payment: {
            select: {
              id: true,
              paymentNumber: true,
              amount: true,
              currency: true,
              referenceNumber: true,
              paymentDate: true,
              status: true,
            },
          },
        },
      }),
      prisma.reconciliationItem.count({ where }),
    ]);

    const unmatchedPayments = await prisma.payment.findMany({
      where: {
        organizationId: reconciliation.organizationId,
        bankAccountId: reconciliation.bankAccountId,
        isReconciled: false,
        paymentDate: {
          gte: reconciliation.startDate,
          lte: reconciliation.endDate,
        },
      },
      select: {
        id: true,
        paymentNumber: true,
        amount: true,
        currency: true,
        referenceNumber: true,
        paymentDate: true,
        status: true,
        invoiceId: true,
      },
    });

    const itemsWithSuggestions = items.map((item) => {
      if (item.status !== "UNMATCHED") {
        return {
          ...item,
          amount: Number(item.amount),
          matchedAmount: item.matchedAmount ? Number(item.matchedAmount) : null,
          matchConfidence: item.matchConfidence
            ? Number(item.matchConfidence)
            : null,
          suggestedMatches: [],
        };
      }

      const suggestedMatches = unmatchedPayments
        .map((payment) => ({
          ...payment,
          amount: Number(payment.amount),
          confidence: calculateMatchConfidence(
            {
              amount: item.amount,
              reference: item.reference,
              transactionDate: item.transactionDate,
            },
            {
              amount: payment.amount,
              referenceNumber: payment.referenceNumber,
              paymentDate: payment.paymentDate,
            }
          ),
        }))
        .filter((p) => p.confidence >= 30)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

      return {
        ...item,
        amount: Number(item.amount),
        matchedAmount: item.matchedAmount ? Number(item.matchedAmount) : null,
        matchConfidence: item.matchConfidence
          ? Number(item.matchConfidence)
          : null,
        suggestedMatches,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        reconciliation: {
          ...reconciliation,
          openingBalance: Number(reconciliation.openingBalance),
          closingBalance: Number(reconciliation.closingBalance),
          statementBalance: Number(reconciliation.statementBalance),
          difference: Number(reconciliation.difference),
        },
        items: itemsWithSuggestions,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalItems: items.length,
        matched: items.filter((i) => i.status === "MATCHED").length,
        unmatched: items.filter((i) => i.status === "UNMATCHED").length,
        disputed: items.filter((i) => i.status === "DISPUTED").length,
        adjusted: items.filter((i) => i.status === "ADJUSTED").length,
      },
    });
  } catch (error) {
    console.error("Error fetching reconciliation items:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reconciliation items" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, itemIds, paymentId, itemId, notes } = body;

    if (action === "match" && itemId && paymentId) {
      const item = await prisma.reconciliationItem.findFirst({
        where: { id: itemId, reconciliationId: params.id },
      });

      if (!item) {
        return NextResponse.json(
          { success: false, error: "Reconciliation item not found" },
          { status: 404 }
        );
      }

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        return NextResponse.json(
          { success: false, error: "Payment not found" },
          { status: 404 }
        );
      }

      const confidence = calculateMatchConfidence(
        {
          amount: item.amount,
          reference: item.reference,
          transactionDate: item.transactionDate,
        },
        {
          amount: payment.amount,
          referenceNumber: payment.referenceNumber,
          paymentDate: payment.paymentDate,
        }
      );

      const updatedItem = await prisma.reconciliationItem.update({
        where: { id: itemId },
        data: {
          matchedPaymentId: paymentId,
          matchedAmount: payment.amount,
          matchedAt: new Date(),
          matchedBy: DEFAULT_USER_ID,
          matchConfidence: new Decimal(confidence),
          matchingMethod: confidence >= 80 ? "AUTO" : "MANUAL",
          status: "MATCHED",
          notes,
        },
      });

      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          isReconciled: true,
          reconciledAt: new Date(),
          reconciliationId: params.id,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          ...updatedItem,
          amount: Number(updatedItem.amount),
          matchedAmount: updatedItem.matchedAmount
            ? Number(updatedItem.matchedAmount)
            : null,
          matchConfidence: updatedItem.matchConfidence
            ? Number(updatedItem.matchConfidence)
            : null,
        },
        message: "Items matched successfully",
      });
    }

    if (action === "bulk_match" && itemIds && paymentId) {
      const results = [];
      for (const itemId of itemIds) {
        const item = await prisma.reconciliationItem.findFirst({
          where: { id: itemId, reconciliationId: params.id },
        });

        if (!item) continue;

        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
        });

        if (!payment) continue;

        const confidence = calculateMatchConfidence(
          {
            amount: item.amount,
            reference: item.reference,
            transactionDate: item.transactionDate,
          },
          {
            amount: payment.amount,
            referenceNumber: payment.referenceNumber,
            paymentDate: payment.paymentDate,
          }
        );

        const updatedItem = await prisma.reconciliationItem.update({
          where: { id: itemId },
          data: {
            matchedPaymentId: paymentId,
            matchedAmount: payment.amount,
            matchedAt: new Date(),
            matchedBy: DEFAULT_USER_ID,
            matchConfidence: new Decimal(confidence),
            matchingMethod: "MANUAL",
            status: "MATCHED",
          },
        });

        results.push(updatedItem);
      }

      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          isReconciled: true,
          reconciledAt: new Date(),
          reconciliationId: params.id,
        },
      });

      return NextResponse.json({
        success: true,
        data: results.map((r) => ({
          ...r,
          amount: Number(r.amount),
          matchedAmount: r.matchedAmount ? Number(r.matchedAmount) : null,
        })),
        message: `${results.length} items matched successfully`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing reconciliation items:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process reconciliation items" },
      { status: 500 }
    );
  }
}
