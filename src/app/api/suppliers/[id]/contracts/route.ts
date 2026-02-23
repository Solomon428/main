import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

const DEFAULT_ORG_ID = "default-org-id";
const DEFAULT_USER_ID = "default-user-id";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const contractType = searchParams.get("contractType");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      supplierId: params.id,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }
    if (contractType) {
      where.contractType = contractType;
    }

    const [contracts, total] = await Promise.all([
      prisma.supplierContract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.supplierContract.count({ where }),
    ]);

    const now = new Date();
    const enrichedContracts = contracts.map((contract) => {
      const endDate = contract.endDate;
      const daysUntilExpiry = endDate
        ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

      return {
        ...contract,
        value: contract.value ? Number(contract.value) : null,
        daysUntilExpiry,
        isExpiringSoon,
        isExpired,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedContracts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching supplier contracts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch supplier contracts" },
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
    const {
      contractNumber,
      contractType,
      startDate,
      endDate,
      value,
      terms,
      paymentTerms,
      autoRenew,
      renewalNoticeDays,
      documentUrl,
    } = body;

    if (!startDate) {
      return NextResponse.json(
        { success: false, error: "Start date is required" },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id: params.id, deletedAt: null },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );
    }

    const contract = await prisma.supplierContract.create({
      data: {
        organizationId: DEFAULT_ORG_ID,
        supplierId: params.id,
        contractNumber: contractNumber || `CTR-${Date.now()}`,
        contractType: contractType || "STANDARD",
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        value: value ? new Decimal(value) : null,
        terms,
        paymentTerms: paymentTerms || supplier.paymentTerms,
        autoRenew: autoRenew ?? false,
        renewalNoticeDays: renewalNoticeDays || 30,
        status: "DRAFT",
        documentUrl,
        createdById: DEFAULT_USER_ID,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...contract,
          value: contract.value ? Number(contract.value) : null,
        },
        message: "Contract created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating supplier contract:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create supplier contract" },
      { status: 500 }
    );
  }
}
