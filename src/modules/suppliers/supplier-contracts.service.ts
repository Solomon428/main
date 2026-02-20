// ============================================================================
// Supplier Contracts Service
// ============================================================================

import { prisma } from "../../db/prisma";
import { generateId } from "../../utils/ids";
import { info, error } from "../../observability/logger";
import { Decimal } from "@prisma/client/runtime/library";

interface AddContractInput {
  supplierId: string;
  contractNumber?: string;
  contractType?: string;
  startDate: Date;
  endDate?: Date;
  value?: Decimal;
  terms?: string;
  paymentTerms?: number;
  autoRenew?: boolean;
  renewalNoticeDays?: number;
  documentUrl?: string;
  status?: string;
}

interface UpdateContractInput {
  contractNumber?: string;
  contractType?: string;
  startDate?: Date;
  endDate?: Date;
  value?: Decimal;
  terms?: string;
  paymentTerms?: number;
  autoRenew?: boolean;
  renewalNoticeDays?: number;
  documentUrl?: string;
  status?: string;
}

/**
 * Add a new contract to a supplier
 */
export async function addContract(
  input: AddContractInput,
): Promise<{ id: string }> {
  try {
    // Check if contract number already exists (if provided)
    if (input.contractNumber) {
      const existingContract = await prisma.supplierContract.findFirst({
        where: { contractNumber: input.contractNumber },
      });

      if (existingContract) {
        throw new Error(
          `Contract with number ${input.contractNumber} already exists`,
        );
      }
    }

    const contract = await prisma.supplierContract.create({
      data: {
        id: generateId(),
        supplierId: input.supplierId,
        contractNumber: input.contractNumber,
        contractType: input.contractType,
        startDate: input.startDate,
        endDate: input.endDate,
        value: input.value,
        terms: input.terms,
        paymentTerms: input.paymentTerms,
        autoRenew: input.autoRenew ?? false,
        renewalNoticeDays: input.renewalNoticeDays ?? 30,
        status: input.status ?? "ACTIVE",
        documentUrl: input.documentUrl,
      },
    });

    info("Supplier contract added", {
      contractId: contract.id,
      supplierId: input.supplierId,
      contractNumber: input.contractNumber,
    });

    return { id: contract.id };
  } catch (err) {
    error("Failed to add supplier contract", {
      error: err instanceof Error ? err.message : "Unknown error",
      supplierId: input.supplierId,
      contractNumber: input.contractNumber,
    });
    throw err;
  }
}

/**
 * Update an existing contract
 */
export async function updateContract(
  contractId: string,
  input: UpdateContractInput,
): Promise<boolean> {
  try {
    const existingContract = await prisma.supplierContract.findUnique({
      where: { id: contractId },
    });

    if (!existingContract) {
      throw new Error("Contract not found");
    }

    await prisma.supplierContract.update({
      where: { id: contractId },
      data: {
        contractNumber: input.contractNumber,
        contractType: input.contractType,
        startDate: input.startDate,
        endDate: input.endDate,
        value: input.value,
        terms: input.terms,
        paymentTerms: input.paymentTerms,
        autoRenew: input.autoRenew,
        renewalNoticeDays: input.renewalNoticeDays,
        status: input.status,
        documentUrl: input.documentUrl,
      },
    });

    info("Supplier contract updated", { contractId });

    return true;
  } catch (err) {
    error("Failed to update supplier contract", {
      error: err instanceof Error ? err.message : "Unknown error",
      contractId,
    });
    throw err;
  }
}

/**
 * List all contracts for a supplier
 */
export async function listContracts(supplierId: string, status?: string) {
  try {
    const contracts = await prisma.supplierContract.findMany({
      where: {
        supplierId,
        ...(status ? { status } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return contracts;
  } catch (err) {
    error("Failed to list supplier contracts", {
      error: err instanceof Error ? err.message : "Unknown error",
      supplierId,
    });
    throw err;
  }
}

/**
 * Get active contract for a supplier
 */
export async function getActiveContract(supplierId: string) {
  try {
    const now = new Date();

    const contract = await prisma.supplierContract.findFirst({
      where: {
        supplierId,
        status: "ACTIVE",
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return contract;
  } catch (err) {
    error("Failed to get active contract", {
      error: err instanceof Error ? err.message : "Unknown error",
      supplierId,
    });
    throw err;
  }
}

/**
 * Get contract by ID
 */
export async function getContractById(contractId: string) {
  try {
    const contract = await prisma.supplierContract.findUnique({
      where: { id: contractId },
      include: {
        supplier: true,
      },
    });

    return contract;
  } catch (err) {
    error("Failed to get contract by ID", {
      error: err instanceof Error ? err.message : "Unknown error",
      contractId,
    });
    throw err;
  }
}

/**
 * Deactivate a contract
 */
export async function deactivateContract(contractId: string): Promise<boolean> {
  try {
    await prisma.supplierContract.update({
      where: { id: contractId },
      data: {
        status: "INACTIVE",
      },
    });

    info("Supplier contract deactivated", { contractId });

    return true;
  } catch (err) {
    error("Failed to deactivate supplier contract", {
      error: err instanceof Error ? err.message : "Unknown error",
      contractId,
    });
    throw err;
  }
}

/**
 * Check if a contract is expired
 */
export async function checkExpiredContracts(): Promise<number> {
  try {
    const now = new Date();

    const result = await prisma.supplierContract.updateMany({
      where: {
        status: "ACTIVE",
        endDate: { lt: now },
      },
      data: {
        status: "INACTIVE",
      },
    });

    info("Checked expired contracts", { deactivatedCount: result.count });

    return result.count;
  } catch (err) {
    error("Failed to check expired contracts", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    throw err;
  }
}

export default {
  addContract,
  updateContract,
  listContracts,
  getActiveContract,
  getContractById,
  deactivateContract,
  checkExpiredContracts,
};
