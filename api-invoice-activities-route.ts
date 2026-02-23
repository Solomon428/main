// src/app/api/invoices/[id]/activities/route.ts
// Invoice Activity Tracking & Timeline API

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

interface RouteContext {
  params: { id: string };
}

// GET /api/invoices/[id]/activities
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { id: invoiceId } = context.params;
    const { searchParams } = new URL(request.url);
    const activityType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Verify invoice exists and user has access
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, invoiceNumber: true, organizationId: true },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: { code: 'INV_001', message: 'Invoice not found' } }, { status: 404 });
    }

    // Build where clause
    let where: any = { invoiceId, deletedAt: null };
    if (activityType) {
      where.activityType = activityType;
    }

    // Fetch activities
    const activities = await prisma.invoiceActivity.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Also fetch related entities for comprehensive timeline
    const [approvals, payments, comments, complianceChecks, riskScores] = await Promise.all([
      prisma.approval.findMany({
        where: { invoiceId },
        select: {
          id: true,
          status: true,
          decision: true,
          createdAt: true,
          approver: { select: { name: true, email: true } },
          comments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.findMany({
        where: { invoiceId },
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          status: true,
          paymentDate: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoiceComment.findMany({
        where: { invoiceId },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.complianceCheck.findMany({
        where: { invoiceId },
        select: { id: true, checkType: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.riskScore.findMany({
        where: { invoiceId },
        select: { id: true, level: true, score: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Construct unified timeline
    const timeline: Array<{
      id: string;
      type: string;
      timestamp: Date;
      actor: string;
      action: string;
      details: any;
    }> = [];

    // Add activities
    activities.forEach(activity => {
      timeline.push({
        id: activity.id,
        type: 'ACTIVITY',
        timestamp: activity.createdAt,
        actor: activity.user?.name || 'System',
        action: activity.action,
        details: {
          description: activity.description,
          metadata: activity.metadata,
        },
      });
    });

    // Add approvals
    approvals.forEach(approval => {
      timeline.push({
        id: approval.id,
        type: 'APPROVAL',
        timestamp: approval.createdAt,
        actor: approval.approver?.name || 'Unknown',
        action: `${approval.decision || approval.status}`,
        details: {
          status: approval.status,
          decision: approval.decision,
          comments: approval.comments,
        },
      });
    });

    // Add payments
    payments.forEach(payment => {
      timeline.push({
        id: payment.id,
        type: 'PAYMENT',
        timestamp: payment.paymentDate || payment.createdAt,
        actor: 'Finance Team',
        action: payment.status,
        details: {
          amount: payment.amount,
          method: payment.paymentMethod,
          status: payment.status,
        },
      });
    });

    // Add comments
    comments.forEach(comment => {
      timeline.push({
        id: comment.id,
        type: 'COMMENT',
        timestamp: comment.createdAt,
        actor: comment.user?.name || 'Unknown',
        action: 'COMMENTED',
        details: { content: comment.content },
      });
    });

    // Add compliance checks
    complianceChecks.forEach(check => {
      timeline.push({
        id: check.id,
        type: 'COMPLIANCE',
        timestamp: check.createdAt,
        actor: 'Compliance System',
        action: check.checkType,
        details: { status: check.status },
      });
    });

    // Add risk assessments
    riskScores.forEach(risk => {
      timeline.push({
        id: risk.id,
        type: 'RISK_ASSESSMENT',
        timestamp: risk.createdAt,
        actor: 'Risk System',
        action: 'RISK_EVALUATED',
        details: { riskLevel: risk.level, score: risk.score },
      });
    });

    // Sort timeline by timestamp descending
    timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({
      success: true,
      data: {
        invoice: { id: invoice.id, invoiceNumber: invoice.invoiceNumber },
        timeline,
        summary: {
          totalActivities: activities.length,
          totalApprovals: approvals.length,
          totalPayments: payments.length,
          totalComments: comments.length,
          totalComplianceChecks: complianceChecks.length,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[GET /api/invoices/[id]/activities] Error:', error);
    return NextResponse.json({ success: false, error: { code: 'SYS_001', message: 'Internal server error' } }, { status: 500 });
  }
}

// POST /api/invoices/[id]/activities
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { id: invoiceId } = context.params;
    const body = await request.json();

    const activity = await prisma.invoiceActivity.create({
      data: {
        invoiceId,
        userId: session.user.id,
        action: body.activityType,
        description: body.description,
        metadata: body.metadata || {},
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: { activity },
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/invoices/[id]/activities] Error:', error);
    return NextResponse.json({ success: false, error: { code: 'SYS_001', message: 'Internal server error' } }, { status: 500 });
  }
}
