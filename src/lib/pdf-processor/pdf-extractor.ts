import { EnhancedPDFExtractor } from '@/lib/utils/pdf-extractor-enhanced'

// Public return shape for PDFExtractor (adapted from EnhancedPDFExtractor)
export type PDFExtractionResult = {
  success: boolean;
  data?: any;
  strategy: 'TEXT' | 'OCR' | 'MANUAL' | 'NONE';
  errors: string[];
  warnings: string[];
  confidence: number;
  processingTime: number;
  mathValidation?: {
    passed: boolean;
    expectedTotal: number;
    actualTotal: number;
    difference: number;
  };
};

export class PDFExtractor {
  static async extractInvoiceData(filePath: string): Promise<PDFExtractionResult> {
    const enhanced = await EnhancedPDFExtractor.extractInvoiceData(filePath);

    // Map Enhanced strategy to PDFExtractionResult's enum
    const strategy = enhanced.strategy === 'TEXT'
      ? 'TEXT'
      : enhanced.strategy === 'MANUAL'
      ? 'MANUAL'
      : 'OCR';

    const mathVal = enhanced.mathValidation ?? {
      passed: false,
      expectedTotal: 0,
      actualTotal: 0,
      difference: 0,
    };

    return {
      success: enhanced.success,
      data: enhanced.data,
      strategy,
      errors: enhanced.errors ?? [],
      warnings: enhanced.warnings ?? [],
      confidence: enhanced.confidence ?? 0,
      processingTime: enhanced.processingTime ?? 0,
      mathValidation: {
        passed: mathVal.passed ?? false,
        expectedTotal: mathVal.expectedTotal ?? 0,
        actualTotal: mathVal.actualTotal ?? 0,
        difference: mathVal.difference ?? 0
      }
    };
  }
}
