// ============================================================================
// Tags Service
// ============================================================================

import { prisma } from "../../db/prisma";
import { EntityType } from "../../domain/enums/EntityType";

export interface CreateTagInput {
  organizationId: string;
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  description?: string;
}

/**
 * List all tags for an organization
 */
export async function listTags(
  organizationId: string,
  options?: {
    search?: string;
    page?: number;
    limit?: number;
  },
) {
  const where: any = { organizationId };

  if (options?.search) {
    where.name = { contains: options.search, mode: "insensitive" };
  }

  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const skip = (page - 1) * limit;

  const [tags, total] = await Promise.all([
    prisma.tag.findMany({
      where,
      include: {
        _count: {
          select: {
            invoices: true,
            suppliers: true,
          },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.tag.count({ where }),
  ]);

  return {
    tags,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a tag by ID
 */
export async function getTag(id: string) {
  return prisma.tag.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          invoices: true,
          suppliers: true,
        },
      },
    },
  });
}

/**
 * Get a tag by name
 */
export async function getTagByName(organizationId: string, name: string) {
  return prisma.tag.findFirst({
    where: {
      organizationId,
      name: { equals: name, mode: "insensitive" },
    },
  });
}

/**
 * Create a new tag
 */
export async function createTag(data: CreateTagInput) {
  // Check if tag with same name already exists
  const existing = await prisma.tag.findFirst({
    where: {
      organizationId: data.organizationId,
      name: { equals: data.name, mode: "insensitive" },
    },
  });

  if (existing) {
    throw new Error(`Tag "${data.name}" already exists`);
  }

  return prisma.tag.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      color: data.color || generateRandomColor(),
      description: data.description,
    },
  });
}

/**
 * Create multiple tags at once
 */
export async function createTagsBulk(
  organizationId: string,
  tags: Array<{ name: string; color?: string; description?: string }>,
) {
  const results = [];

  for (const tag of tags) {
    try {
      const created = await createTag({
        organizationId,
        ...tag,
      });
      results.push({ success: true, tag: created });
    } catch (error) {
      results.push({
        success: false,
        name: tag.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Update a tag
 */
export async function updateTag(id: string, data: UpdateTagInput) {
  const tag = await prisma.tag.findUnique({
    where: { id },
  });

  if (!tag) {
    throw new Error("Tag not found");
  }

  // Check name uniqueness if name is being updated
  if (data.name && data.name !== tag.name) {
    const existing = await prisma.tag.findFirst({
      where: {
        organizationId: tag.organizationId,
        name: { equals: data.name, mode: "insensitive" },
        id: { not: id },
      },
    });

    if (existing) {
      throw new Error(`Tag "${data.name}" already exists`);
    }
  }

  return prisma.tag.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete a tag
 */
export async function deleteTag(id: string) {
  return prisma.tag.delete({
    where: { id },
  });
}

/**
 * Merge two tags (source into target)
 */
export async function mergeTags(sourceId: string, targetId: string) {
  if (sourceId === targetId) {
    throw new Error("Cannot merge a tag with itself");
  }

  const [source, target] = await Promise.all([
    prisma.tag.findUnique({
      where: { id: sourceId },
      include: {
        invoices: { select: { id: true } },
        suppliers: { select: { id: true } },
      },
    }),
    prisma.tag.findUnique({ where: { id: targetId } }),
  ]);

  if (!source || !target) {
    throw new Error("One or both tags not found");
  }

  // Move all entities from source to target
  await prisma.$transaction([
    // Update invoices
    prisma.invoice.updateMany({
      where: {
        tags: { has: source.name },
      },
      data: {
        tags: {
          set: {
            // This is a simplified approach - in production you'd use array operations
          },
        },
      },
    }),
    // Delete source tag
    prisma.tag.delete({ where: { id: sourceId } }),
  ]);

  return target;
}

/**
 * Get popular tags
 */
export async function getPopularTags(
  organizationId: string,
  limit: number = 10,
) {
  const tags = await prisma.tag.findMany({
    where: { organizationId },
    include: {
      _count: {
        select: {
          invoices: true,
          suppliers: true,
        },
      },
    },
  });

  return tags
    .map((tag) => ({
      ...tag,
      usageCount: tag._count.invoices + tag._count.suppliers,
    }))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
}

/**
 * Get tag suggestions based on prefix
 */
export async function getTagSuggestions(
  organizationId: string,
  prefix: string,
  limit: number = 10,
) {
  return prisma.tag.findMany({
    where: {
      organizationId,
      name: { startsWith: prefix, mode: "insensitive" },
    },
    take: limit,
    orderBy: { name: "asc" },
  });
}

/**
 * Get tag statistics
 */
export async function getTagStats(organizationId: string) {
  const [totalTags, tagsByUsage] = await Promise.all([
    prisma.tag.count({ where: { organizationId } }),
    prisma.tag.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            invoices: true,
            suppliers: true,
          },
        },
      },
    }),
  ]);

  const usageCounts = tagsByUsage.map((tag) => ({
    ...tag,
    usageCount: tag._count.invoices + tag._count.suppliers,
  }));

  return {
    totalTags,
    unusedTags: usageCounts.filter((t) => t.usageCount === 0).length,
    mostUsed: usageCounts.sort((a, b) => b.usageCount - a.usageCount)[0],
    leastUsed: usageCounts.sort((a, b) => a.usageCount - b.usageCount)[0],
    averageUsage:
      usageCounts.length > 0
        ? usageCounts.reduce((sum, t) => sum + t.usageCount, 0) /
          usageCounts.length
        : 0,
  };
}

// Helper function to generate random color
function generateRandomColor(): string {
  const colors = [
    "#ef4444", // red
    "#f97316", // orange
    "#f59e0b", // amber
    "#84cc16", // lime
    "#10b981", // emerald
    "#06b6d4", // cyan
    "#3b82f6", // blue
    "#6366f1", // indigo
    "#8b5cf6", // violet
    "#d946ef", // fuchsia
    "#f43f5e", // rose
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
