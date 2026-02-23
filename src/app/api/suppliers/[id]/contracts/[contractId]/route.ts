import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

const DEFAULT_USER_ID = "default-user-id";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; contractId: string } }
) {
  try {
    const contract = await prisma.supplierContract.findFirst({
      where: {
        id: params.contractId,
        supplierId: params.id,
        deletedAt: null,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        updatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { success: false, error: "Contract not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const endDate = contract.endDate;
    const daysUntilExpiry = endDate
      ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return NextResponse.json({
      success: true,
      data: {
        ...contract,
        value: contract.value ? Number(contract.value) : null,
        daysUntilExpiry,
        isExpired: daysUntilExpiry !== null && daysUntilExpiry <= 0,
        isExpiringSoon:
          daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0,
      },
    });
  } catch (error) {
    console.error("Error fetching contract:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch contract" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; contractId: string } }
) {
  try {
    const body = await req.json();

    const existingContract = await prisma.supplierContract.findFirst({
      where: {
        id: params.contractId,
        supplierId: params.id,
        deletedAt: null,
      },
    });

    if (!existingContract) {
      return NextResponse.json(
        { success: false, error: "Contract not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      updatedById: DEFAULT_USER_ID,
    };

    if (body.contractNumber !== undefined)
      updateData.contractNumber = body.contractNumber;
    if (body.contractType !== undefined) updateData.contractType = body.contractType;
    if (body.startDate !== undefined)
      updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined)
      updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.value !== undefined)
      updateData.value = body.value ? new Decimal(body.value) : null;
    if (body.terms !== undefined) updateData.terms = body.terms;
    if (body.paymentTerms !== undefined) updateData.paymentTerms = body.paymentTerms;
    if (body.autoRenew !== undefined) updateData.autoRenew = body.autoRenew;
    if (body.renewalNoticeDays !== undefined)
      updateData.renewalNoticeDays = body.renewalNoticeDays;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.documentUrl !== undefined) updateData.documentUrl = body.documentUrl;
    if (body.signedAt !== undefined)
      updateData.signedAt = body.signedAt ? new Date(body.signedAt) : null;

    const contract = await prisma.supplierContract.update({
      where: { id: params.contractId },
      data: updateData,
      include: {
        supplier: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        updatedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...contract,
        value: contract.value ? Number(contract.value) : null,
      },
      message: "Contract updated successfully",
    });
  } catch (error) {
    console.error("Error updating contract:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update contract" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; contractId: string } }
) {
  try {
    const existingContract = await prisma.supplierContract.findFirst({
      where: {
        id: params.contractId,
        supplierId: params.id,
        deletedAt: null,
      },
    });

    if (!existingContract) {
      return NextResponse.json(
        { success: false, error: "Contract not found" },
        { status: 404 }
      );
    }

    await prisma.supplierContract.update({
      where: { id: params.contractId },
      data: {
        deletedAt: new Date(),
        updatedById: DEFAULT_USER_ID,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Contract deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting contract:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete contract" },
      { status: 500 }
    );
  }
}
