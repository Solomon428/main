// ============================================================================
// Bank Accounts Service
// ============================================================================

import { prisma } from "../../db/prisma";
import { Currency } from "../../domain/enums/Currency";
import { BankAccountType } from "../../domain/enums/BankAccountType";

export interface CreateBankAccountInput {
  organizationId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode?: string;
  branchName?: string;
  branchCode?: string;
  swiftCode?: string;
  iban?: string;
  currency?: Currency;
  accountType?: BankAccountType;
  isPrimary?: boolean;
  openingBalance?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateBankAccountInput {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  branchName?: string;
  branchCode?: string;
  swiftCode?: string;
  iban?: string;
  currency?: Currency;
  accountType?: BankAccountType;
  isPrimary?: boolean;
  openingBalance?: number;
  metadata?: Record<string, unknown>;
}

/**
 * List all bank accounts for an organization
 */
export async function listBankAccounts(
  organizationId: string,
  options?: {
    isActive?: boolean;
    isPrimary?: boolean;
    page?: number;
    limit?: number;
  },
) {
  const where: any = { organizationId };

  if (options?.isActive !== undefined) where.isActive = options.isActive;
  if (options?.isPrimary !== undefined) where.isPrimary = options.isPrimary;

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const [accounts, total] = await Promise.all([
    prisma.bankAccount.findMany({
      where,
      include: {
        _count: {
          select: {
            payments: true,
            reconciliations: true,
          },
        },
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.bankAccount.count({ where }),
  ]);

  return {
    accounts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a specific bank account by ID
 */
export async function getBankAccount(id: string) {
  return prisma.bankAccount.findUnique({
    where: { id },
    include: {
      payments: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          paymentNumber: true,
          amount: true,
          status: true,
          paymentDate: true,
        },
      },
      reconciliations: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          statementDate: true,
          status: true,
          openingBalance: true,
          closingBalance: true,
        },
      },
    },
  });
}

/**
 * Get primary bank account for an organization
 */
export async function getPrimaryBankAccount(organizationId: string) {
  return prisma.bankAccount.findFirst({
    where: {
      organizationId,
      isPrimary: true,
      isActive: true,
    },
  });
}

/**
 * Create a new bank account
 */
export async function createBankAccount(data: CreateBankAccountInput) {
  // If this is set as primary, unset any existing primary accounts
  if (data.isPrimary) {
    await prisma.bankAccount.updateMany({
      where: {
        organizationId: data.organizationId,
        isPrimary: true,
      },
      data: { isPrimary: false },
    });
  }

  return prisma.bankAccount.create({
    data: {
      organizationId: data.organizationId,
      accountName: data.accountName,
      accountNumber: data.accountNumber,
      bankName: data.bankName,
      bankCode: data.bankCode,
      branchName: data.branchName,
      branchCode: data.branchCode,
      swiftCode: data.swiftCode,
      iban: data.iban,
      currency: data.currency || Currency.ZAR,
      accountType: data.accountType || BankAccountType.CURRENT,
      isPrimary: data.isPrimary || false,
      isActive: true,
      openingBalance: data.openingBalance || 0,
      currentBalance: data.openingBalance || 0,
      availableBalance: data.openingBalance || 0,
      metadata: data.metadata || {},
    },
  });
}

/**
 * Update an existing bank account
 */
export async function updateBankAccount(
  id: string,
  data: UpdateBankAccountInput,
) {
  const account = await prisma.bankAccount.findUnique({
    where: { id },
  });

  if (!account) {
    throw new Error("Bank account not found");
  }

  // If setting as primary, unset existing primary
  if (data.isPrimary && !account.isPrimary) {
    await prisma.bankAccount.updateMany({
      where: {
        organizationId: account.organizationId,
        isPrimary: true,
      },
      data: { isPrimary: false },
    });
  }

  return prisma.bankAccount.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete a bank account
 */
export async function deleteBankAccount(id: string) {
  const account = await prisma.bankAccount.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          payments: true,
          reconciliations: true,
        },
      },
    },
  });

  if (!account) {
    throw new Error("Bank account not found");
  }

  if (account._count.payments > 0 || account._count.reconciliations > 0) {
    throw new Error(
      "Cannot delete bank account with associated payments or reconciliations",
    );
  }

  return prisma.bankAccount.delete({
    where: { id },
  });
}

/**
 * Set bank account as primary
 */
export async function setPrimaryBankAccount(id: string) {
  const account = await prisma.bankAccount.findUnique({
    where: { id },
  });

  if (!account) {
    throw new Error("Bank account not found");
  }

  // Unset existing primary
  await prisma.bankAccount.updateMany({
    where: {
      organizationId: account.organizationId,
      isPrimary: true,
    },
    data: { isPrimary: false },
  });

  // Set new primary
  return prisma.bankAccount.update({
    where: { id },
    data: {
      isPrimary: true,
      updatedAt: new Date(),
    },
  });
}

/**
 * Update account balance
 */
export async function updateAccountBalance(
  id: string,
  balances: {
    currentBalance?: number;
    availableBalance?: number;
  },
) {
  return prisma.bankAccount.update({
    where: { id },
    data: {
      ...balances,
      updatedAt: new Date(),
    },
  });
}

/**
 * Record last reconciliation date
 */
export async function recordReconciliation(id: string) {
  return prisma.bankAccount.update({
    where: { id },
    data: {
      lastReconciledAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Deactivate a bank account
 */
export async function deactivateBankAccount(id: string) {
  const account = await prisma.bankAccount.findUnique({
    where: { id },
  });

  if (!account) {
    throw new Error("Bank account not found");
  }

  if (account.isPrimary) {
    throw new Error("Cannot deactivate the primary bank account");
  }

  return prisma.bankAccount.update({
    where: { id },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });
}

/**
 * Reactivate a bank account
 */
export async function reactivateBankAccount(id: string) {
  return prisma.bankAccount.update({
    where: { id },
    data: {
      isActive: true,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get bank account summary for an organization
 */
export async function getBankAccountSummary(organizationId: string) {
  const accounts = await prisma.bankAccount.findMany({
    where: { organizationId },
  });

  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.currentBalance),
    0,
  );

  const totalAvailable = accounts.reduce(
    (sum, account) => sum + Number(account.availableBalance),
    0,
  );

  return {
    totalAccounts: accounts.length,
    activeAccounts: accounts.filter((a) => a.isActive).length,
    primaryAccount: accounts.find((a) => a.isPrimary),
    totalBalance,
    totalAvailable,
    accountsByCurrency: accounts.reduce(
      (acc, account) => {
        const currency = account.currency;
        if (!acc[currency]) {
          acc[currency] = { count: 0, balance: 0 };
        }
        acc[currency].count++;
        acc[currency].balance += Number(account.currentBalance);
        return acc;
      },
      {} as Record<string, { count: number; balance: number }>,
    ),
  };
}

/**
 * Search bank accounts
 */
export async function searchBankAccounts(
  organizationId: string,
  query: string,
  options?: { page?: number; limit?: number },
) {
  const where: any = {
    organizationId,
    OR: [
      { accountName: { contains: query, mode: "insensitive" } },
      { accountNumber: { contains: query, mode: "insensitive" } },
      { bankName: { contains: query, mode: "insensitive" } },
    ],
  };

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const [accounts, total] = await Promise.all([
    prisma.bankAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.bankAccount.count({ where }),
  ]);

  return {
    accounts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Verify bank account details
 */
export async function verifyBankAccount(id: string): Promise<boolean> {
  const account = await prisma.bankAccount.findUnique({
    where: { id },
  });

  if (!account) {
    return false;
  }

  // In production, this would integrate with bank verification services
  // For now, we'll just check if the account number format is valid
  const accountNumberRegex = /^[0-9]{8,17}$/;
  const isValid = accountNumberRegex.test(account.accountNumber);

  return isValid;
}
