import { prisma } from "../../lib/prisma";
import { generateSecureToken } from "../../security/crypto";

export async function createSession(
  userId: string,
  data?: {
    userAgent?: string;
    ipAddress?: string;
    deviceType?: string;
    browser?: string;
    os?: string;
  },
) {
  const sessionToken = generateSecureToken(32);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
      ...data,
    },
  });
}

export async function validateSession(sessionToken: string) {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session || !session.isValid) {
    return null;
  }

  if (session.expires < new Date()) {
    await invalidateSession(sessionToken, "EXPIRED");
    return null;
  }

  // Update last accessed
  await prisma.session.update({
    where: { sessionToken },
    data: { lastAccessedAt: new Date() },
  });

  return session;
}

export async function deleteSession(sessionToken: string) {
  return prisma.session.delete({
    where: { sessionToken },
  });
}

export async function invalidateSession(sessionToken: string, reason?: string) {
  return prisma.session.update({
    where: { sessionToken },
    data: {
      isValid: false,
      invalidatedAt: new Date(),
      invalidatedReason: reason,
    },
  });
}

export async function invalidateAllUserSessions(
  userId: string,
  exceptSessionToken?: string,
) {
  return prisma.session.updateMany({
    where: {
      userId,
      isValid: true,
      ...(exceptSessionToken && { sessionToken: { not: exceptSessionToken } }),
    },
    data: {
      isValid: false,
      invalidatedAt: new Date(),
      invalidatedReason: "USER_LOGOUT_ALL",
    },
  });
}

export async function cleanupExpiredSessions() {
  const result = await prisma.session.deleteMany({
    where: {
      expires: { lt: new Date() },
    },
  });

  return result.count;
}

export async function listUserSessions(userId: string) {
  return prisma.session.findMany({
    where: {
      userId,
      isValid: true,
      expires: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sessionToken: false,
      userAgent: true,
      ipAddress: true,
      deviceType: true,
      browser: true,
      os: true,
      createdAt: true,
      lastAccessedAt: true,
      expires: true,
    },
  });
}

export const findSessionsByUserId = listUserSessions;
