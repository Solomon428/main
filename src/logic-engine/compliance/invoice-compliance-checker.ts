// ============================================================================
// CreditorFlow - Invoice Compliance Checker
// ============================================================================
// Orchestrates all compliance checks for an invoice:
// 1. VAT Validation (amount calculations, VAT number format)
// 2. Sanctions Check (country-based sanctions screening)
// 3. PEP Check (Politically Exposed Person screening)
// 4. Duplicate Detection (exact and fuzzy matching)
// 5. Required Fields Check (mandatory data completeness)
//
// Updates invoice status and logs all compliance activities
// ============================================================================

import { prisma } from "@/lib/database/client";
import { VATValidator } from "./vat-validator/index";
import { SARSValidator } from "./sar-validator";
import { AdvancedDuplicateDetector } from "../duplicates/advanced-duplicate-detector/index";
import { FraudScorer } from "../risk/fraud-scorer/index";
import { auditLogger } from "@/lib/utils/audit-logger";
import { EntityType, LogSeverity, InvoiceStatus, RiskLevel } from "@/types";

export interface ComplianceCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export interface ComplianceCheckResult {
  isCompliant: boolean;
  checks: ComplianceCheck[];
  overallRiskLevel: "LOW" | "MEDIUM" | "HIGH";
  requiresManualReview: boolean;
}

export class InvoiceComplianceChecker {
  /**
   * Run full compliance check on an invoice
   */
  static async checkInvoiceCompliance(
    invoiceId: string,
  ): Promise<ComplianceCheckResult> {
    // Use SQLite table names
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: true,
        approvals: true,
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const checks: ComplianceCheck[] = [];

    // 1. VAT Validation
    try {
      const vatValidator = new VATValidator();
      const vatResult = vatValidator.validateVAT({
        subtotalExclVAT: Number(invoice.subtotalExclVAT || 0),
        vatAmount: Number(invoice.vatAmount || 0),
        totalAmount: Number(invoice.totalAmount || 0),
        vatRate: 0.15,
      });
      checks.push({
        name: "VAT Validation",
        passed: vatResult.complianceStatus === "COMPLIANT",
        message: vatResult.complianceStatus === "COMPLIANT"
          ? "VAT calculation correct"
          : vatResult.errors?.map((e: any) => e.errorMessage).join(", ") || "VAT validation failed",
        severity: vatResult.complianceStatus === "COMPLIANT" ? "LOW" : "HIGH",
      });
    } catch (error) {
      checks.push({
        name: "VAT Validation",
        passed: false,
        message: `VAT validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
        severity: "HIGH",
      });
    }

    // 2. Sanctions Check
    try {
      const sanctionsResult = await SARSValidator.validateSanctions(invoiceId);
      checks.push({
        name: "Sanctions Check",
        passed: sanctionsResult.isValid,
        message: sanctionsResult.isValid
          ? "No sanctions violations"
          : sanctionsResult.violations.join(", "),
        severity: sanctionsResult.riskLevel,
      });
    } catch (error) {
      checks.push({
        name: "Sanctions Check",
        passed: false,
        message: "Sanctions check failed",
        severity: "HIGH",
      });
    }

    // 3. PEP Check
    try {
      const pepResult = await SARSValidator.validatePEP(invoiceId);
      checks.push({
        name: "PEP Check",
        passed: pepResult.isValid,
        message: pepResult.isValid
          ? "No PEP matches"
          : `PEP keywords found: ${pepResult.matches.join(", ")}`,
        severity: pepResult.riskLevel,
      });
    } catch (error) {
      checks.push({
        name: "PEP Check",
        passed: false,
        message: "PEP check failed",
        severity: "HIGH",
      });
    }

    // 4. Duplicate Check
    try {
      const duplicateResult: any = await AdvancedDuplicateDetector.checkForDuplicates({
        invoiceNumber: invoice.invoiceNumber,
        supplierName: invoice.supplierName || "",
        totalAmount: Number(invoice.totalAmount),
        invoiceDate: invoice.invoiceDate,
      });
      checks.push({
        name: "Duplicate Check",
        passed: !duplicateResult.isDuplicate,
        message: duplicateResult.isDuplicate
          ? "Duplicate detected"
          : "No duplicates found",
        severity: duplicateResult.isDuplicate ? "HIGH" : "LOW",
      });
    } catch (error) {
      checks.push({
        name: "Duplicate Check",
        passed: false,
        message: `Duplicate check error: ${error instanceof Error ? error.message : "Unknown error"}`,
        severity: "MEDIUM",
      });
    }

    // 5. Required Fields Check
    const requiredFields = [
      { name: "invoiceNumber", value: invoice.invoiceNumber },
      { name: "supplierId", value: invoice.supplierId },
      { name: "totalAmount", value: invoice.totalAmount },
      { name: "invoiceDate", value: invoice.invoiceDate },
      { name: "dueDate", value: invoice.dueDate },
    ];

    const missingFields = requiredFields
      .filter(
        (field) =>
          field.value === null ||
          field.value === undefined ||
          field.value === "",
      )
      .map((field) => field.name);

    checks.push({
      name: "Required Fields",
      passed: missingFields.length === 0,
      message:
        missingFields.length === 0
          ? "All required fields present"
          : `Missing fields: ${missingFields.join(", ")}`,
      severity: missingFields.length > 0 ? "MEDIUM" : "LOW",
    });

    // 6. Fraud Scoring
    try {
      const supplier = invoice.supplierId
        ? await prisma.supplier.findUnique({
            where: { id: invoice.supplierId },
          })
        : null;

      const fraudInput = {
        invoiceId: invoice.id,
        supplierId: invoice.supplierId || undefined,
        supplierName: invoice.supplierName,
        totalAmount: Number(invoice.totalAmount),
        invoiceDate: invoice.invoiceDate,
        supplierRiskLevel: invoice.riskLevel as any,
        invoiceCurrency: invoice.currency,
        lineItems: invoice.lineItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          lineTotalExclVAT: Number(item.lineTotalExclVAT),
          lineTotalInclVAT: Number(item.lineTotalInclVAT),
        })),
        hasDuplicatePattern:
          checks.find((c) => c.name === "Duplicate Check")?.passed === false,
        hasVATAnomaly:
          checks.find((c) => c.name === "VAT Validation")?.passed === false,
        extractionConfidence: invoice.extractionConfidence,
      };

      const fraudResult: any = FraudScorer.calculateScore(fraudInput as any);

      // Update invoice with fraud score
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          fraudScore: fraudResult.overallScore,
          riskLevel: fraudResult.riskLevel,
        },
      });

      checks.push({
        name: "Fraud Scoring",
        passed: !fraudResult.requiresAttention,
        message: fraudResult.requiresAttention
          ? `High fraud risk detected (score: ${fraudResult.overallScore}). Factors: ${fraudResult.riskFactors?.map((f: any) => f.factor).join(", ") || "N/A"}`
          : `Fraud risk acceptable (score: ${fraudResult.overallScore})`,
        severity:
          fraudResult.riskLevel === "HIGH"
            ? "HIGH"
            : fraudResult.riskLevel === "MEDIUM"
              ? "MEDIUM"
              : "LOW",
      });
    } catch (error) {
      checks.push({
        name: "Fraud Scoring",
        passed: false,
        message: `Fraud scoring error: ${error instanceof Error ? error.message : "Unknown error"}`,
        severity: "MEDIUM",
      });
    }

    // Calculate overall compliance
    const failedChecks = checks.filter((c) => !c.passed);
    const highSeverityChecks = checks.filter(
      (c) => !c.passed && c.severity === "HIGH",
    );
    const isCompliant = failedChecks.length === 0;
    const overallRiskLevel =
      highSeverityChecks.length > 0
        ? "HIGH"
        : failedChecks.length > 2
          ? "MEDIUM"
          : "LOW";
    const requiresManualReview =
      highSeverityChecks.length > 0 || failedChecks.length > 2;

    // Update invoice compliance status
    const vatCheck = checks.find((c) => c.name === "VAT Validation");
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        vatCompliant: vatCheck?.passed ?? false,
        termsCompliant: isCompliant,
        requiresAttention: requiresManualReview,
        status: isCompliant
          ? InvoiceStatus.PENDING_APPROVAL
          : InvoiceStatus.PROCESSING,
      },
    });

    // Log compliance check
    await auditLogger.log({
      action: "UPDATE",
      entityType: EntityType.INVOICE,
      entityId: invoiceId,
      entityDescription: `Compliance check: ${checks.filter((c) => c.passed).length}/${checks.length} checks passed`,
      severity: isCompliant ? LogSeverity.INFO : LogSeverity.WARNING,
      metadata: {
        checks: checks.map((c) => ({
          name: c.name,
          passed: c.passed,
          severity: c.severity,
        })),
        isCompliant,
        overallRiskLevel,
        requiresManualReview,
      },
    });

    return {
      isCompliant,
      checks,
      overallRiskLevel,
      requiresManualReview,
    };
  }

  /**
   * Batch compliance check for multiple invoices
   */
  static async batchComplianceCheck(invoiceIds: string[]): Promise<{
    processed: number;
    compliant: number;
    nonCompliant: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let compliant = 0;
    let nonCompliant = 0;

    for (const invoiceId of invoiceIds) {
      try {
        const result = await this.checkInvoiceCompliance(invoiceId);
        if (result.isCompliant) {
          compliant++;
        } else {
          nonCompliant++;
        }
      } catch (error) {
        errors.push(
          `Invoice ${invoiceId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    return {
      processed: invoiceIds.length,
      compliant,
      nonCompliant,
      errors,
    };
  }
}

export default InvoiceComplianceChecker;
