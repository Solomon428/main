import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, stat } from "fs/promises";
import { join, normalize, resolve } from "path";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus, PriorityLevel } from "@/types";
import { AuditLogger } from "@/lib/utils/audit-logger";
import { authMiddleware } from "@/lib/middleware/auth";

/**
 * GET handler to serve PDF files from the uploads directory
 * GET /api/invoices/upload?path=/uploads/invoices/filename.pdf
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: "File path is required" },
        { status: 400 },
      );
    }

    // Security: Normalize and validate the path to prevent directory traversal
    const uploadsDir = resolve(process.cwd(), "uploads", "invoices");

    // Extract filename from path (handles /uploads/invoices/filename.pdf format)
    const filename = filePath
      .replace(/^\/uploads\/invoices\//, "")
      .replace(/^uploads\/invoices\//, "");

    // Validate filename - only allow alphanumeric, hyphens, underscores, and dots
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return NextResponse.json(
        { success: false, error: "Invalid file path" },
        { status: 400 },
      );
    }

    const fullPath = normalize(join(uploadsDir, filename));

    // Ensure the resolved path is still within the uploads directory
    if (!fullPath.startsWith(uploadsDir)) {
      return NextResponse.json(
        { success: false, error: "Invalid file path" },
        { status: 400 },
      );
    }

    // Check if file exists
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 },
      );
    }

    // Get file stats
    const fileStats = await stat(fullPath);

    // Read file
    const fileBuffer = await readFile(fullPath);

    // Determine content type based on extension
    const ext = filename.split(".").pop()?.toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === "pdf") {
      contentType = "application/pdf";
    } else if (ext === "png") {
      contentType = "image/png";
    } else if (ext === "jpg" || ext === "jpeg") {
      contentType = "image/jpeg";
    }

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStats.size.toString(),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[PDF Upload API] Error serving file:", error);
    return NextResponse.json(
      { success: false, error: "Failed to serve file" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  // Apply auth middleware
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("invoice") as File;
    const supplierId = formData.get("supplierId") as string | null;

    // Validate file
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Only PDF, PNG, and JPEG are allowed.",
        },
        { status: 400 },
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 10MB." },
        { status: 400 },
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "uploads", "invoices");
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${safeName}`;
    const filepath = join(uploadsDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Extract data from PDF
    let extractionResult;
    if (file.type === "application/pdf") {
      const { PDFExtractor } = await import("@/lib/pdf-processor");
      extractionResult = await PDFExtractor.extractInvoiceData(filepath);
    } else {
      extractionResult = {
        success: false,
        strategy: "NONE" as const,
        errors: ["Image OCR not implemented yet"],
        warnings: [],
        confidence: 0,
        processingTime: 0,
        mathValidation: {
          passed: false,
          expectedTotal: 0,
          actualTotal: 0,
          difference: 0,
        },
      };
    }

    // Get user from headers
    const userId = request.headers.get("x-user-id") || "system";

    // Create invoice record
    const extractedData = extractionResult.data;
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: extractedData?.invoiceNumber || `TEMP-${timestamp}`,
        supplierId: supplierId || null,
        supplierName: extractedData?.supplierName || "Unknown Supplier",
        supplierEmail: extractedData?.supplierEmail || null,
        supplierPhone: extractedData?.supplierPhone || null,
        supplierAddress: extractedData?.supplierAddress || null,
        supplierVAT: extractedData?.supplierVAT || null,
        invoiceDate: extractedData?.invoiceDate || new Date(),
        dueDate:
          extractedData?.dueDate ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotalExclVAT: extractedData?.subtotalExclVAT || 0,
        vatAmount: extractedData?.vatAmount || 0,
        vatRate: extractedData?.vatRate || 15.0,
        totalAmount: extractedData?.totalAmount || 0,
        amountDue: extractedData?.amountDue || extractedData?.totalAmount || 0,
        currency: extractedData?.currency || "ZAR",
        pdfUrl: `/uploads/invoices/${filename}`,
        ocrText: extractedData?.rawText || null,
        extractionConfidence: extractionResult.confidence,
        status: extractionResult.success
          ? InvoiceStatus.SUBMITTED
          : InvoiceStatus.PENDING_EXTRACTION,

        createdById: userId,
      },
    });

    // Create line items if extracted
    if (extractedData?.lineItems && extractedData.lineItems.length > 0) {
      await prisma.invoiceLineItem.createMany({
        data: extractedData.lineItems.map((item: any, index: number) => ({
          invoiceId: invoice.id,
          lineNumber: item.lineNumber || index + 1,
          description: item.description,
          productCode: item.productCode || null,
          unitOfMeasure: item.unitOfMeasure || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate || 15.0,
          vatAmount: item.vatAmount,
          lineTotalExclVAT: item.lineTotalExclVAT,
          lineTotalInclVAT: item.lineTotalInclVAT,
        })),
      });
    }

    // Log audit event
    await AuditLogger.log({
      action: "CREATE",
      entityType: "INVOICE",
      entityId: invoice.id,
      entityDescription: `Invoice ${invoice.invoiceNumber} uploaded`,
      severity: "INFO",
      userId,
      metadata: {
        extractionSuccess: extractionResult.success,
        confidence: extractionResult.confidence,
        strategy: extractionResult.strategy,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        extractionSuccess: extractionResult.success,
        confidence: extractionResult.confidence,
        warnings: extractionResult.warnings,
        errors: extractionResult.errors,
      },
    });
  } catch (error) {
    console.error("Error uploading invoice:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload invoice" },
      { status: 500 },
    );
  }
}

// App Router uses export const runtime and other segment configs
// Body parsing is handled automatically based on request type
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
