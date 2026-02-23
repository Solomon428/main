// src/app/api/suppliers/[id]/contracts/route.ts
// Supplier Contracts Management API
// Full CRUD operations for supplier contract lifecycle management
// Compliance: SOX Section 404 (Contract Controls), POPIA (Data Processing Agreements)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/observability/audit';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface RouteContext {
  params: {
    id: string; // Supplier ID
  };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateContractSchema = z.object({
  contractNumber: z.string().min(1, 'Contract number required').max(50),
  contractType: z.enum(['SERVICE', 'SUPPLY', 'MAINTENANCE', 'SUBSCRIPTION', 'RETAINER', 'PROJECT', 'FRAMEWORK', 'OTHER']),
  title: z.string().min(1, 'Contract title required').max(200),
  description: z.string().optional(),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  value: z.number().positive('Contract value must be positive'),
  currency: z.enum(['ZAR', 'USD', 'EUR', 'GBP', 'AED', 'CNY', 'JPY', 'AUD', 'CAD']),
  paymentTerms: z.number().int().min(0).max(365).default(30),
  renewalType: z.enum(['AUTO', 'MANUAL', 'NONE']).default('MANUAL'),
  renewalNoticeDays: z.number().int().min(0).max(365).default(30),
  status: z.enum(['DRAFT', 'ACTIVE', 'PENDING_APPROVAL', 'APPROVED', 'EXPIRED', 'TERMINATED', 'SUSPENDED']).default('DRAFT'),
  autoRenew: z.boolean().default(false),
  
  // Financial fields
  advancePaymentRequired: z.boolean().default(false),
  advancePaymentAmount: z.number().min(0).optional(),
  advancePaymentPercentage: z.number().min(0).max(100).optional(),
  retentionAmount: z.number().min(0).optional(),
  retentionPercentage: z.number().min(0).max(100).optional(),
  
  // Compliance fields
  complianceRequired: z.boolean().default(false),
  insuranceRequired: z.boolean().default(false),
  insuranceCertificateUrl: z.string().url().optional(),
  taxClearanceRequired: z.boolean().default(false),
  taxClearanceCertificateUrl: z.string().url().optional(),
  
  // SLA fields
  slaIncluded: z.boolean().default(false),
  slaResponseTime: z.number().int().min(0).optional(), // in hours
  slaResolutionTime: z.number().int().min(0).optional(), // in hours
  slaUptime: z.number().min(0).max(100).optional(), // percentage
  
  // Penalty clauses
  penaltyClauseIncluded: z.boolean().default(false),
  penaltyAmount: z.number().min(0).optional(),
  penaltyPercentage: z.number().min(0).max(100).optional(),
  penaltyTriggers: z.array(z.string()).optional(),
  
  // Termination clauses
  terminationNoticeDays: z.number().int().min(0).max(365).default(30),
  terminationForConvenience: z.boolean().default(false),
  terminationPenalty: z.number().min(0).optional(),
  
  // Custom fields
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
  
  // Document attachments
  documentUrls: z.array(z.string().url()).optional(),
  signedCopyUrl: z.string().url().optional(),
  
  // Contacts
  supplierSignatoryName: z.string().optional(),
  supplierSignatoryEmail: z.string().email().optional(),
  supplierSignatoryTitle: z.string().optional(),
  organizationSignatoryName: z.string().optional(),
  organizationSignatoryEmail: z.string().email().optional(),
  organizationSignatoryTitle: z.string().optional(),
  
  // Approval fields
  approvalRequired: z.boolean().default(true),
  approvedBy: z.string().optional(),
  approvedAt: z.string().datetime().optional(),
  rejectedBy: z.string().optional(),
  rejectedAt: z.string().datetime().optional(),
  rejectionReason: z.string().optional(),
});

const UpdateContractSchema = CreateContractSchema.partial();

const ContractQuerySchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'PENDING_APPROVAL', 'APPROVED', 'EXPIRED', 'TERMINATED', 'SUSPENDED']).optional(),
  contractType: z.enum(['SERVICE', 'SUPPLY', 'MAINTENANCE', 'SUBSCRIPTION', 'RETAINER', 'PROJECT', 'FRAMEWORK', 'OTHER']).optional(),
  expiringInDays: z.string().transform(Number).pipe(z.number().int().min(0).max(365)).optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().int().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('20'),
  sortBy: z.enum(['contractNumber', 'title', 'startDate', 'endDate', 'value', 'status', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if user has permission to manage supplier contracts
 */
async function checkContractPermission(userId: string, supplierId: string, action: 'read' | 'write'): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      primaryOrganizationId: true,
    },
  });

  if (!user) return false;

  // System admins and finance managers can manage all contracts
  if (['SYSTEM_ADMIN', 'SUPER_ADMIN', 'FINANCIAL_MANAGER', 'GROUP_FINANCIAL_MANAGER'].includes(user.role)) {
    return true;
  }

  // Check if supplier belongs to user's organization
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      organizationId: user.primaryOrganizationId ?? '',
    },
  });

  if (!supplier) return false;

  // For read operations, procurement and credit clerks can view
  if (action === 'read' && ['PROCUREMENT_OFFICER', 'CREDIT_CLERK', 'BRANCH_MANAGER'].includes(user.role)) {
    return true;
  }

  // For write operations, only certain roles can create/update
  if (action === 'write' && ['PROCUREMENT_OFFICER', 'BRANCH_MANAGER'].includes(user.role)) {
    return true;
  }

  return false;
}

/**
 * Calculate contract expiry status
 */
function calculateExpiryStatus(endDate: Date): {
  isExpired: boolean;
  daysUntilExpiry: number;
  expiryStatus: 'EXPIRED' | 'EXPIRING_SOON' | 'ACTIVE' | 'LONG_TERM';
} {
  const now = new Date();
  const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return {
      isExpired: true,
      daysUntilExpiry,
      expiryStatus: 'EXPIRED',
    };
  } else if (daysUntilExpiry <= 30) {
    return {
      isExpired: false,
      daysUntilExpiry,
      expiryStatus: 'EXPIRING_SOON',
    };
  } else if (daysUntilExpiry <= 90) {
    return {
      isExpired: false,
      daysUntilExpiry,
      expiryStatus: 'ACTIVE',
    };
  } else {
    return {
      isExpired: false,
      daysUntilExpiry,
      expiryStatus: 'LONG_TERM',
    };
  }
}

// ============================================================================
// GET /api/suppliers/[id]/contracts
// List all contracts for a supplier
// ============================================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_001',
            message: 'Authentication required',
            details: 'Valid session token required to access this endpoint',
          },
        },
        { status: 401 }
      );
    }

    const { id: supplierId } = context.params;

    // Permission check
    const hasPermission = await checkContractPermission(session.user.id, supplierId, 'read');
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_002',
            message: 'Insufficient permissions',
            details: 'You do not have permission to view contracts for this supplier',
          },
        },
        { status: 403 }
      );
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true, status: true },
    });

    if (!supplier) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SUP_001',
            message: 'Supplier not found',
            details: `No supplier found with ID: ${supplierId}`,
          },
        },
        { status: 404 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = ContractQuerySchema.parse(Object.fromEntries(searchParams));

    // Build where clause
    const where: any = {
      supplierId,
      deletedAt: null,
    };

    if (queryParams.status) {
      where.status = queryParams.status;
    }

    if (queryParams.contractType) {
      where.contractType = queryParams.contractType;
    }

    if (queryParams.expiringInDays !== undefined) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + queryParams.expiringInDays);
      where.endDate = {
        lte: expiryDate,
        gte: new Date(),
      };
    }

    if (queryParams.search) {
      where.OR = [
        { contractNumber: { contains: queryParams.search, mode: 'insensitive' } },
        { title: { contains: queryParams.search, mode: 'insensitive' } },
        { description: { contains: queryParams.search, mode: 'insensitive' } },
      ];
    }

    // Execute query with pagination
    const [contracts, total] = await Promise.all([
      prisma.supplierContract.findMany({
        where,
        select: {
          id: true,
          contractNumber: true,
          contractType: true,
          startDate: true,
          endDate: true,
          value: true,
          terms: true,
          paymentTerms: true,
          status: true,
          autoRenew: true,
          renewalNoticeDays: true,
          documentUrl: true,
          signedAt: true,
          createdAt: true,
          updatedAt: true,
          supplier: {
            select: {
              id: true,
              name: true,
              supplierCode: true,
            },
          },
        },
        skip: (queryParams.page - 1) * queryParams.limit,
        take: queryParams.limit,
        orderBy: {
          [queryParams.sortBy]: queryParams.sortOrder,
        },
      }),
      prisma.supplierContract.count({ where }),
    ]);

    // Enrich contracts with computed fields
    const enrichedContracts = contracts.map(contract => {
      const expiryInfo = contract.endDate ? calculateExpiryStatus(contract.endDate) : { isExpired: false, daysUntilExpiry: 0, expiryStatus: 'ACTIVE' as const };
      return {
        ...contract,
        ...expiryInfo,
      };
    });

    // Calculate summary statistics
    const stats = {
      total,
      active: await prisma.supplierContract.count({
        where: { ...where, status: 'ACTIVE' },
      }),
      expiringSoon: enrichedContracts.filter(c => c.expiryStatus === 'EXPIRING_SOON').length,
      expired: enrichedContracts.filter(c => c.isExpired).length,
      totalValue: contracts.reduce((sum, c) => sum + Number(c.value), 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        contracts: enrichedContracts,
        pagination: {
          page: queryParams.page,
          limit: queryParams.limit,
          total,
          totalPages: Math.ceil(total / queryParams.limit),
        },
        stats,
        supplier: {
          id: supplier.id,
          name: supplier.name,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VAL_001',
            message: 'Validation error',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    console.error('[GET /api/suppliers/[id]/contracts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SYS_001',
          message: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/suppliers/[id]/contracts
// Create new contract for supplier
// ============================================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_001',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    const { id: supplierId } = context.params;

    // Permission check
    const hasPermission = await checkContractPermission(session.user.id, supplierId, 'write');
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_002',
            message: 'Insufficient permissions',
          },
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = CreateContractSchema.parse(body);

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true,
        name: true,
        organizationId: true,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SUP_001',
            message: 'Supplier not found',
          },
        },
        { status: 404 }
      );
    }

    // Check for duplicate contract number
    const existingContract = await prisma.supplierContract.findFirst({
      where: {
        supplierId,
        contractNumber: validatedData.contractNumber,
        deletedAt: null,
      },
    });

    if (existingContract) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CON_001',
            message: 'Duplicate contract number',
            details: `Contract number ${validatedData.contractNumber} already exists for this supplier`,
          },
        },
        { status: 409 }
      );
    }

    // Validate date logic
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    if (endDate <= startDate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VAL_002',
            message: 'Invalid date range',
            details: 'End date must be after start date',
          },
        },
        { status: 400 }
      );
    }

    // Create contract
    const contract = await prisma.supplierContract.create({
      data: {
        ...validatedData,
        supplierId,
        organizationId: supplier.organizationId,
        startDate,
        endDate,
        createdById: session.user.id,
        updatedById: session.user.id,
      },
        include: {
        supplier: {
          select: {
            id: true,
            name: true,
            supplierCode: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log audit event
    await logAuditEvent({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'SUPPLIER_CONTRACT',
      entityId: contract.id,
      organizationId: supplier.organizationId,
      oldValue: undefined,
      newValue: contract,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // Calculate expiry information
    const expiryInfo = contract.endDate ? calculateExpiryStatus(contract.endDate) : { isExpired: false, daysUntilExpiry: 0, expiryStatus: 'ACTIVE' as const };

    return NextResponse.json({
      success: true,
      data: {
        contract: {
          ...contract,
          ...expiryInfo,
        },
      },
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VAL_001',
            message: 'Validation error',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    console.error('[POST /api/suppliers/[id]/contracts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SYS_001',
          message: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      },
      { status: 500 }
    );
  }
}
