// ============================================================================
// CreditorFlow - Enhanced PDF Extractor with AI/OCR
// ============================================================================
// Multi-strategy extraction with:
// 1. Text-based PDF extraction (pdf-parse)
// 2. LLM-powered extraction (Ollama) for complex layouts
// 3. OCR for scanned PDFs (tesseract.js)
// 4. Confidence scoring and validation
// ============================================================================

import { readFile } from 'fs/promises';
import { ExtractedInvoiceData } from '@/types';
import { PDFExtractor } from './pdf-extractor';
import { ollamaClient } from '../ollama';

// Use require for pdf-parse to avoid ES module issues
let pdfParse: any;
try {
  pdfParse = require('pdf-parse');
} catch {
  pdfParse = null;
}

// Lazy load tesseract.js
let Tesseract: any = null;

export interface EnhancedExtractionResult {
  success: boolean;
  data?: ExtractedInvoiceData;
  strategy: 'TEXT' | 'OLLAMA' | 'OCR' | 'MANUAL' | 'NONE';
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
  aiReasoning?: string;
}

export class EnhancedPDFExtractor {
  private static readonly MATH_TOLERANCE = 0.05;

  /**
   * Main extraction method - tries all strategies in order
   */
  static async extractInvoiceData(filePath: string): Promise<EnhancedExtractionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Strategy 1: Try basic text extraction
    try {
      const basicResult = await PDFExtractor.extractInvoiceData(filePath);
      if (basicResult.success && basicResult.confidence > 0.6) {
        return {
          ...basicResult,
          strategy: 'TEXT',
          processingTime: Date.now() - startTime,
        };
      }
      warnings.push(...basicResult.warnings);
    } catch (error) {
      errors.push(`Text extraction failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Strategy 2: Try Ollama LLM extraction if available
    const ollamaAvailable = await ollamaClient.isAvailable();
    if (ollamaAvailable) {
      try {
        const ollamaResult = await this.extractWithOllama(filePath);
        if (ollamaResult.success && ollamaResult.confidence > 0.5) {
          return {
            ...ollamaResult,
            strategy: 'OLLAMA',
            processingTime: Date.now() - startTime,
          };
        }
        warnings.push(...ollamaResult.warnings);
      } catch (error) {
        errors.push(`Ollama extraction failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // Strategy 3: Try OCR for scanned PDFs
    try {
      const ocrResult = await this.extractWithOCR(filePath);
      if (ocrResult.success && ocrResult.confidence > 0.4) {
        return {
          ...ocrResult,
          strategy: 'OCR',
          processingTime: Date.now() - startTime,
        };
      }
      warnings.push(...ocrResult.warnings);
    } catch (error) {
      errors.push(`OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Strategy 4: Return manual entry fallback
    return {
      success: false,
      strategy: 'NONE',
      errors: [...errors, 'All extraction strategies failed. Manual entry required.'],
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

  /**
   * Extract using Ollama LLM
   */
  private static async extractWithOllama(filePath: string): Promise<EnhancedExtractionResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Extract raw text from PDF
      let rawText = '';
      if (pdfParse) {
        const buffer = await readFile(filePath);
        const pdfData = await pdfParse(buffer);
        rawText = pdfData.text || '';
      }

      if (!rawText || rawText.trim().length < 50) {
        return {
          success: false,
          strategy: 'OLLAMA',
          errors: ['PDF contains insufficient text'],
          warnings: ['May be a scanned PDF requiring OCR'],
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

      // Use Ollama to extract structured data
      const extractedData = await ollamaClient.extractInvoiceData(rawText);

      // Validate the extracted data
      const validated = this.validateExtractedData(extractedData, warnings);
      const mathValidation = this.validateMath(validated);
      
      // Calculate confidence based on field completeness
      const confidence = this.calculateConfidence(validated);

      return {
        success: confidence > 0.5,
        data: validated,
        strategy: 'OLLAMA',
        errors: confidence <= 0.5 ? ['Low extraction confidence'] : [],
        warnings,
        confidence,
        processingTime: Date.now() - startTime,
        mathValidation,
        aiReasoning: 'Extracted using LLM-powered analysis',
      };
    } catch (error) {
      return {
        success: false,
        strategy: 'OLLAMA',
        errors: [`Ollama extraction error: ${error instanceof Error ? error.message : 'Unknown'}`],
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
   * Extract using OCR (tesseract.js)
   */
  private static async extractWithOCR(filePath: string): Promise<EnhancedExtractionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Lazy load tesseract.js
      if (!Tesseract) {
        try {
          Tesseract = await import('tesseract.js');
        } catch {
          return {
            success: false,
            strategy: 'OCR',
            errors: ['tesseract.js not installed. Run: npm install tesseract.js'],
            warnings: ['OCR unavailable'],
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

      // For PDFs, we need to convert to images first
      // This is a simplified version - in production, use pdf2pic or similar
      warnings.push('PDF to image conversion not implemented. OCR works best with image files.');

      // If it's an image file, process directly
      if (filePath.match(/\.(png|jpg|jpeg)$/i)) {
        const result = await Tesseract.recognize(filePath, 'eng', {
          logger: (m: any) => console.log(m),
        });

        const rawText = result.data.text;

        if (!rawText || rawText.trim().length < 20) {
          return {
            success: false,
            strategy: 'OCR',
            errors: ['OCR produced insufficient text'],
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

        // Try to use Ollama on OCR text for better extraction
        if (await ollamaClient.isAvailable()) {
          const extractedData = await ollamaClient.extractInvoiceData(rawText);
          const validated = this.validateExtractedData(extractedData, warnings);
          const mathValidation = this.validateMath(validated);
          const confidence = this.calculateConfidence(validated) * 0.9; // Slightly lower confidence for OCR

          return {
            success: confidence > 0.4,
            data: validated,
            strategy: 'OCR',
            errors: confidence <= 0.4 ? ['Low OCR confidence'] : [],
            warnings,
            confidence,
            processingTime: Date.now() - startTime,
            mathValidation,
          };
        }

        // Fallback to basic extraction from OCR text
        const basicResult = await PDFExtractor.extractInvoiceData('__text_input__');
        return {
          ...basicResult,
          strategy: 'OCR',
          processingTime: Date.now() - startTime,
        };
      }

      return {
        success: false,
        strategy: 'OCR',
        errors: ['OCR only supported for image files (PNG, JPG). PDF conversion not implemented.'],
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
    } catch (error) {
      return {
        success: false,
        strategy: 'OCR',
        errors: [`OCR error: ${error instanceof Error ? error.message : 'Unknown'}`],
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
   * Validate and calculate missing fields
   */
  private static validateExtractedData(
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
      validated.vatAmount = validated.subtotalExclVAT * ((validated.vatRate || 15) / 100);
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
      validated.dueDate = new Date(validated.invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
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

    if (!validated.currency) {
      validated.currency = 'ZAR';
    }

    if (!validated.lineItems) {
      validated.lineItems = [];
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
    let maxScore = 10;

    if (data.invoiceNumber && !data.invoiceNumber.startsWith('UNKNOWN')) score++;
    if (data.supplierName && data.supplierName !== 'Unknown Supplier') score++;
    if (data.invoiceDate && data.invoiceDate.getFullYear() > 2000) score++;
    if (data.dueDate && data.dueDate > data.invoiceDate) score++;
    if (data.subtotalExclVAT > 0) score++;
    if (data.vatAmount > 0) score++;
    if (data.totalAmount > 0) score++;
    if (data.supplierVAT) score++;
    if (data.lineItems && data.lineItems.length > 0) score++;
    if (data.referenceNumber) score++;

    return score / maxScore;
  }
}

export default EnhancedPDFExtractor;
