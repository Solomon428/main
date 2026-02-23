import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_USER_ID = "default-user-id";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;
    const action = searchParams.get("action");

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, deletedAt: null },
      select: { id: true, invoiceNumber: true, status: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }

    const where: Record<string, unknown> = { invoiceId: params.id };
    if (action) {
      where.action = action;
    }

    const [activities, total] = await Promise.all([
      prisma.invoiceActivity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.invoiceActivity.count({ where }),
    ]);

    const approvals = await prisma.approval.findMany({
      where: { invoiceId: params.id },
      orderBy: { createdAt: "desc" },
      include: {
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const payments = await prisma.payment.findMany({
      where: { invoiceId: params.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        paymentNumber: true,
        amount: true,
        currency: true,
        status: true,
        paymentDate: true,
        paymentMethod: true,
        createdAt: true,
      },
    });

    const comments = await prisma.invoiceComment.findMany({
      where: { invoiceId: params.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const complianceChecks = await prisma.complianceCheck.findMany({
      where: { invoiceId: params.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        checkType: true,
        status: true,
        severity: true,
        createdAt: true,
      },
    });

    const riskScores = await prisma.riskScore.findMany({
      where: { invoiceId: params.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        score: true,
        level: true,
        assessedAt: true,
      },
    });

    const unifiedTimeline = [
      ...activities.map((a) => ({
        type: "ACTIVITY",
        id: a.id,
        action: a.action,
        description: a.description || a.action,
        actor: a.user
          ? { id: a.user.id, name: a.user.name, email: a.user.email }
          : { id: a.actorId, name: a.actorName },
        actorType: a.actorType,
        timestamp: a.createdAt,
        metadata: a.metadata,
      })),
      ...approvals.map((a) => ({
        type: "APPROVAL",
        id: a.id,
        action: `APPROVAL_${a.status}`,
        description: `Approval ${a.status.toLowerCase()}`,
        actor: a.approver
          ? { id: a.approver.id, name: a.approver.name, email: a.approver.email }
          : null,
        actorType: "USER",
        timestamp: a.approvedAt || a.assignedAt || a.createdAt,
        metadata: {
          level: a.level,
          decision: a.decision,
          notes: a.decisionNotes,
          isDelegated: a.isDelegated,
          isEscalated: a.isEscalated,
        },
      })),
      ...payments.map((p) => ({
        type: "PAYMENT",
        id: p.id,
        action: `PAYMENT_${p.status}`,
        description: `Payment ${p.status.toLowerCase()} - ${p.paymentNumber}`,
        actor: null,
        actorType: "SYSTEM",
        timestamp: p.createdAt,
        metadata: {
          amount: Number(p.amount),
          currency: p.currency,
          paymentMethod: p.paymentMethod,
          paymentDate: p.paymentDate,
        },
      })),
      ...comments.map((c) => ({
        type: "COMMENT",
        id: c.id,
        action: c.isInternal ? "INTERNAL_COMMENT" : "COMMENT",
        description: c.content.substring(0, 100) + (c.content.length > 100 ? "..." : ""),
        actor: c.user
          ? { id: c.user.id, name: c.user.name, email: c.user.email }
          : { id: c.userId, name: c.userName },
        actorType: "USER",
        timestamp: c.createdAt,
        metadata: {
          isInternal: c.isInternal,
          isPinned: c.isPinned,
          fullContent: c.content,
        },
      })),
      ...complianceChecks.map((c) => ({
        type: "COMPLIANCE",
        id: c.id,
        action: `COMPLIANCE_${c.checkType}`,
        description: `Compliance check: ${c.checkType}`,
        actor: null,
        actorType: "SYSTEM",
        timestamp: c.createdAt,
        metadata: {
          checkType: c.checkType,
          status: c.status,
          severity: c.severity,
        },
      })),
      ...riskScores.map((r) => ({
        type: "RISK_ASSESSMENT",
        id: r.id,
        action: "RISK_SCORED",
        description: `Risk assessment: ${r.level} (${Number(r.score)})`,
        actor: null,
        actorType: "SYSTEM",
        timestamp: r.assessedAt,
        metadata: {
          score: Number(r.score),
          level: r.level,
        },
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const paginatedTimeline = unifiedTimeline.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: {
        invoice,
        timeline: paginatedTimeline,
        summary: {
          totalActivities: activities.length,
          totalApprovals: approvals.length,
          totalPayments: payments.length,
          totalComments: comments.length,
          totalComplianceChecks: complianceChecks.length,
          totalRiskAssessments: riskScores.length,
        },
      },
      pagination: {
        total: unifiedTimeline.length,
        page,
        limit,
        totalPages: Math.ceil(unifiedTimeline.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching invoice activities:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invoice activities" },
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
    const { action, description, metadata, actorType } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Action is required" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, deletedAt: null },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }

    const activity = await prisma.invoiceActivity.create({
      data: {
        invoiceId: params.id,
        userId: DEFAULT_USER_ID,
        actorType: actorType || "USER",
        action,
        description,
        metadata,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: activity,
        message: "Activity logged successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error logging invoice activity:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log invoice activity" },
      { status: 500 }
    );
  }
}
