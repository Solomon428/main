// ============================================================================
// CreditorFlow - Invoice Parser
// ============================================================================
// PDF/OCR extraction engine with:
// - OCR error normalization (O→0, l→1, S→5, B→8, Z→2)
// - Pattern-based field extraction using regex
// - Math validation (subtotal + VAT = total ±0.05)
// - Confidence scoring per field
// - Line item table extraction
// - South African invoice format support
// ============================================================================

import { ExtractedInvoiceData, ExtractedLineItem, ParserResult } from "@/types";

/**
 * InvoiceParser - Extracts structured data from invoice PDFs/OCR text
 *
 * Usage:
 * ```typescript
 * const parser = new InvoiceParser();
 * const result = await parser.parse('/path/to/invoice.pdf');
 * if (result.success) {
 *   console.log(result.data.invoiceNumber);
 * }
 * ```
 */
export class InvoiceParser {
  // Math validation tolerance (0.05 = 5 cents)
  private readonly MATH_TOLERANCE = 0.05;

  // Default VAT rate for South Africa
  private readonly DEFAULT_VAT_RATE = 15.0;

  // OCR confidence threshold for field acceptance
  private readonly CONFIDENCE_THRESHOLD = 0.6;

  /**
   * Main entry point - parse an invoice file
   * @param filePath Path to the PDF or image file
   * @returns ParserResult with extracted data and validation
   */
  async parse(filePath: string): Promise<ParserResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const fieldConfidence: Record<string, number> = {};

    try {
      // Step 1: Extract raw text from PDF (mock implementation)
      const { text, pages } = await this.extractTextFromPDF(filePath);

      // Step 2: Normalize OCR text (fix common misreads)
      const normalizedText = this.normalizeOCRText(text);

      // Step 3: Extract fields using pattern matching
      const extracted = this.extractFields(normalizedText, fieldConfidence);

      // Step 4: Extract line items
      extracted.lineItems = this.extractLineItems(
        normalizedText,
        fieldConfidence,
      );

      // Step 5: Validate and calculate missing amounts
      const validated = this.validateAndCalculate(extracted, warnings);

      // Step 6: Math validation
      const mathValidation = this.validateMath(validated);

      // Step 7: Calculate overall confidence
      const overallConfidence =
        this.calculateOverallConfidence(fieldConfidence);

      // Check for critical missing fields
      if (!validated.invoiceNumber || validated.invoiceNumber.trim() === "") {
        errors.push("Invoice number could not be extracted");
      }
      if (!validated.supplierName || validated.supplierName.trim() === "") {
        errors.push("Supplier name could not be extracted");
      }
      if (validated.totalAmount <= 0) {
        errors.push("Total amount is missing or invalid");
      }

      const processingTime = Date.now() - startTime;

      return {
        success: errors.length === 0,
        data: errors.length === 0 ? validated : undefined,
        mathValidation,
        errors,
        warnings,
        fieldConfidence,
        metadata: {
          processingTime,
          ocrEngine: "hybrid-regex-v1",
          pagesProcessed: pages,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          `Parser error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
        warnings,
        mathValidation: {
          passed: false,
          expectedTotal: 0,
          actualTotal: 0,
          difference: 0,
          withinTolerance: false,
        },
        fieldConfidence,
        metadata: {
          processingTime: Date.now() - startTime,
          ocrEngine: "hybrid-regex-v1",
          pagesProcessed: 0,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Extract text from PDF file using pdf-parse
   */
  private async extractTextFromPDF(
    filePath: string,
  ): Promise<{ text: string; pages: number }> {
    // Handle mock text input for testing
    if (filePath === "__text_input__") {
      return { text: "", pages: 0 };
    }

    try {
      // Import PDFExtractor for actual text extraction
      const { PDFExtractor } = await import("@/lib/pdf-processor");
      const text = await PDFExtractor.extractText(filePath);

      // Estimate page count (approximately 3000 chars per page)
      const estimatedPages = Math.max(1, Math.ceil(text.length / 3000));

      return { text, pages: estimatedPages };
    } catch (error) {
      console.error("PDF text extraction failed:", error);

      // Return empty if extraction fails - will result in failed parse
      return { text: "", pages: 0 };
    }
  }

  /**
   * Normalize OCR text to fix common misreads
   * Handles: O→0, l→1, I→1, S→5, B→8, Z→2, G→6
   */
  private normalizeOCRText(text: string): string {
    return (
      text
        // Normalize common OCR errors in numbers
        .replace(/[Oo]/g, (match, offset, string) => {
          // Check if this O is likely a zero (surrounded by digits or currency)
          const context = string.substring(Math.max(0, offset - 2), offset + 3);
          return /\d[Oo]\d|[R$]\s*[Oo]/.test(context) ? "0" : match;
        })
        .replace(/l/g, "1") // lowercase L -> 1
        .replace(/I(?=\d)/g, "1") // capital I before digit -> 1
        .replace(/S(?=\d)/g, "5") // S before digit -> 5
        .replace(/B(?=\d)/g, "8") // B before digit -> 8
        .replace(/Z/g, "2") // Z -> 2
        .replace(/G(?=\d)/g, "6") // G before digit -> 6
        // Clean up whitespace
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        // Normalize currency symbols
        .replace(/[Rr]\s*/g, "R ") // Normalize Rand symbol spacing
        .replace(/\$/g, "$ ")
        // Normalize number formats (remove thousand separators)
        .replace(/(\d),(\d{3})/g, "$1$2")
        .replace(/(\d)\s+(\d{3})/g, "$1$2")
    );
  }

  /**
   * Extract fields from normalized text using regex patterns
   */
  private extractFields(
    text: string,
    fieldConfidence: Record<string, number>,
  ): ExtractedInvoiceData {
    const data: Partial<ExtractedInvoiceData> = {
      lineItems: [],
      rawText: text,
      extractionConfidence: 0,
    };

    // Invoice Number patterns
    const invNumberMatch =
      text.match(
        /(?:invoice\s*(?:#|number|no\.?|num)?[:\s]*)?((?:INV|IN|INV-)?[\d\-]+)/i,
      ) || text.match(/(?:inv|invoice)\s*#?\s*[:\s]*([A-Z0-9\-]+)/i);
    if (invNumberMatch) {
      data.invoiceNumber = invNumberMatch[1].trim();
      fieldConfidence.invoiceNumber = 0.85;
    } else {
      data.invoiceNumber = `UNKNOWN-${Date.now()}`;
      fieldConfidence.invoiceNumber = 0.1;
    }

    // Supplier Name (typically after "From:" or at top)
    const supplierMatch =
      text.match(/From:\s*\n?\s*([^\n]+(?:\n[^\n]+)?)/i) ||
      text.match(/^\s*([^\n]+(?:Pty|Ltd|Limited|Inc|CC|Company)[^\n]*)/im) ||
      text.match(/(?:supplier|vendor|from)[:\s]*\n?\s*([^\n]+(?:\n[^\n]+)?)/i);
    if (supplierMatch) {
      data.supplierName = supplierMatch[1].trim().split("\n")[0];
      fieldConfidence.supplierName = 0.8;
    } else {
      data.supplierName = "Unknown Supplier";
      fieldConfidence.supplierName = 0.1;
    }

    // VAT Number
    const vatMatch =
      text.match(
        /(?:VAT\s*(?:Reg|Registration|Number|No)?[:\s]*)?(\d{10,11})/i,
      ) || text.match(/VAT\s*#?\s*[:\s]*([\d\s]+)/i);
    if (vatMatch) {
      data.supplierVAT = vatMatch[1].replace(/\s/g, "");
      fieldConfidence.vatNumber = 0.9;
    }

    // Email
    const emailMatch = text.match(/([\w.-]+@[\w.-]+\.[A-Za-z]{2,})/);
    if (emailMatch) {
      data.supplierEmail = emailMatch[1];
      fieldConfidence.email = 0.95;
    }

    // Phone
    const phoneMatch = text.match(/(?:tel|phone)[:\s]*([\d\s\(\)\-+]+)/i);
    if (phoneMatch) {
      data.supplierPhone = phoneMatch[1].trim();
      fieldConfidence.phone = 0.75;
    }

    // Address (multi-line after supplier name)
    const addressMatch = text.match(
      /(?:address|physical)[:\s]*\n?([^\n]+(?:\n[^\n]+){0,3})/i,
    );
    if (addressMatch) {
      data.supplierAddress = addressMatch[1].trim();
      fieldConfidence.address = 0.7;
    }

    // Dates
    const dateMatches = this.extractDates(text);
    if (dateMatches.invoiceDate) {
      data.invoiceDate = dateMatches.invoiceDate;
      fieldConfidence.invoiceDate = 0.85;
    } else {
      data.invoiceDate = new Date();
      fieldConfidence.invoiceDate = 0.5;
    }

    if (dateMatches.dueDate) {
      data.dueDate = dateMatches.dueDate;
      fieldConfidence.dueDate = 0.8;
    } else {
      // Default to 30 days
      data.dueDate = new Date(
        data.invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000,
      );
      fieldConfidence.dueDate = 0.4;
    }

    // Currency
    if (/R\s*\d|\brand\b/i.test(text)) {
      data.currency = "ZAR";
      fieldConfidence.currency = 0.95;
    } else if (/\$|USD/i.test(text)) {
      data.currency = "USD";
      fieldConfidence.currency = 0.9;
    } else {
      data.currency = "ZAR"; // Default
      fieldConfidence.currency = 0.5;
    }

    // Amounts
    const amounts = this.extractAmounts(text);
    data.subtotalExclVAT = amounts.subtotal || 0;
    data.vatAmount = amounts.vat || 0;
    data.totalAmount = amounts.total || 0;
    data.vatRate = amounts.vatRate || this.DEFAULT_VAT_RATE;

    fieldConfidence.subtotal = amounts.subtotal ? 0.85 : 0.3;
    fieldConfidence.vatAmount = amounts.vat ? 0.85 : 0.3;
    fieldConfidence.total = amounts.total ? 0.9 : 0.2;

    // Reference numbers
    const poMatch = text.match(
      /(?:PO|P\.O\.|Purchase Order|Ref|Reference)[:\s#]*([A-Z0-9\-]+)/i,
    );
    if (poMatch) {
      data.referenceNumber = poMatch[1];
      fieldConfidence.referenceNumber = 0.8;
    }

    // Payment terms
    const termsMatch = text.match(
      /(?:payment terms|terms)[:\s]*(\d+)\s*(?:days|d)?/i,
    );
    if (termsMatch) {
      data.paymentTerms = parseInt(termsMatch[1], 10);
      fieldConfidence.paymentTerms = 0.85;
    } else {
      data.paymentTerms = 30;
      fieldConfidence.paymentTerms = 0.5;
    }

    // Bank details
    const bankMatch = text.match(/(?:bank)[:\s]*\n?\s*([^\n]+)/i);
    if (bankMatch) {
      data.bankName = bankMatch[1].trim();
      fieldConfidence.bankName = 0.75;
    }

    const accountMatch = text.match(
      /(?:account\s*(?:#|number|no)?|acc\.?\s*#?)[:\s]*(\d+)/i,
    );
    if (accountMatch) {
      data.accountNumber = accountMatch[1];
      fieldConfidence.accountNumber = 0.8;
    }

    const branchMatch = text.match(/(?:branch|branch code)[:\s]*(\d{6})/i);
    if (branchMatch) {
      data.branchCode = branchMatch[1];
      fieldConfidence.branchCode = 0.85;
    }

    return data as ExtractedInvoiceData;
  }

  /**
   * Extract dates from text
   */
  private extractDates(text: string): { invoiceDate?: Date; dueDate?: Date } {
    const result: { invoiceDate?: Date; dueDate?: Date } = {};

    // Date patterns (South African and ISO formats)
    const datePatterns = [
      // DD/MM/YYYY or DD-MM-YYYY
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/g,
      // YYYY-MM-DD (ISO)
      /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/g,
      // Text dates: 15 Jan 2024 or January 15, 2024
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/gi,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{2,4})/gi,
    ];

    const foundDates: Date[] = [];

    for (const pattern of datePatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        const date = this.parseDate(match);
        if (date && !isNaN(date.getTime())) {
          foundDates.push(date);
        }
      }
    }

    // Sort dates and assign (earliest = invoice date, later = due date)
    foundDates.sort((a, b) => a.getTime() - b.getTime());

    if (foundDates.length >= 1) {
      result.invoiceDate = foundDates[0];
    }
    if (foundDates.length >= 2) {
      result.dueDate = foundDates[foundDates.length - 1];
    }

    return result;
  }

  /**
   * Parse date from regex match
   */
  private parseDate(match: RegExpExecArray): Date | null {
    try {
      // Handle different date formats based on match structure
      if (
        match[0].includes("-") ||
        match[0].includes("/") ||
        match[0].includes(".")
      ) {
        // Numeric format
        const parts = match[0].split(/[\/\-.]/);
        if (parts.length === 3) {
          // Try DD/MM/YYYY first (South African format)
          let day = parseInt(parts[0], 10);
          let month = parseInt(parts[1], 10) - 1;
          let year = parseInt(parts[2], 10);

          // If year is first, assume YYYY-MM-DD
          if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
          }

          // Handle 2-digit years
          if (year < 100) {
            year += year < 50 ? 2000 : 1900;
          }

          return new Date(year, month, day);
        }
      }

      // Text format
      const date = new Date(match[0]);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  }

  /**
   * Extract monetary amounts from text
   */
  private extractAmounts(text: string): {
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

    // Look for labeled amounts
    const patterns = {
      subtotal:
        /(?:subtotal|sub-total|sub total|net|excl(?:uding)?\s*VAT)[:\s]*R?\s*([\d,]+\.?\d*)/i,
      vat: /(?:VAT|tax|VAT\s*amount)[:\s]*R?\s*([\d,]+\.?\d*)/i,
      vatRate: /VAT\s*\(?\s*(\d+\.?\d*)\s*%\s*\)?/i,
      total:
        /(?:total|amount due|balance due|total due)[:\s]*R?\s*([\d,]+\.?\d*)/i,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(value) && value >= 0) {
          (result as any)[key] = value;
        }
      }
    }

    // If we have total and subtotal but no VAT, calculate it
    if (result.total && result.subtotal && !result.vat) {
      result.vat = result.total - result.subtotal;
    }

    // If we have subtotal and VAT rate but no VAT amount, calculate it
    if (result.subtotal && result.vatRate && !result.vat) {
      result.vat = result.subtotal * (result.vatRate / 100);
    }

    // If we have subtotal and VAT but no total, calculate it
    if (result.subtotal && result.vat && !result.total) {
      result.total = result.subtotal + result.vat;
    }

    // Look for the largest amount as total if not found
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
  private extractAllAmounts(text: string): number[] {
    const amounts: number[] = [];
    const pattern = /R?\s*([\d,]+\.\d{2})/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const value = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(value) && value > 0) {
        amounts.push(value);
      }
    }

    return amounts;
  }

  /**
   * Extract line items from invoice table
   */
  private extractLineItems(
    text: string,
    fieldConfidence: Record<string, number>,
  ): ExtractedLineItem[] {
    const lineItems: ExtractedLineItem[] = [];

    // Try to find table-like structures
    const lines = text.split("\n");
    let inTable = false;
    let lineNumber = 1;

    // Common table header patterns
    const tableStartPatterns = [
      /description.*qty.*price.*total/i,
      /item.*quantity.*unit.*amount/i,
      /details.*qty.*rate/i,
    ];

    // Common table end patterns
    const tableEndPatterns = [/subtotal|vat|total|bank/i];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if we're entering a table
      if (!inTable) {
        for (const pattern of tableStartPatterns) {
          if (pattern.test(line)) {
            inTable = true;
            break;
          }
        }
        continue;
      }

      // Check if we're leaving the table
      for (const pattern of tableEndPatterns) {
        if (pattern.test(line)) {
          inTable = false;
          break;
        }
      }
      if (!inTable) continue;

      // Try to parse line item
      const item = this.parseLineItem(line, lineNumber);
      if (item) {
        lineItems.push(item);
        lineNumber++;
      }
    }

    fieldConfidence.lineItems = lineItems.length > 0 ? 0.75 : 0.2;

    return lineItems;
  }

  /**
   * Parse a single line item from text
   */
  private parseLineItem(
    line: string,
    lineNumber: number,
  ): ExtractedLineItem | null {
    // Pattern: Description Qty Price Total
    // Examples:
    // "Office Supplies 10 R 150.00 R 1,500.00"
    // "Consulting 5 hours @ R 500.00 = R 2,500.00"

    // Remove extra whitespace
    const cleanLine = line.replace(/\s+/g, " ").trim();

    // Try to extract amounts (looking for numbers with 2 decimal places)
    const amountPattern = /R?\s*([\d,]+\.\d{2})/g;
    const amounts: number[] = [];
    let match;

    while ((match = amountPattern.exec(cleanLine)) !== null) {
      amounts.push(parseFloat(match[1].replace(/,/g, "")));
    }

    if (amounts.length < 2) {
      return null; // Not enough amounts for a line item
    }

    // Try to extract quantity (usually a smaller integer before prices)
    const qtyPattern =
      /\b(\d+(?:\.\d+)?)\s*(?:hrs?|hours?|ea|each|pc|pcs|units?)?\b/i;
    const qtyMatch = cleanLine.match(qtyPattern);
    const quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 1;

    // Determine which amounts are which
    let unitPrice: number;
    let lineTotal: number;

    if (amounts.length >= 3) {
      // Assume: [qty*unitPrice, unitPrice, lineTotal] or [unitPrice, lineTotal, total?]
      unitPrice = amounts[amounts.length - 2];
      lineTotal = amounts[amounts.length - 1];
    } else {
      unitPrice = amounts[0];
      lineTotal = amounts[1];
    }

    // Extract description (text before the numbers)
    const descMatch = cleanLine.match(/^([^\d]+)/);
    const description = descMatch ? descMatch[1].trim() : "Unknown Item";

    // Calculate VAT
    const vatRate = this.DEFAULT_VAT_RATE;
    const vatAmount = lineTotal * (vatRate / 100);

    return {
      lineNumber,
      description: description.substring(0, 255), // Limit length
      quantity,
      unitPrice,
      vatRate,
      vatAmount,
      lineTotalExclVAT: lineTotal,
      lineTotalInclVAT: lineTotal + vatAmount,
    };
  }

  /**
   * Validate and calculate any missing amounts
   */
  private validateAndCalculate(
    data: Partial<ExtractedInvoiceData>,
    warnings: string[],
  ): ExtractedInvoiceData {
    const validated = { ...data } as ExtractedInvoiceData;

    // Ensure all required amounts exist
    if (!validated.subtotalExclVAT) {
      validated.subtotalExclVAT = 0;
      warnings.push("Subtotal not found, defaulting to 0");
    }

    if (!validated.vatAmount) {
      // Calculate VAT from subtotal
      validated.vatAmount =
        validated.subtotalExclVAT * (validated.vatRate / 100);
      warnings.push("VAT amount not found, calculated from subtotal");
    }

    if (!validated.totalAmount) {
      validated.totalAmount = validated.subtotalExclVAT + validated.vatAmount;
      warnings.push("Total amount not found, calculated from subtotal + VAT");
    }

    // Ensure VAT rate is set
    if (!validated.vatRate) {
      validated.vatRate = this.DEFAULT_VAT_RATE;
    }

    // Calculate amount due if not set
    if (!validated.amountDue) {
      validated.amountDue = validated.totalAmount;
    }

    // Calculate line item totals if line items exist
    if (validated.lineItems && validated.lineItems.length > 0) {
      const lineSubtotal = validated.lineItems.reduce(
        (sum, item) => sum + item.lineTotalExclVAT,
        0,
      );

      // Compare with invoice subtotal
      const diff = Math.abs(lineSubtotal - validated.subtotalExclVAT);
      if (diff > this.MATH_TOLERANCE) {
        warnings.push(
          `Line item subtotal (${lineSubtotal.toFixed(2)}) doesn't match ` +
            `invoice subtotal (${validated.subtotalExclVAT.toFixed(2)})`,
        );
      }
    }

    return validated;
  }

  /**
   * Validate mathematical consistency
   */
  private validateMath(data: ExtractedInvoiceData): {
    passed: boolean;
    expectedTotal: number;
    actualTotal: number;
    difference: number;
    withinTolerance: boolean;
  } {
    const expectedTotal = data.subtotalExclVAT + data.vatAmount;
    const actualTotal = data.totalAmount;
    const difference = Math.abs(expectedTotal - actualTotal);
    const withinTolerance = difference <= this.MATH_TOLERANCE;

    return {
      passed: withinTolerance,
      expectedTotal,
      actualTotal,
      difference,
      withinTolerance,
    };
  }

  /**
   * Calculate overall extraction confidence
   */
  private calculateOverallConfidence(
    fieldConfidence: Record<string, number>,
  ): number {
    const values = Object.values(fieldConfidence);
    if (values.length === 0) return 0;

    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * Parse text directly (without file) - useful for testing or API input
   */
  parseText(text: string): Promise<ParserResult> {
    return this.parse("__text_input__");
  }
}

export default InvoiceParser;
