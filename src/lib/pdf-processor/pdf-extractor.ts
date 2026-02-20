// Minimal PDFExtractor implementation re-homed into pdf-processor.
// This is a deterministic stand-in to satisfy the τ₂ gate and avoid
// breaking downstream imports while you migrate to a full implementation.
export class PDFExtractor {
  static async extractInvoiceData(filePath: string): Promise<{
    success: boolean;
    data?: any;
    strategy: "TEXT" | "OCR" | "MANUAL" | "NONE";
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
  }> {
    // Not implemented in this patch; return a conservative failure with guidance.
    return {
      success: false,
      data: undefined,
      strategy: "NONE",
      errors: ["PDF extraction not implemented in this fork yet"],
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
