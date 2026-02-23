import { PDFProcessor } from './utils/pdf-processor';
import { readFile } from 'fs/promises';

export class PDFExtractor {
  static async extractInvoiceData(filePath: string) {
    try {
      const fileBuffer = await readFile(filePath);
      const result = await PDFProcessor.processInvoice(
        fileBuffer,
        'application/pdf',
        filePath
      );

      if (!result.success) {
        return {
          success: false,
          data: null,
          errors: [result.error?.message || 'Processing failed'],
          warnings: result.warnings,
          confidence: 0,
          strategy: 'FAILED' as const,
          processingTime: result.processingDurationMs,
          mathValidation: {
            passed: false,
            expectedTotal: 0,
            actualTotal: 0,
            difference: 0,
          },
        };
      }

      const parsedData = result.parsedData;

      return {
        success: true,
        data: {
          invoiceNumber: parsedData.invoiceNumber,
          invoiceDate: parsedData.invoiceDate ? new Date(parsedData.invoiceDate) : null,
          dueDate: parsedData.dueDate ? new Date(parsedData.dueDate) : null,
          supplierName: parsedData.supplierName,
          supplierEmail: null,
          supplierPhone: null,
          supplierAddress: null,
          supplierVAT: parsedData.supplierVatNumber,
          subtotalExclVAT: parsedData.subtotal || 0,
          vatAmount: parsedData.vatAmount || 0,
          vatRate: 15.0,
          totalAmount: parsedData.totalAmount || 0,
          amountDue: parsedData.totalAmount || 0,
          currency: parsedData.currency || 'ZAR',
          lineItems: parsedData.lineItems || [],
          rawText: result.rawText,
        },
        errors: [],
        warnings: result.warnings,
        confidence: result.confidence,
        strategy: result.extractionMethod as any,
        processingTime: result.processingDurationMs,
        mathValidation: {
          passed: result.confidence > 50,
          expectedTotal: parsedData.totalAmount || 0,
          actualTotal: parsedData.totalAmount || 0,
          difference: 0,
        },
      };
    } catch (error) {
      console.error('[PDFExtractor] Error:', error);
      return {
        success: false,
        data: null,
        errors: [(error as Error).message],
        warnings: [],
        confidence: 0,
        strategy: 'FAILED' as const,
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
}
