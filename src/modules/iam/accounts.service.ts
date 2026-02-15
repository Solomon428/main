// ============================================================================
// Accounts Service - OAuth Account Management
// ============================================================================

import { prisma } from '../../db/prisma';
import { generateId } from '../../utils/ids';
import { info, error } from '../../observability/logger';

interface LinkAccountInput {
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refreshToken?: string;
  accessToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
  sessionState?: string;
  profileData?: Record<string, unknown>;
}

/**
 * Link an OAuth account to a user
 */
export async function linkAccount(input: LinkAccountInput): Promise<{ id: string }> {
  try {
    // Check if account already exists
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: input.provider,
          providerAccountId: input.providerAccountId,
        },
      },
    });

    if (existingAccount) {
      // Update existing account
      const account = await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          refresh_token: input.refreshToken,
          access_token: input.accessToken,
          expires_at: input.expiresAt,
          token_type: input.tokenType,
          scope: input.scope,
          id_token: input.idToken,
          session_state: input.sessionState,
          profile_data: input.profileData as unknown as object,
        },
      });

      info('OAuth account updated', { 
        accountId: account.id, 
        provider: input.provider,
        userId: input.userId 
      });

      return { id: account.id };
    }

    // Create new account
    const account = await prisma.account.create({
      data: {
        id: generateId(),
        userId: input.userId,
        type: input.type,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        refresh_token: input.refreshToken,
        access_token: input.accessToken,
        expires_at: input.expiresAt,
        token_type: input.tokenType,
        scope: input.scope,
        id_token: input.idToken,
        session_state: input.sessionState,
        profile_data: input.profileData as unknown as object,
      },
    });

    info('OAuth account linked', { 
      accountId: account.id, 
      provider: input.provider,
      userId: input.userId 
    });

    return { id: account.id };
  } catch (err) {
    error('Failed to link account', { 
      error: err instanceof Error ? err.message : 'Unknown error',
      provider: input.provider,
      userId: input.userId 
    });
    throw err;
  }
}

/**
 * Unlink an OAuth account from a user
 */
export async function unlinkAccount(userId: string, provider: string): Promise<boolean> {
  try {
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider,
      },
    });

    if (!account) {
      return false;
    }

    await prisma.account.delete({
      where: { id: account.id },
    });

    info('OAuth account unlinked', { 
      accountId: account.id, 
      provider,
      userId 
    });

    return true;
  } catch (err) {
    error('Failed to unlink account', { 
      error: err instanceof Error ? err.message : 'Unknown error',
      provider,
      userId 
    });
    throw err;
  }
}

/**
 * Find all OAuth accounts for a user
 */
export async function findAccountsByUserId(userId: string): Promise<Array<{
  id: string;
  type: string;
  provider: string;
  providerAccountId: string;
  expiresAt: Date | null;
}>> {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        provider: true,
        providerAccountId: true,
        expires_at: true,
      },
    });

    return accounts.map(account => ({
      id: account.id,
      type: account.type,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
    }));
  } catch (err) {
    error('Failed to find accounts', { 
      error: err instanceof Error ? err.message : 'Unknown error',
      userId 
    });
    throw err;
  }
}

/**
 * Find account by provider and provider account ID
 */
export async function findAccountByProvider(
  provider: string, 
  providerAccountId: string
): Promise<{ id: string; userId: string } | null> {
  try {
    const account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    return account;
  } catch (err) {
    error('Failed to find account by provider', { 
      error: err instanceof Error ? err.message : 'Unknown error',
      provider,
      providerAccountId 
    });
    throw err;
  }
}

/**
 * Refresh OAuth token
 */
export async function refreshToken(
  accountId: string, 
  newAccessToken: string, 
  newRefreshToken?: string,
  expiresAt?: number
): Promise<boolean> {
  try {
    await prisma.account.update({
      where: { id: accountId },
      data: {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_at: expiresAt,
      },
    });

    info('OAuth token refreshed', { accountId });

    return true;
  } catch (err) {
    error('Failed to refresh token', { 
      error: err instanceof Error ? err.message : 'Unknown error',
      accountId 
    });
    throw err;
  }
}

export default {
  linkAccount,
  unlinkAccount,
  findAccountsByUserId,
  findAccountByProvider,
  refreshToken,
};
