// ============================================================================
// CreditorFlow - PDF Extractor (Multi-Strategy)
// ============================================================================
// Extracts invoice data from PDFs using multiple strategies:
// 1. Text-based PDF extraction (pdf-parse)
// 2. OCR fallback for scanned PDFs (tesseract.js stub - ready for implementation)
// 3. Manual fallback with structured data entry
//
// Features:
// - OCR error normalization (O→0, l→1, S→5, B→8)
// - Math validation (subtotal + VAT = total ±0.05)
// - Schema-aligned field names
// - Comprehensive error handling and audit logging
// ============================================================================

import { readFile } from 'fs/promises';
import { ExtractedInvoiceData, ExtractedLineItem } from '@/types';

// Use require for pdf-parse to avoid ES module issues
let pdfParse: any;
try {
  pdfParse = require('pdf-parse');
} catch {
  pdfParse = null;
}

// Extraction result with metadata
export interface PDFExtractionResult {
  success: boolean;
  data?: ExtractedInvoiceData;
  strategy: 'TEXT' | 'OCR' | 'MANUAL' | 'NONE';
  errors: string[];
  warnings: string[];
  confidence: number;
  processingTime: number;
  mathValidation: {
    passed: boolean;
    expectedTotal: number;
    actualTotal: number;
    difference: number;
  };
}

/**
 * PDFExtractor - Multi-strategy PDF extraction engine
 *
 * Usage:
 * ```typescript
 * const result = await PDFExtractor.extractInvoiceData('/path/to/invoice.pdf');
 * if (result.success) {
 *   console.log(result.data.invoiceNumber);
 * }
 * ```
 */
export class PDFExtractor {
  private static readonly MATH_TOLERANCE = 0.05;
  private static readonly DEFAULT_VAT_RATE = 15.0;

  /**
   * Main extraction method - tries strategies in order of preference
   */
  static async extractInvoiceData(
    filePath: string
  ): Promise<PDFExtractionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Strategy 1: Try text-based extraction (for digital PDFs)
    try {
      const textResult = await this.extractFromTextPDF(filePath);
      if (textResult.success && textResult.confidence > 0.5) {
        return {
          ...textResult,
          processingTime: Date.now() - startTime,
        };
      }
      warnings.push(...textResult.warnings);
    } catch (error) {
      errors.push(
        `Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Strategy 2: Try OCR extraction (for scanned PDFs)
    try {
      const ocrResult = await this.extractFromOCR(filePath);
      if (ocrResult.success && ocrResult.confidence > 0.4) {
        return {
          ...ocrResult,
          processingTime: Date.now() - startTime,
        };
      }
      warnings.push(...ocrResult.warnings);
    } catch (error) {
      errors.push(
        `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Strategy 3: Return manual entry fallback
    const processingTime = Date.now() - startTime;
    return {
      success: false,
      strategy: 'NONE',
      errors: [
        ...errors,
        'All extraction strategies failed. Manual entry required.',
      ],
      warnings,
      confidence: 0,
      processingTime,
      mathValidation: {
        passed: false,
        expectedTotal: 0,
        actualTotal: 0,
        difference: 0,
      },
    };
  }

  /**
   * Extract from text-based PDF using pdf-parse
   */
  private static async extractFromTextPDF(
    filePath: string
  ): Promise<PDFExtractionResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    if (!pdfParse) {
      return {
        success: false,
        strategy: 'TEXT',
        errors: ['pdf-parse library not available'],
        warnings: ['Please install pdf-parse: npm install pdf-parse'],
        confidence: 0,
        processingTime: Date.now() - startTime,
        mathValidation: {
          passed: false,
          expectedTotal: 0,
          actualTotal: 0,
          difference: 0,
        },
      };
    }

    try {
      const buffer = await readFile(filePath);
      const pdfData = await pdfParse(buffer);

      const rawText = pdfData.text;

      if (!rawText || rawText.trim().length < 50) {
        return {
          success: false,
          strategy: 'TEXT',
          errors: ['PDF contains insufficient text - may be scanned image'],
          warnings,
          confidence: 0,
          processingTime: Date.now() - startTime,
          mathValidation: {
            passed: false,
            expectedTotal: 0,
            actualTotal: 0,
            difference: 0,
          },
        };
      }

      // Normalize OCR errors
      const normalizedText = this.normalizeOCRText(rawText);

      // Extract fields
      const extracted = this.extractFields(normalizedText);

      // Validate and calculate
      const validated = this.validateAndCalculate(extracted, warnings);

      // Math validation
      const mathValidation = this.validateMath(validated);

      // Calculate confidence
      const confidence = this.calculateConfidence(validated);

      return {
        success: confidence > 0.3,
        data: validated,
        strategy: 'TEXT',
        errors: confidence <= 0.3 ? ['Low extraction confidence'] : [],
        warnings,
        confidence,
        processingTime: Date.now() - startTime,
        mathValidation,
      };
    } catch (error) {
      return {
        success: false,
        strategy: 'TEXT',
        errors: [
          `Text extraction error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings,
        confidence: 0,
        processingTime: Date.now() - startTime,
        mathValidation: {
          passed: false,
          expectedTotal: 0,
          actualTotal: 0,
          difference: 0,
        },
      };
    }
  }

  /**
   * Extract from scanned PDF using OCR (integrated with AI-powered OCR processor)
   */
  private static async extractFromOCR(
    filePath: string
  ): Promise<PDFExtractionResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Dynamically import OCR processor to avoid loading on startup
      const { OCRProcessor } = await import('@/lib/pdf-processor');
      const ocrProcessor = new OCRProcessor();

      // Read file buffer
      const buffer = await readFile(filePath);

      // Process with OCR
      const ocrResult = await ocrProcessor.processPDF(buffer);

      if (!ocrResult.structuredData) {
        return {
          success: false,
          strategy: 'OCR',
          errors: ['OCR failed to extract structured data'],
          warnings: ['OCR processing completed but no data extracted'],
          confidence: 0,
          processingTime: Date.now() - startTime,
          mathValidation: {
            passed: false,
            expectedTotal: 0,
            actualTotal: 0,
            difference: 0,
          },
        };
      }

      // Convert OCR result to ExtractedInvoiceData format
      const extractedData: ExtractedInvoiceData = {
        invoiceNumber: ocrResult.structuredData.invoiceNumber,
        supplierName: ocrResult.structuredData.supplierName,
        supplierVAT: ocrResult.structuredData.vatNumber || undefined,
        supplierAddress: ocrResult.structuredData.supplierAddress,
        invoiceDate: ocrResult.structuredData.dateIssued,
        dueDate: ocrResult.structuredData.dateDue,
        subtotalExclVAT: ocrResult.structuredData.subtotalExclVAT,
        vatAmount: ocrResult.structuredData.vatAmount,
        vatRate: 15.0, // Default for ZAR
        totalAmount: ocrResult.structuredData.totalAmount,
        currency: ocrResult.structuredData.currency,
        paymentTerms:
          parseInt(ocrResult.structuredData.paymentTerms.replace(/\D/g, '')) ||
          30,
        lineItems: ocrResult.structuredData.lineItems.map((item, index) => ({
          lineNumber: index + 1,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate || 15.0,
          vatAmount: (item.lineTotal * (item.vatRate || 15.0)) / 100,
          lineTotalExclVAT: item.lineTotal,
          lineTotalInclVAT: item.lineTotal * (1 + (item.vatRate || 15.0) / 100),
        })),
        rawText: ocrResult.text,
        extractionConfidence: ocrResult.confidence / 100,
      };

      // Math validation
      const mathValidation = this.validateMath(extractedData);

      // Cleanup
      await ocrProcessor.destroy();

      return {
        success: ocrResult.confidence > 40,
        data: extractedData,
        strategy: 'OCR',
        errors: ocrResult.confidence <= 40 ? ['Low OCR confidence'] : [],
        warnings,
        confidence: ocrResult.confidence / 100,
        processingTime: Date.now() - startTime,
        mathValidation,
      };
    } catch (error: any) {
      return {
        success: false,
        strategy: 'OCR',
        errors: [`OCR extraction error: ${error.message}`],
        warnings: ['Scanned PDF detected - OCR processing failed'],
        confidence: 0,
        processingTime: Date.now() - startTime,
        mathValidation: {
          passed: false,
          expectedTotal: 0,
          actualTotal: 0,
          difference: 0,
        },
      };
    }
  }

  /**
   * Normalize OCR text to fix common misreads
   */
  private static normalizeOCRText(text: string): string {
    return (
      text
        // OCR error corrections
        .replace(/[Oo](?=\d)/g, '0') // O before digit -> 0
        .replace(/l/g, '1') // lowercase L -> 1
        .replace(/I(?=\d)/g, '1') // capital I before digit -> 1
        .replace(/S(?=\d)/g, '5') // S before digit -> 5
        .replace(/B(?=\d)/g, '8') // B before digit -> 8
        .replace(/Z/g, '2') // Z -> 2
        .replace(/G(?=\d)/g, '6') // G before digit -> 6
        // Clean up whitespace
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        // Normalize currency symbols
        .replace(/[Rr]\s*/g, 'R ')
        // Normalize number formats
        .replace(/(\d),(\d{3})/g, '$1$2')
    );
  }

  /**
   * Extract fields from normalized text
   */
  private static extractFields(text: string): ExtractedInvoiceData {
    const data: Partial<ExtractedInvoiceData> = {
      lineItems: [],
      rawText: text,
      extractionConfidence: 0,
      currency: 'ZAR',
      vatRate: this.DEFAULT_VAT_RATE,
      paymentTerms: 30,
    };

    // Invoice Number
    const invPatterns = [
      /invoice\s*(?:number|no|#)?[:\s]*([A-Z0-9\-]+)/i,
      /inv[:\s]*([A-Z0-9\-]+)/i,
      /(?:document|ref)[:\s]*([A-Z0-9\-]+)/i,
    ];
    for (const pattern of invPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        data.invoiceNumber = match[1].trim();
        break;
      }
    }

    // Supplier Name
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length > 0) {
      // First line often contains company name
      data.supplierName = lines[0].trim().substring(0, 100);
    }

    // Try to find better supplier name (look for "From:" or company indicators)
    const fromMatch = text.match(
      /From:\s*\n?\s*([^\n]+(?:Pty|Ltd|Limited|Inc)[^\n]*)/i
    );
    if (fromMatch?.[1]) {
      data.supplierName = fromMatch[1].trim();
    }

    // VAT Number (South African format: starts with 4, 10 digits)
    const vatMatch = text.match(/VAT\s*(?:number|no|#|reg)?[:\s]*(4\d{9})/i);
    if (vatMatch?.[1]) {
      data.supplierVAT = vatMatch[1];
    }

    // Email
    const emailMatch = text.match(/([\w.-]+@[\w.-]+\.[A-Za-z]{2,})/);
    if (emailMatch?.[1]) {
      data.supplierEmail = emailMatch[1];
    }

    // Phone
    const phoneMatch = text.match(/(?:tel|phone)[:\s]*([\d\s\(\)\-+]+)/i);
    if (phoneMatch?.[1]) {
      data.supplierPhone = phoneMatch[1].trim();
    }

    // Dates
    const dates = this.extractDates(text);
    if (dates.invoiceDate) data.invoiceDate = dates.invoiceDate;
    if (dates.dueDate) data.dueDate = dates.dueDate;

    // Amounts
    const amounts = this.extractAmounts(text);
    data.subtotalExclVAT = amounts.subtotal || 0;
    data.vatAmount = amounts.vat || 0;
    data.totalAmount = amounts.total || 0;
    if (amounts.vatRate) data.vatRate = amounts.vatRate;

    // Reference
    const refMatch = text.match(
      /(?:PO|P\.O\.|Reference|Ref)[:\s#]*([A-Z0-9\-]+)/i
    );
    if (refMatch?.[1]) {
      data.referenceNumber = refMatch[1];
    }

    // Bank Details
    const bankMatch = text.match(/(?:bank)[:\s]*\n?\s*([^\n]+)/i);
    if (bankMatch?.[1]) data.bankName = bankMatch[1].trim();

    const accountMatch = text.match(/(?:account\s*#?|acc\.?\s*#?)[:\s]*(\d+)/i);
    if (accountMatch?.[1]) data.accountNumber = accountMatch[1];

    const branchMatch = text.match(/(?:branch\s*code|branch)[:\s]*(\d{6})/i);
    if (branchMatch?.[1]) data.branchCode = branchMatch[1];

    return data as ExtractedInvoiceData;
  }

  /**
   * Extract dates from text
   */
  private static extractDates(text: string): {
    invoiceDate?: Date;
    dueDate?: Date;
  } {
    const result: { invoiceDate?: Date; dueDate?: Date } = {};
    const foundDates: Date[] = [];

    // Date patterns
    const patterns = [
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/g, // DD/MM/YYYY
      /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/g, // YYYY-MM-DD
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const date = this.parseDate(match);
        if (date) foundDates.push(date);
      }
    }

    foundDates.sort((a, b) => a.getTime() - b.getTime());
    if (foundDates.length >= 1) result.invoiceDate = foundDates[0];
    if (foundDates.length >= 2)
      result.dueDate = foundDates[foundDates.length - 1];

    return result;
  }

  /**
   * Parse date from regex match
   */
  private static parseDate(match: RegExpExecArray): Date | null {
    try {
      const parts = match[0].split(/[\/\-.]/);
      if (parts.length !== 3) return null;

      let day: number, month: number, year: number;

      if (parts[0].length === 4) {
        // YYYY-MM-DD
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        day = parseInt(parts[2]);
      } else {
        // DD-MM-YYYY
        day = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        year = parseInt(parts[2]);
      }

      if (year < 100) year += year < 50 ? 2000 : 1900;

      const date = new Date(year, month, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      ) {
        return date;
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  }

  /**
   * Extract monetary amounts
   */
  private static extractAmounts(text: string): {
    subtotal?: number;
    vat?: number;
    total?: number;
    vatRate?: number;
  } {
    const result: {
      subtotal?: number;
      vat?: number;
      total?: number;
      vatRate?: number;
    } = {};

    // Amount patterns
    const patterns = {
      subtotal: /(?:subtotal|sub-total|net|excl VAT)[:\s]*R?\s*([\d,]+\.?\d*)/i,
      vat: /(?:vat|tax)[:\s]*R?\s*([\d,]+\.?\d*)/i,
      total: /(?:total|amount due|balance due)[:\s]*R?\s*([\d,]+\.?\d*)/i,
      vatRate: /vat\s*[\(\[]?\s*(\d+\.?\d*)\s*%\s*[\)\]]?/i,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value)) {
          (result as any)[key] = value;
        }
      }
    }

    // Calculate missing amounts
    if (result.subtotal && result.vat && !result.total) {
      result.total = result.subtotal + result.vat;
    }
    if (result.total && result.vat && !result.subtotal) {
      result.subtotal = result.total - result.vat;
    }
    if (result.total && result.subtotal && !result.vat) {
      result.vat = result.total - result.subtotal;
    }

    // Find largest amount as total if not found
    if (!result.total) {
      const allAmounts = this.extractAllAmounts(text);
      if (allAmounts.length > 0) {
        result.total = Math.max(...allAmounts);
      }
    }

    return result;
  }

  /**
   * Extract all monetary amounts from text
   */
  private static extractAllAmounts(text: string): number[] {
    const amounts: number[] = [];
    const pattern = /R?\s*([\d,]+\.\d{2})/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0) {
        amounts.push(value);
      }
    }

    return amounts;
  }

  /**
   * Validate and calculate missing fields
   */
  private static validateAndCalculate(
    data: Partial<ExtractedInvoiceData>,
    warnings: string[]
  ): ExtractedInvoiceData {
    const validated = { ...data } as ExtractedInvoiceData;

    // Ensure required amounts
    if (!validated.subtotalExclVAT) {
      validated.subtotalExclVAT = 0;
      warnings.push('Subtotal not found, defaulting to 0');
    }

    if (!validated.vatAmount) {
      validated.vatAmount =
        validated.subtotalExclVAT * (validated.vatRate / 100);
      warnings.push('VAT amount calculated from subtotal');
    }

    if (!validated.totalAmount) {
      validated.totalAmount = validated.subtotalExclVAT + validated.vatAmount;
      warnings.push('Total calculated from subtotal + VAT');
    }

    if (!validated.amountDue) {
      validated.amountDue = validated.totalAmount;
    }

    if (!validated.invoiceDate) {
      validated.invoiceDate = new Date();
      warnings.push('Invoice date not found, using current date');
    }

    if (!validated.dueDate) {
      validated.dueDate = new Date(
        validated.invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000
      );
      warnings.push('Due date not found, using 30 days from invoice date');
    }

    if (!validated.invoiceNumber) {
      validated.invoiceNumber = `UNKNOWN-${Date.now()}`;
      warnings.push('Invoice number not found, generated placeholder');
    }

    if (!validated.supplierName) {
      validated.supplierName = 'Unknown Supplier';
      warnings.push('Supplier name not found');
    }

    return validated;
  }

  /**
   * Validate mathematical consistency
   */
  private static validateMath(data: ExtractedInvoiceData): {
    passed: boolean;
    expectedTotal: number;
    actualTotal: number;
    difference: number;
  } {
    const expectedTotal = data.subtotalExclVAT + data.vatAmount;
    const actualTotal = data.totalAmount;
    const difference = Math.abs(expectedTotal - actualTotal);

    return {
      passed: difference <= this.MATH_TOLERANCE,
      expectedTotal,
      actualTotal,
      difference,
    };
  }

  /**
   * Calculate extraction confidence
   */
  private static calculateConfidence(data: ExtractedInvoiceData): number {
    let score = 0;
    let maxScore = 7;

    if (data.invoiceNumber && !data.invoiceNumber.startsWith('UNKNOWN'))
      score++;
    if (data.supplierName && data.supplierName !== 'Unknown Supplier') score++;
    if (data.invoiceDate) score++;
    if (data.dueDate) score++;
    if (data.subtotalExclVAT > 0) score++;
    if (data.vatAmount > 0) score++;
    if (data.totalAmount > 0) score++;

    return score / maxScore;
  }

  /**
   * Extract raw text only (for external processing)
   */
  static async extractText(filePath: string): Promise<string> {
    if (!pdfParse) {
      console.error('pdf-parse library not available');
      return '';
    }

    try {
      const buffer = await readFile(filePath);
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      return '';
    }
  }
}

export default PDFExtractor;
