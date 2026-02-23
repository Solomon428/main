import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_ORG_ID = "default-org-id";
const DEFAULT_USER_ID = "default-user-id";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      organizationId: DEFAULT_ORG_ID,
    };

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const [tags, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ name: "asc" }],
      }),
      prisma.tag.count({ where }),
    ]);

    const groupedTags = tags.reduce(
      (acc, tag) => {
        const entityTypes = tag.entityTypes || [];
        entityTypes.forEach((type) => {
          if (!acc[type]) {
            acc[type] = [];
          }
          acc[type].push(tag);
        });
        return acc;
      },
      {} as Record<string, unknown[]>
    );

    return NextResponse.json({
      success: true,
      data: {
        tags,
        grouped: groupedTags,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, color, description, entityTypes, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Tag name is required" },
        { status: 400 }
      );
    }

    const existingTag = await prisma.tag.findFirst({
      where: {
        organizationId: DEFAULT_ORG_ID,
        name: name.toLowerCase(),
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { success: false, error: "A tag with this name already exists" },
        { status: 400 }
      );
    }

    const validEntityTypes = [
      "INVOICE",
      "SUPPLIER",
      "PAYMENT",
      "APPROVAL",
      "CONTRACT",
      "USER",
    ];
    const sanitizedEntityTypes = (entityTypes || ["INVOICE"]).filter((t: string) =>
      validEntityTypes.includes(t)
    );

    const tag = await prisma.tag.create({
      data: {
        organizationId: DEFAULT_ORG_ID,
        name: name.toLowerCase(),
        color: color || "#808080",
        description,
        entityTypes: sanitizedEntityTypes,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: tag,
        message: "Tag created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create tag" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, color, description, entityTypes, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Tag ID is required" },
        { status: 400 }
      );
    }

    const existingTag = await prisma.tag.findFirst({
      where: { id, organizationId: DEFAULT_ORG_ID },
    });

    if (!existingTag) {
      return NextResponse.json(
        { success: false, error: "Tag not found" },
        { status: 404 }
      );
    }

    if (name && name !== existingTag.name) {
      const duplicateTag = await prisma.tag.findFirst({
        where: {
          organizationId: DEFAULT_ORG_ID,
          name: name.toLowerCase(),
          NOT: { id },
        },
      });

      if (duplicateTag) {
        return NextResponse.json(
          { success: false, error: "A tag with this name already exists" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.toLowerCase();
    if (color !== undefined) updateData.color = color;
    if (description !== undefined) updateData.description = description;
    if (entityTypes !== undefined) updateData.entityTypes = entityTypes;
    if (isActive !== undefined) updateData.isActive = isActive;

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: tag,
      message: "Tag updated successfully",
    });
  } catch (error) {
    console.error("Error updating tag:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update tag" },
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
        { success: false, error: "Tag ID is required" },
        { status: 400 }
      );
    }

    const existingTag = await prisma.tag.findFirst({
      where: { id, organizationId: DEFAULT_ORG_ID },
    });

    if (!existingTag) {
      return NextResponse.json(
        { success: false, error: "Tag not found" },
        { status: 404 }
      );
    }

    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, tagIds, entityType, entityIds } = body;

    if (!action || !tagIds || !entityType || !entityIds) {
      return NextResponse.json(
        {
          success: false,
          error: "Action, tagIds, entityType, and entityIds are required",
        },
        { status: 400 }
      );
    }

    if (action !== "tag" && action !== "untag") {
      return NextResponse.json(
        { success: false, error: "Action must be 'tag' or 'untag'" },
        { status: 400 }
      );
    }

    const tags = await prisma.tag.findMany({
      where: {
        id: { in: tagIds },
        organizationId: DEFAULT_ORG_ID,
      },
    });

    if (tags.length !== tagIds.length) {
      return NextResponse.json(
        { success: false, error: "Some tags not found" },
        { status: 404 }
      );
    }

    let updatedCount = 0;

    if (entityType === "SUPPLIER") {
      for (const entityId of entityIds) {
        const supplier = await prisma.supplier.findFirst({
          where: { id: entityId, organizationId: DEFAULT_ORG_ID },
        });

        if (supplier) {
          const currentTags = supplier.tags || [];
          let newTags: string[];

          if (action === "tag") {
            newTags = [...new Set([...currentTags, ...tagIds])];
          } else {
            newTags = currentTags.filter((t) => !tagIds.includes(t));
          }

          await prisma.supplier.update({
            where: { id: entityId },
            data: { tags: newTags },
          });

          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        action,
        entityType,
        updatedCount,
      },
      message: `Successfully ${action === "tag" ? "tagged" : "untagged"} ${updatedCount} entities`,
    });
  } catch (error) {
    console.error("Error bulk tagging:", error);
    return NextResponse.json(
      { success: false, error: "Failed to perform bulk tag operation" },
      { status: 500 }
    );
  }
}
