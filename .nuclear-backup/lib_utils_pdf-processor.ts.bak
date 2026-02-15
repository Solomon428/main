import pdf from 'pdf-parse';
import { Buffer } from 'buffer';

export interface ExtractedInvoiceData {
  invoiceNumber: string;
  invoiceDate: string | null;
  dueDate: string | null;
  supplierName: string;
  supplierVatNumber: string | null;
  subtotal: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
  currency: 'ZAR';
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
  status: 'PENDING_APPROVAL' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresManualReview: boolean;
}

export interface PDFProcessingResult {
  success: boolean;
  status: 'PROCESSED' | 'FAILED';
  processingId: string;
  confidence: number;
  extractionMethod: 'NATIVE_PDF' | 'OCR_FALLBACK' | 'FAILED';
  parsedData: ExtractedInvoiceData;
  rawText: string;
  processingDurationMs: number;
  error?: { code: string; message: string; timestamp: string };
  warnings: string[];
}

export class PDFProcessor {
  static async processInvoice(
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<PDFProcessingResult> {
    const processingId = `proc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    try {
      if (!fileBuffer?.length) {
        return this.createFailure(processingId, 'EMPTY_FILE', 'File buffer is empty');
      }

      let extractedText = '';
      let confidence = 0;
      
      if (mimeType === 'application/pdf') {
        try {
          const result = await pdf(fileBuffer);
          extractedText = result.text.trim();
          confidence = this.calculateConfidence(extractedText);
        } catch (err) {
          confidence = 15; // Low confidence but continue
        }
      }

      const parsedData = this.extractStructuredData(extractedText, fileName);
      
      return {
        success: true,
        status: 'PROCESSED',
        processingId,
        confidence,
        extractionMethod: mimeType === 'application/pdf' ? 'NATIVE_PDF' : 'OCR_FALLBACK',
        parsedData,
        rawText: extractedText.substring(0, 10000),
        processingDurationMs: 0,
        warnings: confidence < 50 ? ['Low confidence extraction'] : []
      };
    } catch (error) {
      return this.createFailure(processingId, 'PROCESSING_ERROR', (error as Error).message);
    }
  }

  private static extractStructuredData(text: string, fileName: string): ExtractedInvoiceData {
    return {
      invoiceNumber: this.extractInvoiceNumber(text) || `UNKNOWN_${Date.now()}`,
      invoiceDate: this.extractInvoiceDate(text),
      dueDate: this.extractDueDate(text),
      supplierName: this.extractSupplierName(text) || 'Unknown Supplier',
      supplierVatNumber: this.extractVatNumber(text),
      subtotal: this.extractSubtotal(text),
      vatAmount: this.extractVatAmount(text),
      totalAmount: this.extractTotalAmount(text),
      currency: 'ZAR',
      lineItems: [],
      status: 'PENDING_APPROVAL',
      riskLevel: 'MEDIUM',
      requiresManualReview: false
    };
  }

  private static extractInvoiceNumber(text: string): string | null {
    const patterns = [
      /invoice\s*(?:no|number|#)?[:\s]*([A-Z0-9-]+)/i,
      /inv[.\s]*(?:no)?[:\s]*([A-Z0-9-]+)/i,
      /(?:tax\s*)?invoice\s*(?:ref|reference)?[:\s]*([A-Z0-9-]+)/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }

  private static extractInvoiceDate(text: string): string | null {
    const patterns = [
      /invoice\s*date[:\s]*([\d]{1,2}[\/\-.][\d]{1,2}[\/\-.][\d]{2,4})/i,
      /date[:\s]*([\d]{1,2}[\/\-.][\d]{1,2}[\/\-.][\d]{2,4})/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const date = new Date(match[1].replace(/[\/.]/g, '-'));
          if (!isNaN(date.getTime())) return date.toISOString();
        } catch { /* continue */ }
      }
    }
    return new Date().toISOString();
  }

  private static extractDueDate(text: string): string | null {
    const patterns = [
      /due\s*date[:\s]*([\d]{1,2}[\/\-.][\d]{1,2}[\/\-.][\d]{2,4})/i,
      /payment\s*due[:\s]*([\d]{1,2}[\/\-.][\d]{1,2}[\/\-.][\d]{2,4})/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const date = new Date(match[1].replace(/[\/.]/g, '-'));
          if (!isNaN(date.getTime())) return date.toISOString();
        } catch { /* continue */ }
      }
    }
    // Default to 30 days from now
    return new Date(Date.now() + 30 * 86400000).toISOString();
  }

  private static extractSupplierName(text: string): string | null {
    const patterns = [
      /(?:from|supplier|vendor)[:\s]*([A-Z][A-Za-z0-9\s&.,]+)(?:\n|$)/i,
      /([A-Z][A-Za-z0-9\s&.,]+(?:PTY|LTD|LIMITED|CC|INC))/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }

  private static extractVatNumber(text: string): string | null {
    const match = text.match(/(?:vat\s*(?:no|number)?|tax\s+no)[:\s]*(4\d{9})/i);
    return match ? match[1].replace(/\s/g, '') : null;
  }

  private static extractSubtotal(text: string): number | null {
    const patterns = [
      /subtotal[:\s]*R?\s*([\d,]+\.?\d*)/i,
      /sub[-\s]?total[:\s]*R?\s*([\d,]+\.?\d*)/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value)) return value;
      }
    }
    return null;
  }

  private static extractVatAmount(text: string): number | null {
    const patterns = [
      /vat[:\s]*R?\s*([\d,]+\.?\d*)/i,
      /tax[:\s]*R?\s*([\d,]+\.?\d*)/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value)) return value;
      }
    }
    return null;
  }

  private static extractTotalAmount(text: string): number | null {
    const patterns = [
      /total[:\s]*R?\s*([\d,]+\.?\d*)/i,
      /amount\s*due[:\s]*R?\s*([\d,]+\.?\d*)/i,
      /balance\s*due[:\s]*R?\s*([\d,]+\.?\d*)/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value)) return value;
      }
    }
    return null;
  }

  private static calculateConfidence(text: string): number {
    if (!text || text.length < 50) return 10;
    let confidence = 30;
    if (text.toLowerCase().includes('tax invoice')) confidence += 25;
    if (text.toLowerCase().includes('vat')) confidence += 20;
    if (text.match(/R\s*\d+/)) confidence += 15;
    return Math.max(10, Math.min(100, confidence));
  }

  private static createFailure(
    processingId: string,
    code: string,
    message: string
  ): PDFProcessingResult {
    return {
      success: false,
      status: 'FAILED',
      processingId,
      confidence: 0,
      extractionMethod: 'FAILED',
      parsedData: {
        invoiceNumber: `FAILED_${processingId}`,
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        supplierName: 'Failed Extraction',
        supplierVatNumber: null,
        subtotal: 0,
        vatAmount: 0,
        totalAmount: 0,
        currency: 'ZAR',
        lineItems: [],
        status: 'UNDER_REVIEW',
        riskLevel: 'HIGH',
        requiresManualReview: true
      },
      rawText: '',
      processingDurationMs: 0,
      error: { code, message, timestamp: new Date().toISOString() },
      warnings: [`Processing failed: ${message}`]
    };
  }
}

export const pdfProcessor = new PDFProcessor();
export default PDFProcessor;
