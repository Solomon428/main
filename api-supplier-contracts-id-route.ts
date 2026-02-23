// src/app/api/suppliers/[id]/contracts/[contractId]/route.ts
// Individual Supplier Contract Operations
// GET, PUT, DELETE for specific contract

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/observability/audit';

interface RouteContext {
  params: {
    id: string; // Supplier ID
    contractId: string; // Contract ID
  };
}

const UpdateContractSchema = z.object({
  contractNumber: z.string().min(1).max(50).optional(),
  contractType: z.enum(['SERVICE', 'SUPPLY', 'MAINTENANCE', 'SUBSCRIPTION', 'RETAINER', 'PROJECT', 'FRAMEWORK', 'OTHER']).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  value: z.number().positive().optional(),
  currency: z.enum(['ZAR', 'USD', 'EUR', 'GBP', 'AED', 'CNY', 'JPY', 'AUD', 'CAD']).optional(),
  paymentTerms: z.number().int().min(0).max(365).optional(),
  renewalType: z.enum(['AUTO', 'MANUAL', 'NONE']).optional(),
  renewalNoticeDays: z.number().int().min(0).max(365).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PENDING_APPROVAL', 'APPROVED', 'EXPIRED', 'TERMINATED', 'SUSPENDED']).optional(),
  autoRenew: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
}).strict();

// GET /api/suppliers/[id]/contracts/[contractId]
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { contractId } = context.params;

    const contract = await prisma.supplierContract.findUnique({
      where: { id: contractId, deletedAt: null },
      include: {
        supplier: { select: { id: true, name: true, supplierCode: true, primaryContactEmail: true, taxId: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!contract || !contract.endDate) {
      return NextResponse.json({ success: false, error: { code: 'CON_002', message: 'Contract not found' } }, { status: 404 });
    }

    // Calculate expiry info
    const now = new Date();
    const daysUntilExpiry = Math.ceil((contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = daysUntilExpiry < 0;
    const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

    return NextResponse.json({
      success: true,
      data: {
        contract: {
          ...contract,
          daysUntilExpiry,
          isExpired,
          isExpiringSoon,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[GET /api/suppliers/[id]/contracts/[contractId]] Error:', error);
    return NextResponse.json({ success: false, error: { code: 'SYS_001', message: 'Internal server error' } }, { status: 500 });
  }
}

// PUT /api/suppliers/[id]/contracts/[contractId]
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { contractId } = context.params;
    const body = await request.json();
    const validatedData = UpdateContractSchema.parse(body);

    // Fetch existing contract
    const existingContract = await prisma.supplierContract.findUnique({
      where: { id: contractId, deletedAt: null },
    });

    if (!existingContract || !existingContract.endDate || !existingContract.startDate) {
      return NextResponse.json({ success: false, error: { code: 'CON_002', message: 'Contract not found' } }, { status: 404 });
    }

    // Date validation if dates are being updated
    if (validatedData.startDate || validatedData.endDate) {
      const startDate = validatedData.startDate ? new Date(validatedData.startDate) : existingContract.startDate;
      const endDate = validatedData.endDate ? new Date(validatedData.endDate) : existingContract.endDate;

      if (endDate <= startDate) {
        return NextResponse.json({
          success: false,
          error: { code: 'VAL_002', message: 'End date must be after start date' },
        }, { status: 400 });
      }
    }

    // Update contract
    const updatedContract = await prisma.supplierContract.update({
      where: { id: contractId },
      data: {
        ...validatedData,
        updatedById: session.user.id,
      },
      include: {
        supplier: { select: { id: true, name: true, supplierCode: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Log audit event
    await logAuditEvent({
      userId: session.user.id,
      action: 'UPDATE',
      entityType: 'SUPPLIER_CONTRACT',
      entityId: contractId,
      organizationId: existingContract.organizationId,
      oldValue: existingContract as unknown as Record<string, unknown>,
      newValue: updatedContract as unknown as Record<string, unknown>,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: { contract: updatedContract },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VAL_001', message: 'Validation error', details: error.errors } }, { status: 400 });
    }
    console.error('[PUT /api/suppliers/[id]/contracts/[contractId]] Error:', error);
    return NextResponse.json({ success: false, error: { code: 'SYS_001', message: 'Internal server error' } }, { status: 500 });
  }
}

// DELETE /api/suppliers/[id]/contracts/[contractId]
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { contractId } = context.params;

    const existingContract = await prisma.supplierContract.findUnique({
      where: { id: contractId, deletedAt: null },
    });

    if (!existingContract) {
      return NextResponse.json({ success: false, error: { code: 'CON_002', message: 'Contract not found' } }, { status: 404 });
    }

    // Soft delete
    await prisma.supplierContract.update({
      where: { id: contractId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log audit event
    await logAuditEvent({
      userId: session.user.id,
      action: 'DELETE',
      entityType: 'SUPPLIER_CONTRACT',
      entityId: contractId,
      organizationId: existingContract.organizationId,
      oldValue: existingContract as unknown as Record<string, unknown>,
      newValue: undefined,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Contract deleted successfully', contractId },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DELETE /api/suppliers/[id]/contracts/[contractId]] Error:', error);
    return NextResponse.json({ success: false, error: { code: 'SYS_001', message: 'Internal server error' } }, { status: 500 });
  }
}
