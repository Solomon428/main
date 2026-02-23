// src/app/api/system/tags/route.ts
// Tags Management - Entity Categorization & Organization

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

const CreateTagSchema = z.object({
  name: z.string().min(1).max(50).transform(str => str.trim()),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').default('#3B82F6'),
  description: z.string().max(200).optional(),
  category: z.enum(['STATUS', 'PRIORITY', 'DEPARTMENT', 'PROJECT', 'CUSTOM']).default('CUSTOM'),
  entityTypes: z.array(z.enum(['INVOICE', 'SUPPLIER', 'PAYMENT', 'APPROVAL', 'USER', 'ORGANIZATION', 'CONTRACT', 'FILE'])).default([]),
  isSystem: z.boolean().default(false),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
});

const UpdateTagSchema = CreateTagSchema.partial();

const BulkTagSchema = z.object({
  tagIds: z.array(z.string().cuid()),
  entityType: z.enum(['INVOICE', 'SUPPLIER', 'PAYMENT', 'APPROVAL', 'USER', 'ORGANIZATION', 'CONTRACT', 'FILE']),
  entityIds: z.array(z.string().cuid()),
  action: z.enum(['ADD', 'REMOVE']),
});

// GET /api/system/tags
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const entityType = searchParams.get('entityType');
    const search = searchParams.get('search');

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { primaryOrganizationId: true },
    });

    let where: any = {
      organizationId: user?.primaryOrganizationId,
    };

    if (entityType) {
      where.entityTypes = { has: entityType };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tags = await prisma.tag.findMany({
      where,
      orderBy: [
        { name: 'asc' },
      ],
    });

    // Group by entity type
    const tagsByEntityType = tags.reduce((acc, tag) => {
      tag.entityTypes.forEach(et => {
        if (!acc[et]) {
          acc[et] = [];
        }
        acc[et].push(tag);
      });
      return acc;
    }, {} as Record<string, typeof tags>);

    const stats = {
      total: tags.length,
      active: tags.filter(t => t.isActive).length,
      byEntityType: Object.entries(tagsByEntityType).map(([entityType, tags]) => ({
        entityType,
        count: tags.length,
      })),
    };

    return NextResponse.json({
      success: true,
      data: {
        tags,
        tagsByEntityType,
        stats,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[GET /api/system/tags] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// POST /api/system/tags
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { primaryOrganizationId: true },
    });

    const body = await request.json();
    const data = CreateTagSchema.parse(body);

    // Check for duplicate name
    const existing = await prisma.tag.findFirst({
      where: {
        organizationId: user?.primaryOrganizationId ?? '',
        name: data.name,
      },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TAG_001',
          message: 'Duplicate tag name',
          details: `Tag with name '${data.name}' already exists`,
        },
      }, { status: 409 });
    }

    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        color: data.color ?? '#808080',
        description: data.description,
        entityTypes: data.entityTypes ?? ['INVOICE', 'SUPPLIER'],
        isActive: data.isActive ?? true,
        organizationId: user!.primaryOrganizationId!,
      },
    });

    return NextResponse.json({
      success: true,
      data: { tag },
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: { code: 'VAL_001', message: 'Validation error', details: error.errors },
      }, { status: 400 });
    }
    console.error('[POST /api/system/tags] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// POST /api/system/tags/bulk
// Bulk tag/untag entities
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const body = await request.json();
    const { tagIds, entityType, entityIds, action } = BulkTagSchema.parse(body);

    if (action === 'ADD') {
      return NextResponse.json({
        success: false,
        error: { code: 'TAG_003', message: 'Tag associations not supported in this version' },
      }, { status: 501 });
    } else if (action === 'REMOVE') {
      return NextResponse.json({
        success: false,
        error: { code: 'TAG_003', message: 'Tag associations not supported in this version' },
      }, { status: 501 });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `${action === 'ADD' ? 'Tagged' : 'Untagged'} ${entityIds.length} ${entityType.toLowerCase()}(s)`,
        entityCount: entityIds.length,
        tagCount: tagIds.length,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: { code: 'VAL_001', message: 'Validation error', details: error.errors },
      }, { status: 400 });
    }
    console.error('[PATCH /api/system/tags/bulk] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// PUT /api/system/tags/[id]
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const tagId = url.pathname.split('/').pop();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const body = await request.json();
    const data = UpdateTagSchema.parse(body);

    const existing = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: { code: 'TAG_002', message: 'Tag not found' },
      }, { status: 404 });
    }

    const updated = await prisma.tag.update({
      where: { id: tagId },
      data: {
        name: data.name ?? existing.name,
        color: data.color ?? existing.color,
        description: data.description,
        entityTypes: data.entityTypes ?? existing.entityTypes,
        isActive: data.isActive ?? existing.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: { tag: updated },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: { code: 'VAL_001', message: 'Validation error', details: error.errors },
      }, { status: 400 });
    }
    console.error('[PUT /api/system/tags/[id]] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// DELETE /api/system/tags/[id]
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const tagId = url.pathname.split('/').pop();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const existing = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: { code: 'TAG_002', message: 'Tag not found' },
      }, { status: 404 });
    }

    // Hard delete
    await prisma.tag.delete({
      where: { id: tagId },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Tag deleted successfully', tagId },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[DELETE /api/system/tags/[id]] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}
