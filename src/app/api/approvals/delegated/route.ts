import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_ORG_ID = "default-org-id";
const DEFAULT_USER_ID = "default-user-id";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const delegatorId = searchParams.get("delegatorId");
    const delegateeId = searchParams.get("delegateeId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const now = new Date();

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (status === "active") {
      where.isActive = true;
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    } else if (status === "expired") {
      where.endDate = { lt: now };
    } else if (status === "inactive") {
      where.isActive = false;
    }

    if (delegatorId) {
      where.delegatorId = delegatorId;
    }
    if (delegateeId) {
      where.delegateeId = delegateeId;
    }

    const [delegations, total] = await Promise.all([
      prisma.delegatedApproval.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          delegator: {
            select: { id: true, name: true, email: true, role: true },
          },
          delegatee: {
            select: { id: true, name: true, email: true, role: true },
          },
          approvalChain: {
            select: { id: true, name: true, type: true },
          },
        },
      }),
      prisma.delegatedApproval.count({ where }),
    ]);

    const enrichedDelegations = delegations.map((d) => ({
      ...d,
      isActiveStatus:
        d.isActive &&
        new Date(d.startDate) <= now &&
        new Date(d.endDate) >= now,
      isExpired: new Date(d.endDate) < now,
      isPending: new Date(d.startDate) > now,
      daysRemaining: Math.ceil(
        (new Date(d.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    return NextResponse.json({
      success: true,
      data: enrichedDelegations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching delegated approvals:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch delegated approvals" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      delegatorId,
      delegateeId,
      approvalChainId,
      startDate,
      endDate,
      reason,
      notes,
      scope,
      specificCategories,
    } = body;

    if (!delegatorId || !delegateeId || !startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Delegator, delegatee, start date, and end date are required",
        },
        { status: 400 }
      );
    }

    if (delegatorId === delegateeId) {
      return NextResponse.json(
        { success: false, error: "Cannot delegate to yourself" },
        { status: 400 }
      );
    }

    const [delegator, delegatee] = await Promise.all([
      prisma.user.findUnique({ where: { id: delegatorId } }),
      prisma.user.findUnique({ where: { id: delegateeId } }),
    ]);

    if (!delegator || !delegatee) {
      return NextResponse.json(
        { success: false, error: "Delegator or delegatee not found" },
        { status: 404 }
      );
    }

    const overlappingDelegation = await prisma.delegatedApproval.findFirst({
      where: {
        delegatorId,
        delegateeId,
        deletedAt: null,
        isActive: true,
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(startDate) } },
              { endDate: { gte: new Date(startDate) } },
            ],
          },
          {
            AND: [
              { startDate: { lte: new Date(endDate) } },
              { endDate: { gte: new Date(endDate) } },
            ],
          },
        ],
      },
    });

    if (overlappingDelegation) {
      return NextResponse.json(
        {
          success: false,
          error: "An active delegation already exists for this period",
        },
        { status: 400 }
      );
    }

    const delegation = await prisma.delegatedApproval.create({
      data: {
        delegatorId,
        delegateeId,
        approvalChainId: approvalChainId || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true,
        reason,
        notes,
        scope: scope || "ALL",
        specificCategories: specificCategories || [],
      },
      include: {
        delegator: {
          select: { id: true, name: true, email: true },
        },
        delegatee: {
          select: { id: true, name: true, email: true },
        },
        approvalChain: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: delegation,
        message: "Delegation created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating delegation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create delegation" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, endDate, reason, notes, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Delegation ID is required" },
        { status: 400 }
      );
    }

    const existingDelegation = await prisma.delegatedApproval.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingDelegation) {
      return NextResponse.json(
        { success: false, error: "Delegation not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (reason !== undefined) updateData.reason = reason;
    if (notes !== undefined) updateData.notes = notes;
    if (isActive !== undefined) updateData.isActive = isActive;

    const delegation = await prisma.delegatedApproval.update({
      where: { id },
      data: updateData,
      include: {
        delegator: {
          select: { id: true, name: true, email: true },
        },
        delegatee: {
          select: { id: true, name: true, email: true },
        },
        approvalChain: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: delegation,
      message: "Delegation updated successfully",
    });
  } catch (error) {
    console.error("Error updating delegation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update delegation" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Delegation ID is required" },
        { status: 400 }
      );
    }

    const existingDelegation = await prisma.delegatedApproval.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingDelegation) {
      return NextResponse.json(
        { success: false, error: "Delegation not found" },
        { status: 404 }
      );
    }

    await prisma.delegatedApproval.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        cancelledAt: new Date(),
        cancelledBy: DEFAULT_USER_ID,
        cancelReason: "Revoked by user",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Delegation revoked successfully",
    });
  } catch (error) {
    console.error("Error revoking delegation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to revoke delegation" },
      { status: 500 }
    );
  }
}
