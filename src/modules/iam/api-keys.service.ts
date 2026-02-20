import { prisma } from "../../lib/prisma";
import {
  hashApiKey,
  generateApiKey as generateNewApiKey,
} from "../../security/hashing";
import { generateId } from "../../utils/ids";

export async function generateApiKey(
  userId: string,
  organizationId: string,
  data: {
    name: string;
    permissions: string[];
    scopes: string[];
    expiresAt?: Date;
    rateLimit?: number;
  },
) {
  const { key, prefix } = generateNewApiKey();
  const keyHash = hashApiKey(key);

  await prisma.apiKey.create({
    data: {
      id: generateId(),
      name: data.name,
      keyHash,
      prefix,
      userId,
      organizationId,
      permissions: data.permissions,
      scopes: data.scopes,
      expiresAt: data.expiresAt,
      rateLimit: data.rateLimit || 1000,
    },
  });

  // Return the full key only once
  return { key, prefix };
}

export async function validateApiKey(apiKey: string) {
  const prefix = apiKey.split("_")[0] + "_" + apiKey.split("_")[1];
  const keyHash = hashApiKey(apiKey);

  const keyRecord = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      user: true,
      organization: true,
    },
  });

  if (!keyRecord) {
    return null;
  }

  // Update last used
  await prisma.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return keyRecord;
}

export async function revokeApiKey(
  keyId: string,
  revokedBy: string,
  reason?: string,
) {
  return prisma.apiKey.update({
    where: { id: keyId },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedBy,
      revokedReason: reason,
    },
  });
}

export async function listApiKeys(
  organizationId: string,
  options?: {
    userId?: string;
    isActive?: boolean;
  },
) {
  return prisma.apiKey.findMany({
    where: {
      organizationId,
      ...(options?.userId && { userId: options.userId }),
      ...(options?.isActive !== undefined && { isActive: options.isActive }),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      permissions: true,
      scopes: true,
      rateLimit: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      revokedAt: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function checkRateLimit(keyId: string): Promise<boolean> {
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: keyId },
    select: { rateLimit: true, rateLimitWindow: true },
  });

  if (!apiKey) return false;

  // Implement rate limiting logic here
  // This is a simplified version - you'd typically use Redis
  return true;
}
