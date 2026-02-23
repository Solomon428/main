import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_ORG_ID = "default-org-id";
const DEFAULT_USER_ID = "default-user-id";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      organizationId: DEFAULT_ORG_ID,
      deletedAt: null,
    };

    if (entityType) {
      where.entityType = entityType;
    }
    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const [fields, total] = await Promise.all([
      prisma.customField.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ entityType: "asc" }, { displayOrder: "asc" }],
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          updatedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.customField.count({ where }),
    ]);

    const groupedFields = fields.reduce(
      (acc, field) => {
        const type = field.entityType;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push({
          ...field,
          validation: field.validation || {},
          options: field.options || [],
        });
        return acc;
      },
      {} as Record<string, unknown[]>
    );

    return NextResponse.json({
      success: true,
      data: {
        fields,
        grouped: groupedFields,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch custom fields" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      entityType,
      fieldName,
      fieldLabel,
      fieldType,
      description,
      options,
      defaultValue,
      isRequired,
      isSearchable,
      isFilterable,
      isActive,
      displayOrder,
      validation,
    } = body;

    if (!entityType || !fieldName || !fieldLabel || !fieldType) {
      return NextResponse.json(
        {
          success: false,
          error: "Entity type, field name, label, and type are required",
        },
        { status: 400 }
      );
    }

    const validFieldTypes = [
      "TEXT",
      "NUMBER",
      "DATE",
      "BOOLEAN",
      "SELECT",
      "MULTI_SELECT",
      "EMAIL",
      "URL",
      "PHONE",
      "TEXTAREA",
      "JSON",
    ];
    if (!validFieldTypes.includes(fieldType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid field type. Valid types: ${validFieldTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const existingField = await prisma.customField.findFirst({
      where: {
        organizationId: DEFAULT_ORG_ID,
        entityType,
        fieldName,
        deletedAt: null,
      },
    });

    if (existingField) {
      return NextResponse.json(
        {
          success: false,
          error: "A field with this name already exists for this entity type",
        },
        { status: 400 }
      );
    }

    const field = await prisma.customField.create({
      data: {
        organizationId: DEFAULT_ORG_ID,
        entityType,
        fieldName,
        fieldLabel,
        fieldType,
        description,
        options: options || null,
        defaultValue,
        isRequired: isRequired ?? false,
        isSearchable: isSearchable ?? true,
        isFilterable: isFilterable ?? true,
        isActive: isActive ?? true,
        displayOrder: displayOrder || 0,
        validation: validation || null,
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
        data: field,
        message: "Custom field created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating custom field:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create custom field" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      fieldLabel,
      description,
      options,
      defaultValue,
      isRequired,
      isSearchable,
      isFilterable,
      isActive,
      displayOrder,
      validation,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Field ID is required" },
        { status: 400 }
      );
    }

    const existingField = await prisma.customField.findFirst({
      where: { id, organizationId: DEFAULT_ORG_ID, deletedAt: null },
    });

    if (!existingField) {
      return NextResponse.json(
        { success: false, error: "Custom field not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      updatedById: DEFAULT_USER_ID,
    };

    if (fieldLabel !== undefined) updateData.fieldLabel = fieldLabel;
    if (description !== undefined) updateData.description = description;
    if (options !== undefined) updateData.options = options;
    if (defaultValue !== undefined) updateData.defaultValue = defaultValue;
    if (isRequired !== undefined) updateData.isRequired = isRequired;
    if (isSearchable !== undefined) updateData.isSearchable = isSearchable;
    if (isFilterable !== undefined) updateData.isFilterable = isFilterable;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (validation !== undefined) updateData.validation = validation;

    const field = await prisma.customField.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        updatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: field,
      message: "Custom field updated successfully",
    });
  } catch (error) {
    console.error("Error updating custom field:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update custom field" },
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
        { success: false, error: "Field ID is required" },
        { status: 400 }
      );
    }

    const existingField = await prisma.customField.findFirst({
      where: { id, organizationId: DEFAULT_ORG_ID, deletedAt: null },
    });

    if (!existingField) {
      return NextResponse.json(
        { success: false, error: "Custom field not found" },
        { status: 404 }
      );
    }

    await prisma.customField.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: DEFAULT_USER_ID,
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Custom field deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting custom field:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete custom field" },
      { status: 500 }
    );
  }
}
