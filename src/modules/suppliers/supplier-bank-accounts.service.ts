// ============================================================================
// Supplier Bank Accounts Service
// ============================================================================

import { prisma } from "../../db/prisma";
import { generateId } from "../../utils/ids";
import { info, error } from "../../observability/logger";
import { Currency } from "../../domain/enums/Currency";

interface AddBankAccountInput {
  supplierId: string;
  accountName: string;
  accountNumber: string;
  bankCode?: string;
  bankName: string;
  branchCode?: string;
  branchName?: string;
  swiftCode?: string;
  iban?: string;
  currency: Currency;
  isPrimary: boolean;
}

interface UpdateBankAccountInput {
  accountName?: string;
  accountNumber?: string;
  bankCode?: string;
  bankName?: string;
  branchCode?: string;
  branchName?: string;
  swiftCode?: string;
  iban?: string;
  currency?: Currency;
  isPrimary?: boolean;
  isActive?: boolean;
}

/**
 * Add a new bank account to a supplier
 */
export async function addBankAccount(
  input: AddBankAccountInput,
): Promise<{ id: string }> {
  try {
    // If this is the primary account, unset any existing primary
    if (input.isPrimary) {
      await prisma.supplierBankAccount.updateMany({
        where: {
          supplierId: input.supplierId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const bankAccount = await prisma.supplierBankAccount.create({
      data: {
        id: generateId(),
        supplierId: input.supplierId,
        accountName: input.accountName,
        accountNumber: input.accountNumber,
        bankCode: input.bankCode,
        bankName: input.bankName,
        branchCode: input.branchCode,
        branchName: input.branchName,
        swiftCode: input.swiftCode,
        iban: input.iban,
        currency: input.currency,
        isPrimary: input.isPrimary,
        isActive: true,
      },
    });

    info("Supplier bank account added", {
      bankAccountId: bankAccount.id,
      supplierId: input.supplierId,
      accountName: input.accountName,
    });

    return { id: bankAccount.id };
  } catch (err) {
    error("Failed to add supplier bank account", {
      error: err instanceof Error ? err.message : "Unknown error",
      supplierId: input.supplierId,
      accountName: input.accountName,
    });
    throw err;
  }
}

/**
 * Update an existing bank account
 */
export async function updateBankAccount(
  bankAccountId: string,
  input: UpdateBankAccountInput,
): Promise<boolean> {
  try {
    const existingAccount = await prisma.supplierBankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!existingAccount) {
      throw new Error("Bank account not found");
    }

    // If setting as primary, unset existing primary
    if (input.isPrimary) {
      await prisma.supplierBankAccount.updateMany({
        where: {
          supplierId: existingAccount.supplierId,
          isPrimary: true,
          id: { not: bankAccountId },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    await prisma.supplierBankAccount.update({
      where: { id: bankAccountId },
      data: {
        accountName: input.accountName,
        accountNumber: input.accountNumber,
        bankCode: input.bankCode,
        bankName: input.bankName,
        branchCode: input.branchCode,
        branchName: input.branchName,
        swiftCode: input.swiftCode,
        iban: input.iban,
        currency: input.currency,
        isPrimary: input.isPrimary,
        isActive: input.isActive,
      },
    });

    info("Supplier bank account updated", { bankAccountId });

    return true;
  } catch (err) {
    error("Failed to update supplier bank account", {
      error: err instanceof Error ? err.message : "Unknown error",
      bankAccountId,
    });
    throw err;
  }
}

/**
 * Remove a bank account (soft delete)
 */
export async function removeBankAccount(
  bankAccountId: string,
): Promise<boolean> {
  try {
    await prisma.supplierBankAccount.update({
      where: { id: bankAccountId },
      data: {
        isActive: false,
        isPrimary: false,
      },
    });

    info("Supplier bank account removed", { bankAccountId });

    return true;
  } catch (err) {
    error("Failed to remove supplier bank account", {
      error: err instanceof Error ? err.message : "Unknown error",
      bankAccountId,
    });
    throw err;
  }
}

/**
 * List all bank accounts for a supplier
 */
export async function listBankAccounts(
  supplierId: string,
  includeInactive: boolean = false,
) {
  try {
    const bankAccounts = await prisma.supplierBankAccount.findMany({
      where: {
        supplierId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    return bankAccounts;
  } catch (err) {
    error("Failed to list supplier bank accounts", {
      error: err instanceof Error ? err.message : "Unknown error",
      supplierId,
    });
    throw err;
  }
}

/**
 * Get primary bank account for a supplier
 */
export async function getPrimaryBankAccount(supplierId: string) {
  try {
    const bankAccount = await prisma.supplierBankAccount.findFirst({
      where: {
        supplierId,
        isPrimary: true,
        isActive: true,
      },
    });

    return bankAccount;
  } catch (err) {
    error("Failed to get primary bank account", {
      error: err instanceof Error ? err.message : "Unknown error",
      supplierId,
    });
    throw err;
  }
}

/**
 * Validate bank account format
 */
export async function validateBankAccount(
  accountNumber: string,
  bankCode: string,
): Promise<boolean> {
  // Basic validation - should be enhanced with actual bank validation API
  const isValidAccountNumber = /^[0-9]{8,16}$/.test(accountNumber);
  const isValidBankCode = /^[0-9]{6}$/.test(bankCode);

  return isValidAccountNumber && isValidBankCode;
}

/**
 * Verify bank account with micro-deposit or API
 */
export async function verifyBankAccount(
  bankAccountId: string,
): Promise<boolean> {
  try {
    // In a real implementation, this would trigger a verification process
    // For now, just mark it as verified
    await prisma.supplierBankAccount.update({
      where: { id: bankAccountId },
      data: {
        verifiedAt: new Date(),
      },
    });

    info("Bank account verified", { bankAccountId });

    return true;
  } catch (err) {
    error("Failed to verify bank account", {
      error: err instanceof Error ? err.message : "Unknown error",
      bankAccountId,
    });
    throw err;
  }
}

export default {
  addBankAccount,
  updateBankAccount,
  removeBankAccount,
  listBankAccounts,
  getPrimaryBankAccount,
  validateBankAccount,
  verifyBankAccount,
};
