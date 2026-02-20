import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";
import { PDFExtractor } from "@/lib/pdf-processor";
import { prisma } from "@/db/prisma";
import { AuditLogger } from "@/lib/utils/audit-logger";
import { authMiddleware } from "@/lib/middleware/auth";

// Priority mapping from string to integer
const PRIORITY_MAP: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const status = searchParams.get("status");
    const supplierName = searchParams.get("supplierName");

    // Build where clause
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (supplierName) {
      where.supplierName = {
        contains: supplierName,
        mode: "insensitive",
      };
    }

    // Get total count
    const total = await prisma.invoices.count({ where });

    // Get paginated invoices
    const invoices = await prisma.invoices.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        invoiceNumber: true,
        supplierName: true,
        totalAmount: true,
        status: true,
        dueDate: true,
        createdAt: true,
        riskLevel: true,
        currentApproverId: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        invoices,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invoices" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Apply auth middleware
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  try {
    // Check if request has FormData (file upload) or JSON (manual entry)
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload with FormData
      return handleFileUpload(request);
    } else {
      // Handle JSON body (manual entry)
      return handleJsonCreate(request);
    }
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create invoice" },
      { status: 500 },
    );
  }
}

/**
 * Handle invoice creation from JSON body (manual entry without file)
 */
async function handleJsonCreate(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();

  // Get user from headers
  const userId = request.headers.get("x-user-id") || "system";

  // Create invoice
  const invoice = await prisma.invoices.create({
    data: {
      invoiceNumber: body.invoiceNumber || `INV-${Date.now()}`,
      supplierName: body.supplierName || "Unknown Supplier",
      supplierVAT: body.supplierVAT || null,
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
      dueDate: body.dueDate
        ? new Date(body.dueDate)
        : new Date(Date.now() + 30 * 86400000),
      subtotalExclVAT: body.subtotalExclVAT || 0,
      vatAmount: body.vatAmount || 0,
      totalAmount: body.totalAmount || 0,
      amountDue: body.amountDue || body.totalAmount || 0,
      currency: body.currency || "ZAR",
      status: body.status || "PENDING_EXTRACTION",
      riskLevel: body.riskLevel || "MEDIUM",
      priority: PRIORITY_MAP[body.priority] || 2,
      createdById: userId,
      supplierId: body.supplierId || null,
      description: body.description || null,
    },
  });

  // Log audit event
  await AuditLogger.log({
    action: "CREATE",
    entityType: "INVOICE",
    entityId: invoice.id,
    entityDescription: `Invoice ${invoice.invoiceNumber} created manually`,
    severity: "INFO",
    userId,
    metadata: {
      source: "manual",
      hasFile: false,
    },
  });

  return NextResponse.json({ success: true, data: invoice }, { status: 201 });
}

/**
 * Handle invoice creation from file upload (FormData with file)
 */
async function handleFileUpload(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const supplierId = formData.get("supplierId") as string | null;
  const priorityStr = (formData.get("priority") as string) || "MEDIUM";
  const priority = PRIORITY_MAP[priorityStr] || 2;
  const notes = formData.get("notes") as string | null;
  const isManualEntry = formData.get("isManualEntry") === "true";

  // Get user from headers
  const userId = request.headers.get("x-user-id") || "system";

  // If manual entry with optional file, extract form fields
  let manualData: any = {};
  if (isManualEntry) {
    manualData = {
      invoiceNumber: formData.get("invoiceNumber") as string,
      supplierName: formData.get("supplierName") as string,
      supplierId: formData.get("supplierId") as string | null,
      invoiceDate: formData.get("invoiceDate") as string,
      dueDate: formData.get("dueDate") as string,
      totalAmount: parseFloat(formData.get("totalAmount") as string) || 0,
      vatAmount: parseFloat(formData.get("vatAmount") as string) || 0,
      description: formData.get("description") as string | null,
    };
  }

  let filename: string | null = null;
  let filepath: string | null = null;
  let extractionResult: any = null;

  // Process file if provided
  if (file) {
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
    filename = `${timestamp}-${safeName}`;
    filepath = join(uploadsDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Extract data from PDF
    if (file.type === "application/pdf") {
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
  }

  // Create invoice record
  // Use manual data if provided, otherwise use extracted data
  const extractedData = extractionResult?.data;
  const timestamp = Date.now();

  const invoice = await prisma.invoices.create({
    data: {
      invoiceNumber:
        manualData.invoiceNumber ||
        extractedData?.invoiceNumber ||
        `TEMP-${timestamp}`,
      supplierId: manualData.supplierId || supplierId || null,
      supplierName:
        manualData.supplierName ||
        extractedData?.supplierName ||
        "Unknown Supplier",
      supplierEmail: extractedData?.supplierEmail || null,
      supplierPhone: extractedData?.supplierPhone || null,
      supplierAddress: extractedData?.supplierAddress || null,
      supplierVAT: extractedData?.supplierVAT || null,
      invoiceDate: manualData.invoiceDate
        ? new Date(manualData.invoiceDate)
        : extractedData?.invoiceDate
          ? new Date(extractedData.invoiceDate)
          : new Date(),
      dueDate: manualData.dueDate
        ? new Date(manualData.dueDate)
        : extractedData?.dueDate
          ? new Date(extractedData.dueDate)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotalExclVAT: extractedData?.subtotalExclVAT || 0,
      vatAmount: manualData.vatAmount || extractedData?.vatAmount || 0,
      vatRate: extractedData?.vatRate || 15.0,
      totalAmount: manualData.totalAmount || extractedData?.totalAmount || 0,
      amountDue:
        manualData.totalAmount ||
        extractedData?.amountDue ||
        extractedData?.totalAmount ||
        0,
      currency: extractedData?.currency || "ZAR",
      pdfUrl: filename ? `/uploads/invoices/${filename}` : null,
      ocrText: extractedData?.rawText || null,
      extractionConfidence: extractionResult?.confidence || 0,
      status: extractionResult?.success ? "SUBMITTED" : "PENDING_EXTRACTION",
      priority: priority,
      createdById: userId,
      description: manualData.description || notes || null,
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
      source: isManualEntry ? "manual-with-file" : "file-upload",
      extractionSuccess: extractionResult?.success || false,
      confidence: extractionResult?.confidence || 0,
      strategy: extractionResult?.strategy || "NONE",
      hasFile: !!file,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      extractionSuccess: extractionResult?.success || false,
      confidence: extractionResult?.confidence || 0,
      warnings: extractionResult?.warnings || [],
      errors: extractionResult?.errors || [],
    },
  });
}

// App Router uses export const runtime and other segment configs
// Body parsing is handled automatically based on request type
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
