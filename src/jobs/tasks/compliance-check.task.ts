import { prisma } from "../../lib/prisma";
import { ScheduledTask } from "../../domain/models/ScheduledTask";
import { ComplianceStatus } from "../../domain/enums/ComplianceStatus";
import { ComplianceCheckType } from "../../domain/enums/ComplianceCheckType";
import { InvoiceStatus } from "../../domain/enums/InvoiceStatus";
import { info, error } from "../../observability/logger";

/**
 * Run compliance checks on invoices
 */
export async function runTask(
  task: ScheduledTask,
  signal: AbortSignal,
): Promise<void> {
  info("Starting compliance check task", { taskId: task.id });

  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: [InvoiceStatus.SUBMITTED, InvoiceStatus.PROCESSING] },
    },
    include: {
      supplier: true,
    },
    take: 50,
  });

  for (const invoice of invoices) {
    if (signal.aborted) return;

    try {
      // VAT Validation
      await runVATCheck(invoice);

      // Supplier Verification
      await runSupplierCheck(invoice);

      // Duplicate Check
      await runDuplicateCheck(invoice);

      // Amount Check
      await runAmountCheck(invoice);
    } catch (err) {
      error(`Failed compliance check for invoice ${invoice.id}`, {
        taskId: task.id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  info("Compliance check task completed", { taskId: task.id });
}

async function runVATCheck(invoice: any) {
  const vatValid =
    invoice.vatAmount ===
    parseFloat(invoice.subtotalExclVAT.toString()) *
      (parseFloat(invoice.vatRate.toString()) / 100);

  await prisma.complianceCheck.create({
    data: {
      invoiceId: invoice.id,
      organizationId: invoice.organizationId,
      checkType: "VAT_VALIDATION" as any,
      status: vatValid ? "PASSED" as any : "FAILED" as any,
      passedChecks: vatValid ? ["VAT calculation correct"] : [],
      errors: vatValid ? [] : ["VAT calculation mismatch"],
    } as any,
  });
}

async function runSupplierCheck(invoice: any) {
  const supplierValid =
    invoice.supplier?.isVerified && !invoice.supplier?.isBlacklisted;

  await prisma.complianceCheck.create({
    data: {
      invoiceId: invoice.id,
      organizationId: invoice.organizationId,
      checkType: "SUPPLIER_VERIFICATION" as any,
      status: supplierValid ? "PASSED" as any : "FAILED" as any,
      passedChecks: supplierValid ? ["Supplier verified"] : [],
      errors: !supplierValid ? ["Supplier not verified or blacklisted"] : [],
    } as any,
  });
}

async function runDuplicateCheck(invoice: any) {
  const duplicates = await prisma.invoice.count({
    where: {
      supplierId: invoice.supplierId,
      invoiceNumber: invoice.invoiceNumber,
      id: { not: invoice.id },
    },
  });

  const isDuplicate = duplicates > 0;

  await prisma.complianceCheck.create({
    data: {
      invoiceId: invoice.id,
      organizationId: invoice.organizationId,
      checkType: "DUPLICATE_CHECK" as any,
      status: isDuplicate ? "FAILED" as any : "PASSED" as any,
      passedChecks: !isDuplicate ? ["No duplicates found"] : [],
      errors: isDuplicate ? [`Found ${duplicates} duplicate(s)`] : [],
    } as any,
  });

  if (isDuplicate) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { isDuplicate: true },
    });
  }
}

async function runAmountCheck(invoice: any) {
  const totalValid = parseFloat(invoice.totalAmount.toString()) > 0;

  await prisma.complianceCheck.create({
    data: {
      invoiceId: invoice.id,
      organizationId: invoice.organizationId,
      checkType: "AMOUNT_CHECK" as any,
      status: totalValid ? "PASSED" as any : "FAILED" as any,
      passedChecks: totalValid ? ["Amount valid"] : [],
      errors: !totalValid ? ["Invalid amount"] : [],
    } as any,
  });
}
