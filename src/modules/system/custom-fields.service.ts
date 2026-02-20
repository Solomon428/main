// ============================================================================
// Custom Fields Service
// ============================================================================

import { prisma } from "../../db/prisma";
import { EntityType } from "../../domain/enums/EntityType";

export interface CreateCustomFieldInput {
  organizationId: string;
  name: string;
  key: string;
  entityType: EntityType;
  fieldType:
    | "TEXT"
    | "NUMBER"
    | "DATE"
    | "BOOLEAN"
    | "SELECT"
    | "MULTI_SELECT"
    | "URL";
  description?: string;
  isRequired?: boolean;
  defaultValue?: string | number | boolean | Date | string[];
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface UpdateCustomFieldInput {
  name?: string;
  description?: string;
  isRequired?: boolean;
  defaultValue?: string | number | boolean | Date | string[];
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  isActive?: boolean;
}

/**
 * List custom fields for an organization
 */
export async function listCustomFields(
  organizationId: string,
  options?: {
    entityType?: EntityType;
    isActive?: boolean;
    page?: number;
    limit?: number;
  },
) {
  const where: any = { organizationId };

  if (options?.entityType) where.entityType = options.entityType;
  if (options?.isActive !== undefined) where.isActive = options.isActive;

  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const skip = (page - 1) * limit;

  const [fields, total] = await Promise.all([
    prisma.customField.findMany({
      where,
      orderBy: [{ entityType: "asc" }, { displayOrder: "asc" }],
      skip,
      take: limit,
    }),
    prisma.customField.count({ where }),
  ]);

  return {
    fields,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a custom field by ID
 */
export async function getCustomField(id: string) {
  return prisma.customField.findUnique({
    where: { id },
  });
}

/**
 * Get custom field by key
 */
export async function getCustomFieldByKey(
  organizationId: string,
  entityType: EntityType,
  key: string,
) {
  return prisma.customField.findFirst({
    where: {
      organizationId,
      entityType,
      key,
    },
  });
}

/**
 * Create a custom field
 */
export async function createCustomField(data: CreateCustomFieldInput) {
  // Check if key already exists for this entity type
  const existing = await prisma.customField.findFirst({
    where: {
      organizationId: data.organizationId,
      entityType: data.entityType,
      key: data.key,
    },
  });

  if (existing) {
    throw new Error(
      `Custom field with key "${data.key}" already exists for this entity type`,
    );
  }

  return prisma.customField.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      key: data.key,
      entityType: data.entityType,
      fieldType: data.fieldType,
      description: data.description,
      isRequired: data.isRequired || false,
      defaultValue: data.defaultValue,
      options: data.options || [],
      validation: data.validation,
      isActive: true,
    },
  });
}

/**
 * Update a custom field
 */
export async function updateCustomField(
  id: string,
  data: UpdateCustomFieldInput,
) {
  return prisma.customField.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete a custom field
 */
export async function deleteCustomField(id: string) {
  return prisma.customField.delete({
    where: { id },
  });
}

/**
 * Reorder custom fields
 */
export async function reorderCustomFields(
  organizationId: string,
  entityType: EntityType,
  fieldOrders: { id: string; displayOrder: number }[],
) {
  const updates = fieldOrders.map((item) =>
    prisma.customField.update({
      where: {
        id: item.id,
        organizationId,
        entityType,
      },
      data: {
        displayOrder: item.displayOrder,
      },
    }),
  );

  return prisma.$transaction(updates);
}

/**
 * Get custom fields for entity with values
 */
export async function getEntityCustomFields(
  organizationId: string,
  entityType: EntityType,
  entityId: string,
) {
  const [fields, values] = await Promise.all([
    prisma.customField.findMany({
      where: {
        organizationId,
        entityType,
        isActive: true,
      },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.customFieldValue.findMany({
      where: {
        entityType,
        entityId,
      },
    }),
  ]);

  // Map values to fields
  return fields.map((field) => ({
    ...field,
    value:
      values.find((v) => v.customFieldId === field.id)?.value ||
      field.defaultValue,
  }));
}

/**
 * Set custom field value for an entity
 */
export async function setCustomFieldValue(
  customFieldId: string,
  entityType: EntityType,
  entityId: string,
  value: unknown,
) {
  const customField = await prisma.customField.findUnique({
    where: { id: customFieldId },
  });

  if (!customField) {
    throw new Error("Custom field not found");
  }

  if (customField.entityType !== entityType) {
    throw new Error("Entity type mismatch");
  }

  // Validate value
  validateFieldValue(customField, value);

  // Upsert value
  const existing = await prisma.customFieldValue.findFirst({
    where: {
      customFieldId,
      entityType,
      entityId,
    },
  });

  if (existing) {
    return prisma.customFieldValue.update({
      where: { id: existing.id },
      data: {
        value,
        updatedAt: new Date(),
      },
    });
  }

  return prisma.customFieldValue.create({
    data: {
      customFieldId,
      entityType,
      entityId,
      value,
    },
  });
}

/**
 * Set multiple custom field values
 */
export async function setMultipleCustomFieldValues(
  entityType: EntityType,
  entityId: string,
  values: Record<string, unknown>,
) {
  const fields = await prisma.customField.findMany({
    where: {
      entityType,
      isActive: true,
      key: { in: Object.keys(values) },
    },
  });

  const updates = Object.entries(values).map(([key, value]) => {
    const field = fields.find((f) => f.key === key);
    if (!field) {
      throw new Error(`Custom field "${key}" not found`);
    }
    return setCustomFieldValue(field.id, entityType, entityId, value);
  });

  return prisma.$transaction(updates);
}

/**
 * Delete custom field value
 */
export async function deleteCustomFieldValue(
  customFieldId: string,
  entityType: EntityType,
  entityId: string,
) {
  return prisma.customFieldValue.deleteMany({
    where: {
      customFieldId,
      entityType,
      entityId,
    },
  });
}

/**
 * Get custom field statistics
 */
export async function getCustomFieldStats(organizationId: string) {
  const [totalFields, activeFields, fieldsByType] = await Promise.all([
    prisma.customField.count({ where: { organizationId } }),
    prisma.customField.count({ where: { organizationId, isActive: true } }),
    prisma.customField.groupBy({
      by: ["entityType"],
      where: { organizationId },
      _count: { entityType: true },
    }),
  ]);

  return {
    totalFields,
    activeFields,
    inactiveFields: totalFields - activeFields,
    fieldsByType: fieldsByType.reduce(
      (acc, item) => {
        acc[item.entityType] = item._count.entityType;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };
}

// Helper function to validate field value
function validateFieldValue(
  field: {
    fieldType: string;
    isRequired: boolean;
    options: string[];
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      minLength?: number;
      maxLength?: number;
    };
  },
  value: unknown,
) {
  if (value === null || value === undefined || value === "") {
    if (field.isRequired) {
      throw new Error("This field is required");
    }
    return;
  }

  switch (field.fieldType) {
    case "TEXT":
      if (typeof value !== "string") {
        throw new Error("Value must be a string");
      }
      if (
        field.validation?.minLength &&
        value.length < field.validation.minLength
      ) {
        throw new Error(`Minimum length is ${field.validation.minLength}`);
      }
      if (
        field.validation?.maxLength &&
        value.length > field.validation.maxLength
      ) {
        throw new Error(`Maximum length is ${field.validation.maxLength}`);
      }
      if (
        field.validation?.pattern &&
        !new RegExp(field.validation.pattern).test(value)
      ) {
        throw new Error("Value does not match required pattern");
      }
      break;

    case "NUMBER":
      if (typeof value !== "number") {
        throw new Error("Value must be a number");
      }
      if (field.validation?.min !== undefined && value < field.validation.min) {
        throw new Error(`Minimum value is ${field.validation.min}`);
      }
      if (field.validation?.max !== undefined && value > field.validation.max) {
        throw new Error(`Maximum value is ${field.validation.max}`);
      }
      break;

    case "BOOLEAN":
      if (typeof value !== "boolean") {
        throw new Error("Value must be a boolean");
      }
      break;

    case "DATE":
      if (!(value instanceof Date) && isNaN(Date.parse(value as string))) {
        throw new Error("Value must be a valid date");
      }
      break;

    case "SELECT":
      if (typeof value !== "string" || !field.options.includes(value)) {
        throw new Error("Invalid option selected");
      }
      break;

    case "MULTI_SELECT":
      if (
        !Array.isArray(value) ||
        !value.every((v) => field.options.includes(v))
      ) {
        throw new Error("Invalid options selected");
      }
      break;
  }
}
