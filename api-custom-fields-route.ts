// src/app/api/system/custom-fields/route.ts
// Custom Fields Management - Dynamic Entity Extension

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

const CreateCustomFieldSchema = z.object({
  entityType: z.enum(['INVOICE', 'SUPPLIER', 'PAYMENT', 'USER', 'ORGANIZATION', 'APPROVAL', 'CONTRACT']),
  fieldName: z.string().min(1).max(100).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Field name must start with letter and contain only letters, numbers, and underscores'),
  label: z.string().min(1).max(200),
  fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'EMAIL', 'URL', 'PHONE', 'TEXTAREA', 'JSON']),
  description: z.string().max(500).optional(),
  isRequired: z.boolean().default(false),
  isSearchable: z.boolean().default(true),
  isFilterable: z.boolean().default(true),
  defaultValue: z.any().optional(),
  options: z.array(z.string()).optional(), // For SELECT and MULTI_SELECT types
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
  }).optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
});

const UpdateCustomFieldSchema = CreateCustomFieldSchema.partial();

// GET /api/system/custom-fields
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const isActive = searchParams.get('isActive');

    let where: any = { deletedAt: null };

    if (entityType) {
      where.entityType = entityType;
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const fields = await prisma.customField.findMany({
      where,
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
      orderBy: [
        { entityType: 'asc' },
        { displayOrder: 'asc' },
        { fieldLabel: 'asc' },
      ],
    });

    // Group by entity type
    const fieldsByEntity = fields.reduce((acc, field) => {
      if (!acc[field.entityType]) {
        acc[field.entityType] = [];
      }
      acc[field.entityType]?.push(field);
      return acc;
    }, {} as Record<string, typeof fields>);

    const stats = {
      total: fields.length,
      active: fields.filter(f => f.isActive).length,
      byEntityType: Object.entries(fieldsByEntity).map(([entityType, fields]) => ({
        entityType,
        count: fields.length,
      })),
    };

    return NextResponse.json({
      success: true,
      data: {
        fields,
        fieldsByEntity,
        stats,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[GET /api/system/custom-fields] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// POST /api/system/custom-fields
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    // Permission check (only admins can create custom fields)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, primaryOrganizationId: true },
    });

    if (!user || !['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN'].includes(user.role)) {
      return NextResponse.json({
        success: false,
        error: { code: 'AUTH_002', message: 'Insufficient permissions' },
      }, { status: 403 });
    }

    const body = await request.json();
    const data = CreateCustomFieldSchema.parse(body);

    // Check for duplicate field name for this entity type
    const existing = await prisma.customField.findFirst({
      where: {
        organizationId: user.primaryOrganizationId!,
        entityType: data.entityType,
        fieldName: data.fieldName,
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CF_001',
          message: 'Duplicate field name',
          details: `Field '${data.fieldName}' already exists for ${data.entityType}`,
        },
      }, { status: 409 });
    }

    // Validate options for SELECT types
    if (['SELECT', 'MULTI_SELECT'].includes(data.fieldType) && (!data.options || data.options.length === 0)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VAL_001',
          message: 'Options required for SELECT and MULTI_SELECT field types',
        },
      }, { status: 400 });
    }

    const field = await prisma.customField.create({
      data: {
        ...data,
        fieldLabel: data.label,
        organizationId: user.primaryOrganizationId!,
        createdById: session.user.id,
        updatedById: session.user.id,
      } as any,
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: { field },
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: { code: 'VAL_001', message: 'Validation error', details: error.errors },
      }, { status: 400 });
    }
    console.error('[POST /api/system/custom-fields] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// PUT /api/system/custom-fields/[id]
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const fieldId = url.pathname.split('/').pop();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const body = await request.json();
    const data = UpdateCustomFieldSchema.parse(body);

    const existing = await prisma.customField.findUnique({
      where: { id: fieldId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: { code: 'CF_002', message: 'Custom field not found' },
      }, { status: 404 });
    }

    const updated = await prisma.customField.update({
      where: { id: fieldId },
      data: {
        ...data,
        updatedById: session.user.id,
      },
      include: {
        updatedBy: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: { field: updated },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: { code: 'VAL_001', message: 'Validation error', details: error.errors },
      }, { status: 400 });
    }
    console.error('[PUT /api/system/custom-fields/[id]] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// DELETE /api/system/custom-fields/[id]
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const fieldId = url.pathname.split('/').pop();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const existing = await prisma.customField.findUnique({
      where: { id: fieldId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: { code: 'CF_002', message: 'Custom field not found' },
      }, { status: 404 });
    }

    // Soft delete
    await prisma.customField.update({
      where: { id: fieldId },
      data: {
        deletedAt: new Date(),
        deletedById: session.user.id,
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Custom field deleted successfully', fieldId },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[DELETE /api/system/custom-fields/[id]] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}
