/**
 * PDF Processor Data Structuring
 * Data structuring and organization methods
 */

import {
  DocumentType,
  StructuredDataResult,
  ExtractionResult,
  StructuredInvoiceData,
  SemiStructuredData,
  ProcessingException,
} from "./types";
import { auditLogger } from "../utils/audit-logger";
import {
  detectDocumentType,
  detectDocumentSubType,
  categorizeDocument,
  detectDocumentCountry,
  detectDocumentCurrency,
  extractKeyValuePairs,
  detectSections,
  detectForms,
} from "./utils";
import {
  extractInvoiceNumber,
  extractInvoiceDate,
  extractSupplierVAT,
  extractTotalAmount,
  extractSubtotalExclVAT,
  extractVATAmount,
  extractSupplierName,
  extractDueDate,
  extractLineItems,
} from "./data-extractors";

export function structureExtractedData(
  extractionResult: ExtractionResult,
  processingId: string,
): StructuredDataResult {
  try {
    const cleanedText = extractionResult.cleanedText;

    const documentType = detectDocumentType(cleanedText);
    const documentSubType = detectDocumentSubType(cleanedText, documentType);
    const documentCategory = categorizeDocument(documentType);
    const documentCountry = detectDocumentCountry(cleanedText);
    const documentCurrency = detectDocumentCurrency(cleanedText);

    const invoiceNumber = extractInvoiceNumber(cleanedText);
    const invoiceDate = extractInvoiceDate(cleanedText);
    const dueDate = extractDueDate(cleanedText);
    const supplierName = extractSupplierName(cleanedText);
    const supplierVAT = extractSupplierVAT(cleanedText);
    const subtotalExclVAT = extractSubtotalExclVAT(cleanedText);
    const vatAmount = extractVATAmount(cleanedText);
    const totalAmount = extractTotalAmount(cleanedText);

    const lineItems = extractLineItems(
      extractionResult.tables,
      cleanedText,
      processingId,
    );

    const structuredData: StructuredInvoiceData = {
      invoiceNumber,
      invoiceDate,
      dueDate,
      supplierName,
      supplierVAT,
      subtotalExclVAT,
      vatAmount,
      totalAmount,
      lineItems,
      metadata: {
        extractionMethod: extractionResult.engine,
        confidence: extractionResult.textMetrics.extractionConfidence,
        processingId,
      },
    };

    const semiStructuredData: SemiStructuredData = {
      rawKeyValuePairs: extractKeyValuePairs(cleanedText),
      detectedSections: detectSections(cleanedText, processingId),
      detectedTables: extractionResult.tables.map((table) => ({
        tableId: table.tableId,
        pageNumber: 1,
        boundingBox: { x: 0, y: 0, width: 0, height: 0 },
        confidence:
          extractionResult.tableConfidences.find(
            (tc) => tc.tableId === table.tableId,
          )?.overallConfidence || 0.5,
        metadata: {},
      })),
      detectedForms: detectForms(cleanedText, processingId),
      metadata: {
        processingId,
        extractionTimestamp: new Date().toISOString(),
      },
    };

    return {
      documentType,
      documentSubType,
      documentCategory,
      documentCountry,
      documentCurrency,
      structuredData,
      semiStructuredData,
      metadata: {
        processingId,
        structuringTimestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    auditLogger.log({
      action: "DATA_STRUCTURING_FAILED" as any,
      entityType: "invoice" as any,
      entityId: processingId,
      severity: "WARNING" as any,
      metadata: {
        processingId,
        error: error instanceof Error ? error.message : String(error),
      },
    }).catch(console.error);

    return {
      documentType: DocumentType.STANDARD_INVOICE,
      documentSubType: undefined,
      documentCategory: "invoice",
      documentCountry: "ZA",
      documentCurrency: "ZAR",
      structuredData: {
        invoiceNumber: `UNKNOWN_${Date.now()}`,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 86400000),
        supplierName: "Unknown Supplier",
        supplierVAT: undefined,
        subtotalExclVAT: 0,
        vatAmount: 0,
        totalAmount: 0,
        lineItems: [],
        metadata: {},
      },
      semiStructuredData: {
        rawKeyValuePairs: {},
        detectedSections: [],
        detectedTables: [],
        detectedForms: [],
        metadata: {},
      },
      metadata: {},
    };
  }
}
