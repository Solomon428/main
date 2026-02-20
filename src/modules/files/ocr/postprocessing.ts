import type { OcrValidationResult } from "./types";
import { INVOICE_PATTERNS, QUALITY_THRESHOLDS } from "./constants";

export class TextPostprocessor {
  /**
   * Cleans up extracted text by removing artifacts and normalizing whitespace
   */
  static cleanupText(text: string): string {
    return (
      text
        // Remove excessive whitespace
        .replace(/\s+/g, " ")
        // Remove non-printable characters
        .replace(/[^\x20-\x7E\n\r\t\u00A0-\u00FF]/g, "")
        // Normalize line breaks
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        // Remove lines that are just special characters
        .replace(/^[\W_]+$/gm, "")
        // Trim whitespace from lines
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("\n")
        .trim()
    );
  }

  /**
   * Normalizes extracted text for consistency
   */
  static normalizeText(text: string): string {
    return (
      text
        // Normalize currency symbols
        .replace(/[€]/g, "EUR ")
        .replace(/[£]/g, "GBP ")
        .replace(/[¥]/g, "JPY ")
        // Normalize dashes
        .replace(/[–—]/g, "-")
        // Normalize quotes
        .replace(/[""''']/g, "'")
        // Normalize decimal separators (keep dots)
        .replace(/(\d),(\d{3})/g, "$1$2")
        // Normalize whitespace around punctuation
        .replace(/\s*([.,;:])\s*/g, "$1 ")
        .trim()
    );
  }

  /**
   * Validates the quality of extracted text
   */
  static validateExtractionQuality(
    extractedText: string,
    expectedPatterns: RegExp[] = [],
  ): OcrValidationResult {
    const characterCount = extractedText.length;
    const words = extractedText.split(/\s+/).filter((word) => word.length > 0);
    const wordCount = words.length;
    const lines = extractedText
      .split("\n")
      .filter((line) => line.trim().length > 0);
    const lineCount = lines.length;
    const averageWordLength =
      wordCount > 0
        ? words.reduce((sum: number, word: string) => sum + word.length, 0) /
          wordCount
        : 0;

    const nonAlphaNumericChars = extractedText.replace(
      /[a-zA-Z0-9\s]/g,
      "",
    ).length;
    const nonAlphaNumericRatio =
      characterCount > 0 ? nonAlphaNumericChars / characterCount : 0;

    const matches = expectedPatterns.map((pattern) => {
      const match = extractedText.match(pattern);
      return {
        pattern: pattern.toString(),
        found: !!match,
        match: match?.[0] || undefined,
      };
    });

    let score = 0;

    if (characterCount > 0) score += 10;
    if (wordCount >= QUALITY_THRESHOLDS.MIN_WORD_COUNT) score += 10;
    if (lineCount >= QUALITY_THRESHOLDS.MIN_LINE_COUNT) score += 10;

    const patternMatchScore =
      expectedPatterns.length > 0
        ? (matches.filter((m) => m.found).length / expectedPatterns.length) * 30
        : 30;
    score += patternMatchScore;

    if (nonAlphaNumericRatio < QUALITY_THRESHOLDS.MAX_NON_ALPHANUMERIC_RATIO)
      score += 20;
    if (
      averageWordLength >= QUALITY_THRESHOLDS.IDEAL_WORD_LENGTH_MIN &&
      averageWordLength <= QUALITY_THRESHOLDS.IDEAL_WORD_LENGTH_MAX
    )
      score += 20;

    score = Math.min(100, Math.max(0, score));

    const suggestions: string[] = [];
    if (characterCount === 0) {
      suggestions.push(
        "No text extracted - check document quality or OCR settings",
      );
    }
    if (wordCount < QUALITY_THRESHOLDS.MIN_WORD_COUNT) {
      suggestions.push(
        "Very little text extracted - document may be blank or poor quality",
      );
    }
    if (nonAlphaNumericRatio > 0.5) {
      suggestions.push(
        "High proportion of non-alphanumeric characters - OCR may be producing garbage",
      );
    }
    if (averageWordLength < 2) {
      suggestions.push(
        "Average word length very short - possible character segmentation issues",
      );
    }

    const foundPatterns = matches.filter((m) => m.found).length;
    if (expectedPatterns.length > 0 && foundPatterns === 0) {
      suggestions.push(
        "No expected invoice patterns found - document may not be an invoice",
      );
    }

    return {
      isValid: score >= QUALITY_THRESHOLDS.VALIDATION_SCORE_MIN,
      score,
      matches,
      statistics: {
        characterCount,
        wordCount,
        lineCount,
        averageWordLength,
        nonAlphaNumericRatio,
      },
      suggestions,
    };
  }

  /**
   * Validates extraction with default invoice patterns
   */
  static validateInvoiceExtraction(extractedText: string): OcrValidationResult {
    return this.validateExtractionQuality(extractedText, [
      INVOICE_PATTERNS.INVOICE_KEYWORD,
      INVOICE_PATTERNS.TOTAL_AMOUNT,
      INVOICE_PATTERNS.DATE_PATTERN,
    ]);
  }

  /**
   * Post-processes text with all cleanup and normalization
   */
  static postprocess(text: string): string {
    let processed = this.cleanupText(text);
    processed = this.normalizeText(processed);
    return processed;
  }
}

export default TextPostprocessor;
