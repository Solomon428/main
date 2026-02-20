// ============================================================================
// Tokens Service - Verification and Password Reset Tokens
// ============================================================================

import { prisma } from "../../db/prisma";
import { generateId, generateSecureToken } from "../../utils/ids";
import { info, error } from "../../observability/logger";

interface GenerateVerificationTokenInput {
  identifier: string;
  expiresInHours?: number;
}

interface GeneratePasswordResetTokenInput {
  email: string;
  expiresInHours?: number;
}

/**
 * Generate a new verification token
 */
export async function generateVerificationToken(
  input: GenerateVerificationTokenInput,
): Promise<{ token: string; expires: Date }> {
  const expiresInHours = input.expiresInHours || 24;
  const expires = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  const token = generateSecureToken(32);

  try {
    // Delete any existing tokens for this identifier
    await prisma.verificationToken.deleteMany({
      where: { identifier: input.identifier },
    });

    // Create new token
    await prisma.verificationToken.create({
      data: {
        identifier: input.identifier,
        token,
        expires,
      },
    });

    info("Verification token generated", {
      identifier: input.identifier,
      expiresInHours,
    });

    return { token, expires };
  } catch (err) {
    error("Failed to generate verification token", {
      error: err instanceof Error ? err.message : "Unknown error",
      identifier: input.identifier,
    });
    throw err;
  }
}

/**
 * Validate a verification token
 */
export async function validateVerificationToken(
  identifier: string,
  token: string,
): Promise<boolean> {
  try {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier,
          token,
        },
      },
    });

    if (!verificationToken) {
      return false;
    }

    // Check if token has expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier,
            token,
          },
        },
      });
      return false;
    }

    // Check if token has already been used
    if (verificationToken.usedAt) {
      return false;
    }

    return true;
  } catch (err) {
    error("Failed to validate verification token", {
      error: err instanceof Error ? err.message : "Unknown error",
      identifier,
      token,
    });
    return false;
  }
}

/**
 * Mark verification token as used
 */
export async function markVerificationTokenAsUsed(
  identifier: string,
  token: string,
  usedByIp?: string,
): Promise<boolean> {
  try {
    await prisma.verificationToken.update({
      where: {
        identifier_token: {
          identifier,
          token,
        },
      },
      data: {
        usedAt: new Date(),
        usedByIp,
      },
    });

    info("Verification token marked as used", { identifier, token });

    return true;
  } catch (err) {
    error("Failed to mark verification token as used", {
      error: err instanceof Error ? err.message : "Unknown error",
      identifier,
      token,
    });
    return false;
  }
}

/**
 * Generate a password reset token
 */
export async function generatePasswordResetToken(
  input: GeneratePasswordResetTokenInput,
): Promise<{ token: string; expires: Date } | null> {
  const expiresInHours = input.expiresInHours || 1; // Shorter expiry for password reset
  const expires = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  const token = generateSecureToken(32);

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (!user) {
      // Return null but don't throw error to prevent email enumeration
      return null;
    }

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: input.email },
    });

    // Create new token
    await prisma.passwordResetToken.create({
      data: {
        id: generateId(),
        email: input.email,
        token,
        expires,
        used: false,
      },
    });

    info("Password reset token generated", {
      email: input.email,
      expiresInHours,
    });

    return { token, expires };
  } catch (err) {
    error("Failed to generate password reset token", {
      error: err instanceof Error ? err.message : "Unknown error",
      email: input.email,
    });
    throw err;
  }
}

/**
 * Validate a password reset token
 */
export async function validatePasswordResetToken(
  token: string,
): Promise<string | null> {
  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return null;
    }

    // Check if token has expired
    if (resetToken.expires < new Date()) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      return null;
    }

    // Check if token has already been used
    if (resetToken.used) {
      return null;
    }

    return resetToken.email;
  } catch (err) {
    error("Failed to validate password reset token", {
      error: err instanceof Error ? err.message : "Unknown error",
      token,
    });
    return null;
  }
}

/**
 * Mark password reset token as used
 */
export async function markPasswordResetTokenAsUsed(
  token: string,
  ipAddress?: string,
): Promise<boolean> {
  try {
    await prisma.passwordResetToken.update({
      where: { token },
      data: {
        used: true,
        usedAt: new Date(),
        ipAddress,
      },
    });

    info("Password reset token marked as used", { token });

    return true;
  } catch (err) {
    error("Failed to mark password reset token as used", {
      error: err instanceof Error ? err.message : "Unknown error",
      token,
    });
    return false;
  }
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredTokens(): Promise<{
  verificationTokens: number;
  passwordResetTokens: number;
}> {
  try {
    const now = new Date();

    const verificationResult = await prisma.verificationToken.deleteMany({
      where: {
        expires: { lt: now },
        usedAt: null,
      },
    });

    const passwordResetResult = await prisma.passwordResetToken.deleteMany({
      where: {
        expires: { lt: now },
        used: false,
      },
    });

    info("Cleaned up expired tokens", {
      verificationTokens: verificationResult.count,
      passwordResetTokens: passwordResetResult.count,
    });

    return {
      verificationTokens: verificationResult.count,
      passwordResetTokens: passwordResetResult.count,
    };
  } catch (err) {
    error("Failed to cleanup expired tokens", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    throw err;
  }
}

export default {
  generateVerificationToken,
  validateVerificationToken,
  markVerificationTokenAsUsed,
  generatePasswordResetToken,
  validatePasswordResetToken,
  markPasswordResetTokenAsUsed,
  cleanupExpiredTokens,
};
