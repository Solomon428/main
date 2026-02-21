import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { InvoiceComplianceChecker } from "@/logic-engine/compliance/invoice-compliance-checker";
import { VATValidator } from "@/logic-engine/compliance/vat-validator";
import { authMiddleware } from "@/lib/middleware/auth";
import { AuditLogger } from "@/lib/utils/audit-logger";

export async function POST(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  try {
    const body = await request.json();
    const { invoiceId, type } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: "Invoice ID is required" },
        { status: 400 },
      );
    }

    const userId = request.headers.get("x-user-id") || "system";

    // Get invoice with related data
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: true,
        approvals: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 },
      );
    }

    let results: any = {};

    switch (type) {
      case "full":
        // Run full compliance check
        results = await InvoiceComplianceChecker.validateInvoice(invoice);
        break;

      case "vat":
        // Validate VAT compliance
        const vatResult = await VATValidator.validateVATCompliance(invoice);
        results = {
          vatCompliant: vatResult.compliant,
          vatChecks: vatResult.checks,
          vatErrors: vatResult.errors,
          vatWarnings: vatResult.warnings,
        };
        break;

      case "supplier":
        // Validate supplier compliance
        const supplier = invoice.supplierId
          ? await prisma.supplier.findUnique({
              where: { id: invoice.supplierId },
            })
          : null;
        if (supplier) {
          results = await InvoiceComplianceChecker.validateSupplierCompliance(
            invoice,
            supplier,
          );
        } else {
          results = {
            compliant: false,
            errors: ["No supplier associated with this invoice"],
          };
        }
        break;

      case "approval":
        // Validate approval authority
        results = await InvoiceComplianceChecker.validateApprovalAuthority(
          invoice,
          invoice.approvals,
        );
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Invalid validation type" },
          { status: 400 },
        );
    }

    // Update invoice compliance status
    const isCompliant = results.compliant || results.vatCompliant || false;
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        vatCompliant: results.vatCompliant ?? invoice.vatCompliant,
        termsCompliant: results.compliant ?? invoice.termsCompliant,
        validationScore: results.score || invoice.validationScore,
      },
    });

    // Log compliance check
    await AuditLogger.log({
      action: "COMPLIANCE_VIOLATION",
      entityType: "INVOICE",
      entityId: invoiceId,
      entityDescription: `Compliance validation: ${type}`,
      severity: isCompliant ? "INFO" : "WARNING",
      userId,
      metadata: { type, results },
    });

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error validating compliance:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate compliance" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: "Invoice ID is required" },
        { status: 400 },
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        vatCompliant: true,
        termsCompliant: true,
        validationScore: true,
        status: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        complianceStatus: {
          vatCompliant: invoice.vatCompliant,
          termsCompliant: invoice.termsCompliant,
          validationScore: invoice.validationScore,
          overallCompliant: invoice.vatCompliant && invoice.termsCompliant,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching compliance status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch compliance status" },
      { status: 500 },
    );
  }
}
