// src/app/api/approvals/delegated/route.ts
// Delegated Approval Management API

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/observability/audit';

const CreateDelegationSchema = z.object({
  delegateeId: z.string().cuid('Invalid user ID'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
  isActive: z.boolean().default(true),
  delegateAll: z.boolean().default(false),
  maxAmount: z.number().positive().optional(),
  invoiceIds: z.array(z.string().cuid()).optional(),
  notes: z.string().max(1000).optional(),
});

// GET /api/approvals/delegated
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const type = searchParams.get('type') || 'all'; // 'delegated_by_me', 'delegated_to_me', 'all'

    let where: any = { deletedAt: null };

    if (status === 'active') {
      where.isActive = true;
      where.startDate = { lte: new Date() };
      where.endDate = { gte: new Date() };
    } else if (status === 'expired') {
      where.endDate = { lt: new Date() };
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (type === 'delegated_by_me') {
      where.delegatorId = session.user.id;
    } else if (type === 'delegated_to_me') {
      where.delegateeId = session.user.id;
    } else {
      where.OR = [
        { delegatorId: session.user.id },
        { delegateeId: session.user.id },
      ];
    }

    const delegations = await prisma.delegatedApproval.findMany({
      where,
      include: {
        delegator: { select: { id: true, name: true, email: true, role: true } },
        delegatee: { select: { id: true, name: true, email: true, role: true } },
        approvals: {
          select: { id: true, status: true, invoice: { select: { invoiceNumber: true, totalAmount: true } } },
          where: { status: { in: ['PENDING', 'APPROVED'] } },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: delegations.length,
      active: delegations.filter(d => d.isActive && new Date() >= d.startDate && new Date() <= d.endDate).length,
      expired: delegations.filter(d => new Date() > d.endDate).length,
      inactive: delegations.filter(d => !d.isActive).length,
    };

    return NextResponse.json({
      success: true,
      data: { delegations, stats },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[GET /api/approvals/delegated] Error:', error);
    return NextResponse.json({ success: false, error: { code: 'SYS_001', message: 'Internal server error' } }, { status: 500 });
  }
}

// POST /api/approvals/delegated
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const body = await request.json();
    const data = CreateDelegationSchema.parse(body);

    // Validate dates
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      return NextResponse.json({
        success: false,
        error: { code: 'VAL_001', message: 'End date must be after start date' },
      }, { status: 400 });
    }

    // Verify delegatee exists and is different from delegator
    if (data.delegateeId === session.user.id) {
      return NextResponse.json({
        success: false,
        error: { code: 'VAL_002', message: 'Cannot delegate to yourself' },
      }, { status: 400 });
    }

    const delegatee = await prisma.user.findUnique({
      where: { id: data.delegateeId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!delegatee || !delegatee.isActive) {
      return NextResponse.json({
        success: false,
        error: { code: 'VAL_003', message: 'Delegatee not found or inactive' },
      }, { status: 400 });
    }

    // Create delegation
    const delegation = await prisma.delegatedApproval.create({
      data: {
        ...data,
        delegatorId: session.user.id,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
      include: {
        delegator: { select: { id: true, name: true, email: true } },
        delegatee: { select: { id: true, name: true, email: true } },
      },
    });

    // Log audit event
    await logAuditEvent({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'DELEGATED_APPROVAL',
      entityId: delegation.id,
      oldValue: undefined,
      newValue: delegation as unknown as Record<string, unknown>,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // Send notification to delegatee
    await prisma.notification.create({
      data: {
        userId: data.delegateeId,
        type: 'APPROVAL_DELEGATED',
        priority: 'HIGH',
        title: 'Approval Authority Delegated',
        message: `${session.user.name} has delegated approval authority to you from ${data.startDate} to ${data.endDate}`,
        channel: 'IN_APP',
        metadata: { delegationId: delegation.id },
      },
    });

    return NextResponse.json({
      success: true,
      data: { delegation },
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VAL_001', message: 'Validation error', details: error.errors } }, { status: 400 });
    }
    console.error('[POST /api/approvals/delegated] Error:', error);
    return NextResponse.json({ success: false, error: { code: 'SYS_001', message: 'Internal server error' } }, { status: 500 });
  }
}

// PUT /api/approvals/delegated/[id]
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const delegationId = url.pathname.split('/').pop();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const body = await request.json();

    const existing = await prisma.delegatedApproval.findUnique({
      where: { id: delegationId },
    });

    if (!existing || existing.delegatorId !== session.user.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_002', message: 'Not authorized' } }, { status: 403 });
    }

    const updated = await prisma.delegatedApproval.update({
      where: { id: delegationId },
      data: {
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
        endDate: body.endDate ? new Date(body.endDate) : existing.endDate,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
      include: {
        delegator: { select: { id: true, name: true, email: true } },
        delegatee: { select: { id: true, name: true, email: true } },
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: 'UPDATE',
      entityType: 'DELEGATED_APPROVAL',
      entityId: delegationId!,
      oldValue: existing,
      newValue: updated,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({ success: true, data: { delegation: updated }, timestamp: new Date().toISOString() });

  } catch (error) {
    console.error('[PUT /api/approvals/delegated/[id]] Error:', error);
    return NextResponse.json({ success: false, error: { code: 'SYS_001', message: 'Internal server error' } }, { status: 500 });
  }
}
