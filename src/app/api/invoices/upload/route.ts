import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile, stat } from 'fs/promises';
import path, { join, normalize, resolve } from 'path';
import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extractTextFromInvoice } from '@/modules/files/ocr/services/hybrid-extractor';
import { InvoiceParser } from '@/modules/invoices/services/invoice-parser.service';
import { AuditLogger } from '@/lib/utils/audit-logger';

/**
 * Minimal upload endpoint with duplicate handling and proper organization linking
 * POST /api/invoices/upload
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('invoice') as File;
    const supplierId = formData.get('supplierId') as string | null;
    const organizationId = formData.get('organizationId') as string | null;
    const autoProcess = formData.get('autoProcess') !== 'false';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, PNG, and JPEG are allowed.' }, { status: 400 });
    }
    const maxSize = 10 * 1024 * 1024;
    if ((file.size ?? 0) > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    // Save file
    const uploadsDir = join(process.cwd(), 'uploads', 'invoices');
    await mkdir(uploadsDir, { recursive: true });
    const timestamp = Date.now();
    const safeName = (file.name ?? 'invoice').replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${safeName}`;
    const filepath = join(uploadsDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Extract data from PDF if applicable
    let extractionResult: any;
    if (file.type === 'application/pdf') {
      const pdfBuffer = await readFile(filepath);
      const { text, method } = await extractTextFromInvoice(pdfBuffer);
      const parsed = InvoiceParser.parse(text ?? '');
      extractionResult = {
        success: !!text && text!.trim().length > 0,
        data: parsed,
        text: text ?? '',
        method,
        confidence: 0.8,
        rawText: text ?? ''
      };
    } else {
      extractionResult = {
        success: false,
        strategy: 'NONE' as const,
        errors: ['Image OCR not implemented yet'],
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

    // Determine user context for auditing
    const userId = session.user?.id ?? 'system';
    const organizationCtx = organizationId ?? 'dev-org-001';
    console.log('[Upload] User ID:', userId);
    console.log('[Upload] Org ID:', organizationCtx);

    // Decide base invoice number to avoid collisions
    const extractedData = extractionResult.data;
    const baseInvoiceNumber = extractedData?.invoiceNumber || `TEMP-${timestamp}`;
    let invoiceNumber = baseInvoiceNumber;
    let counter = 1;
    // Ensure uniqueness within the organization
    while (true) {
      const existing = await prisma.invoice.findFirst({
        where: {
          organizationId: organizationCtx,
          invoiceNumber,
        },
      });
      if (!existing) break;
      invoiceNumber = `${baseInvoiceNumber}-${counter++}`;
    }

    // Build invoice data with organization reference
    const invoiceData: any = {
      organizationId: organizationCtx,
      invoiceNumber,
      supplierId: supplierId ?? null,
      supplierName: extractedData?.supplierName ?? 'Unknown Supplier',
      supplierEmail: extractedData?.supplierEmail ?? null,
      supplierPhone: extractedData?.supplierPhone ?? null,
      supplierAddress: extractedData?.supplierAddress ?? null,
      supplierVAT: extractedData?.supplierVAT ?? null,
      invoiceDate: extractedData?.invoiceDate ?? new Date(),
      dueDate: extractedData?.dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotalExclVAT: extractedData?.subtotalExclVAT ?? 0,
      vatAmount: extractedData?.vatAmount ?? 0,
      vatRate: (extractedData as any)?.vatRate ?? 15.0,
      totalAmount: extractedData?.totalAmount ?? 0,
      amountDue: extractedData?.amountDue ?? (extractedData?.totalAmount ?? 0),
      currency: extractedData?.currency ?? 'ZAR',
      pdfUrl: `/uploads/invoices/${filename}`,
      ocrText: extractionResult?.text ?? null,
      extractionConfidence: extractionResult?.confidence ?? 0,
      status: extractionResult?.success ? 'SUBMITTED' : 'PENDING_EXTRACTION',
      creatorId: userId,
    };

    const invoice = await prisma.invoice.create({ data: invoiceData });

    // Create line items if present
    if (extractedData?.lineItems && extractedData.lineItems.length > 0) {
      await prisma.invoiceLineItem.createMany({
        data: extractedData.lineItems.map((item: any, index: number) => ({
          invoiceId: invoice.id,
          lineNumber: item.lineNumber ?? index + 1,
          description: item.description,
          productCode: item.productCode ?? null,
          unitOfMeasure: item.unitOfMeasure ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate ?? 15.0,
          vatAmount: item.vatAmount,
          lineTotalExclVAT: item.lineTotalExclVAT,
          lineTotalInclVAT: item.lineTotalInclVAT,
        })),
      });
    }

    // Audit log for upload
    await AuditLogger.log({
      action: 'CREATE',
      entityType: 'INVOICE',
      entityId: invoice.id,
      entityDescription: `Invoice ${invoice.invoiceNumber} uploaded`,
      severity: 'INFO' as const,
      userId,
      metadata: {
        extractionSuccess: extractionResult.success,
        confidence: extractionResult?.confidence ?? 0,
        strategy: extractionResult?.strategy ?? 'NONE',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        extractionSuccess: extractionResult.success,
        confidence: extractionResult?.confidence ?? 0,
      },
    });
  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to upload invoice', details: errorMessage }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
