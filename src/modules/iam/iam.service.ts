// ============================================================================
// IAM Service - Main Coordination Service
// ============================================================================

import { prisma } from "../../db/prisma";
import { UserRole } from "../../domain/enums/UserRole";
import { hashPassword, verifyPassword } from "../../security/hashing";
import {
  generateTwoFactorSecret,
  verifyTwoFactorToken,
} from "../../security/twofactor";
import { encrypt } from "../../security/crypto";
import { generateId } from "../../utils/ids";
import { info, error } from "../../observability/logger";

interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
  organizationId?: string;
}

interface LoginInput {
  email: string;
  password: string;
  twoFactorToken?: string;
}

interface AuthenticationResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
  };
  sessionToken?: string;
  requiresTwoFactor?: boolean;
  error?: string;
}

/**
 * Create a new user with hashed password
 */
export async function createUser(
  input: CreateUserInput,
): Promise<{ id: string; email: string }> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      id: generateId(),
      email: input.email,
      name: input.name || null,
      passwordHash,
      role: (input.role || UserRole.VIEWER) as unknown as "VIEWER",
      timezone: "Africa/Johannesburg",
      language: "en",
      locale: "en-ZA",
      isActive: true,
      isLocked: false,
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      theme: "light",
      sidebarCollapsed: false,
      sessionTimeout: 30,
      recoveryCodes: [],
      organizations: input.organizationId
        ? {
            connect: { id: input.organizationId },
          }
        : undefined,
    },
  });

  info("User created", { userId: user.id, email: user.email });

  return {
    id: user.id,
    email: user.email,
  };
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(
  input: LoginInput,
): Promise<AuthenticationResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.passwordHash) {
      return {
        success: false,
        error: "Invalid credentials",
      };
    }

    if (!user.isActive) {
      return {
        success: false,
        error: "Account is deactivated",
      };
    }

    if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
      return {
        success: false,
        error: "Account is locked. Please try again later.",
      };
    }

    const isValidPassword = await verifyPassword(
      input.password,
      user.passwordHash,
    );

    if (!isValidPassword) {
      // Increment failed login attempts
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: { increment: 1 },
          lockedUntil:
            user.failedLoginAttempts >= 4
              ? new Date(Date.now() + 30 * 60 * 1000) // Lock for 30 minutes after 5 attempts
              : undefined,
          isLocked: user.failedLoginAttempts >= 4,
        },
      });

      return {
        success: false,
        error: "Invalid credentials",
      };
    }

    // Check if 2FA is required
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!input.twoFactorToken) {
        return {
          success: false,
          requiresTwoFactor: true,
          error: "Two-factor authentication required",
        };
      }

      const decryptedSecret = user.twoFactorSecret; // Would need decryption in production
      const isValidToken = verifyTwoFactorToken(
        decryptedSecret,
        input.twoFactorToken,
      );

      if (!isValidToken) {
        return {
          success: false,
          error: "Invalid two-factor authentication code",
        };
      }
    }

    // Reset failed login attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginIp: "127.0.0.1", // Should get from request
        isLocked: false,
        lockedUntil: null,
      },
    });

    // Create session
    const sessionToken = generateId();
    await prisma.session.create({
      data: {
        id: generateId(),
        sessionToken,
        userId: user.id,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isValid: true,
      },
    });

    info("User authenticated", { userId: user.id, email: user.email });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
      },
      sessionToken,
    };
  } catch (err) {
    error("Authentication error", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return {
      success: false,
      error: "Authentication failed",
    };
  }
}

/**
 * Enable two-factor authentication for user
 */
export async function enableTwoFactorAuth(
  userId: string,
): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
  const { secret, qrCodeUrl, backupCodes } = generateTwoFactorSecret();

  const encryptedSecret = encrypt(secret);

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: encryptedSecret,
      twoFactorMethod: "TOTP",
      recoveryCodes: backupCodes,
    },
  });

  info("Two-factor authentication enabled", { userId });

  return {
    secret,
    qrCodeUrl,
    backupCodes,
  };
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.passwordHash) {
    throw new Error("User not found");
  }

  const isValidPassword = await verifyPassword(
    currentPassword,
    user.passwordHash,
  );

  if (!isValidPassword) {
    throw new Error("Current password is incorrect");
  }

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      passwordChangedAt: new Date(),
    },
  });

  info("Password changed", { userId });

  return true;
}

export default {
  createUser,
  authenticateUser,
  enableTwoFactorAuth,
  changePassword,
};
