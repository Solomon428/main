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
import { VATValidator } from "./vat-validator";
import { SARSValidator } from "./sar-validator";
import { AdvancedDuplicateDetector } from "../duplicates/advanced-duplicate-detector";
import { FraudScorer } from "../risk/fraud-scorer";
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
    const invoice = await prisma.invoices.findUnique({
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
      const vatResult = await VATValidator.validateInvoiceVAT(invoiceId);
      checks.push({
        name: "VAT Validation",
        passed: vatResult.isValid,
        message: vatResult.isValid
          ? "VAT calculation correct"
          : vatResult.errors.join(", "),
        severity: vatResult.isValid ? "LOW" : "HIGH",
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
      const duplicateResult = await AdvancedDuplicateDetector.checkDuplicate(
        invoice.supplierId || "",
        invoice.invoiceNumber,
        Number(invoice.totalAmount),
        invoice.invoiceDate,
      );
      checks.push({
        name: "Duplicate Check",
        passed: !duplicateResult.isDuplicate,
        message: duplicateResult.isDuplicate
          ? duplicateResult.reason || "Duplicate detected"
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
        ? await prisma.suppliers.findUnique({
            where: { id: invoice.supplierId },
          })
        : null;

      const fraudInput = {
        invoiceId: invoice.id,
        supplierId: invoice.supplierId || "unknown",
        supplierName: invoice.supplierName,
        invoiceAmount: Number(invoice.totalAmount),
        invoiceDate: invoice.invoiceDate,
        supplierRiskLevel: (supplier?.riskLevel as RiskLevel) || "MEDIUM",
        invoiceCurrency: invoice.currency,
        lineItems: (invoice.lineItems || []).map((item) => ({
          lineNumber: item.lineNumber,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          vatAmount: item.vatAmount,
          lineTotalExclVAT: item.lineTotalExclVAT,
          lineTotalInclVAT: item.lineTotalInclVAT,
        })),
        hasDuplicatePattern:
          checks.find((c) => c.name === "Duplicate Check")?.passed === false,
        hasVATAnomaly:
          checks.find((c) => c.name === "VAT Validation")?.passed === false,
        extractionConfidence: invoice.extractionConfidence,
      };

      const fraudResult = FraudScorer.calculateScore(fraudInput);

      // Update invoice with fraud score
      await prisma.invoices.update({
        where: { id: invoiceId },
        data: {
          fraudScore: fraudResult.score,
          riskLevel: fraudResult.riskLevel,
        },
      });

      checks.push({
        name: "Fraud Scoring",
        passed: !fraudResult.requiresInvestigation,
        message: fraudResult.requiresInvestigation
          ? `High fraud risk detected (score: ${fraudResult.score}). Factors: ${fraudResult.riskFactors.map((f) => f.factor).join(", ")}`
          : `Fraud risk acceptable (score: ${fraudResult.score})`,
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
    await prisma.invoices.update({
      where: { id: invoiceId },
      data: {
        vatCompliant: vatCheck?.passed ?? false,
        termsCompliant: isCompliant,
        requiresAttention: requiresManualReview,
        status: isCompliant
          ? InvoiceStatus.PENDING_APPROVAL
          : InvoiceStatus.UNDER_VALIDATION,
      },
    });

    // Log compliance check
    await auditLogger.log({
      action: "COMPLIANCE_VIOLATION",
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
