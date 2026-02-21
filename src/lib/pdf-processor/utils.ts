/**
 * PDF Processor Utilities
 * Helper functions for the PDF processing module
 */

import { Readable } from "stream";
import { createWriteStream } from "fs";
import { promisify } from "util";
import { pipeline } from "stream";
import { mkdir, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { PDFDocument } from "pdf-lib";

import {
  ExtractionMethod,
  DocumentType,
  ProcessingAuditTrail,
  SystemInfo,
  EnvironmentInfo,
  SecurityInfo,
  IntegrityCheck,
  StructuredDataResult,
  ExtractionResult,
  ValidationResults,
  DetectedSection,
  DetectedForm,
  ProcessingException,
} from "./types";
import { auditLogger } from "../utils/audit-logger";
import { TEMP_DIR, OCR_ENGINES } from "./constants";

const pipelineAsync = promisify(pipeline);
const prisma = new PrismaClient();

export async function saveTempFile(
  fileBuffer: Buffer,
  fileName: string,
  processingId: string,
): Promise<string> {
  try {
    await mkdir(TEMP_DIR, { recursive: true });
    const tempFilePath = path.join(TEMP_DIR, `${processingId}_${fileName}`);
    await pipelineAsync(
      Readable.from(fileBuffer),
      createWriteStream(tempFilePath),
    );
    return tempFilePath;
  } catch (error) {
    throw new ProcessingException(
      "FILE_SAVE_FAILED",
      error instanceof Error ? error.message : "Failed to save temporary file",
      processingId,
    );
  }
}

export async function cleanupTempFiles(
  tempFilePath: string,
  processingId: string,
): Promise<void> {
  try {
    await unlink(tempFilePath);
  } catch (error) {
    await auditLogger.log(
      "TEMP_FILE_CLEANUP_FAILED",
      "invoice",
      processingId,
      "WARNING",
      {
        processingId,
        tempFilePath,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }
}

export async function readFile(filePath: string): Promise<Buffer> {
  const fs = await import("fs");
  const util = await import("util");
  const readFileAsync = util.promisify(fs.readFile);
  return readFileAsync(filePath);
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\x00-\x7F]/g, "")
    .trim();
}

export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
    .trim();
}

export function detectLanguage(text: string): string {
  const lowerText = text.toLowerCase();

  if (
    lowerText.includes("the ") ||
    lowerText.includes("and ") ||
    lowerText.includes("invoice")
  ) {
    return "en";
  }

  if (
    lowerText.includes("die ") ||
    lowerText.includes("und ") ||
    lowerText.includes("rechnung")
  ) {
    return "de";
  }

  if (
    lowerText.includes("le ") ||
    lowerText.includes("et ") ||
    lowerText.includes("facture")
  ) {
    return "fr";
  }

  return "en";
}

export function detectDocumentType(text: string): DocumentType {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("tax invoice") || lowerText.includes("vat invoice")) {
    return DocumentType.TAX_INVOICE;
  }

  if (lowerText.includes("credit note") || lowerText.includes("credit memo")) {
    return DocumentType.CREDIT_NOTE;
  }

  if (lowerText.includes("debit note") || lowerText.includes("debit memo")) {
    return DocumentType.DEBIT_NOTE;
  }

  if (lowerText.includes("proforma") || lowerText.includes("pro forma")) {
    return DocumentType.PROFORMA_INVOICE;
  }

  if (lowerText.includes("quote") || lowerText.includes("quotation")) {
    return DocumentType.QUOTE;
  }

  return DocumentType.STANDARD_INVOICE;
}

export function detectDocumentSubType(
  text: string,
  documentType: DocumentType,
): string | undefined {
  return undefined;
}

export function categorizeDocument(documentType: DocumentType): string {
  switch (documentType) {
    case DocumentType.TAX_INVOICE:
    case DocumentType.STANDARD_INVOICE:
    case DocumentType.PROFORMA_INVOICE:
      return "invoice";
    case DocumentType.CREDIT_NOTE:
    case DocumentType.DEBIT_NOTE:
      return "credit_debit";
    case DocumentType.QUOTE:
      return "quote";
    default:
      return "other";
  }
}

export function detectDocumentCountry(text: string): string {
  if (text.toLowerCase().includes("south africa") || text.includes("ZA")) {
    return "ZA";
  }
  return "ZA";
}

export function detectDocumentCurrency(text: string): string {
  if (text.includes("R ") || text.includes("ZAR")) {
    return "ZAR";
  }
  return "ZAR";
}

export function generateRandomString(length: number): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

export function createAuditEntry(
  eventType: string,
  processingId: string,
  metadata?: Record<string, any>,
): ProcessingAuditTrail {
  return {
    auditId: `audit_${Date.now()}_${generateRandomString(8)}`,
    timestamp: new Date(),
    eventType,
    eventDescription: eventType.replace(/_/g, " ").toLowerCase(),
    userId: "system",
    ipAddress: "127.0.0.1",
    userAgent: "CreditorFlow PDF Processor/4.3.2",
    metadata: metadata || {},
  };
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const os = await import("os");
  const totalmem = os.totalmem();
  const freemem = os.freemem();

  return {
    os: process.platform,
    osVersion: process.version,
    architecture: process.arch,
    processor: os.cpus()[0]?.model || "unknown",
    cores: os.cpus().length,
    memoryTotal: totalmem,
    memoryUsed: totalmem - freemem,
    diskTotal: 0,
    diskUsed: 0,
  };
}

export function getEnvironmentInfo(): EnvironmentInfo {
  return {
    environment: (process.env.NODE_ENV || "development") as
      | "DEVELOPMENT"
      | "STAGING"
      | "PRODUCTION",
    region: process.env.REGION || "za-central-1",
    instanceId: process.env.INSTANCE_ID || "local",
    deploymentId: process.env.DEPLOYMENT_ID || "dev",
    version: "4.3.2",
    buildNumber: process.env.BUILD_NUMBER || "local",
    buildDate: new Date(),
  };
}

export function getSecurityInfo(): SecurityInfo {
  return {
    encryptionAlgorithm: "AES-256-GCM",
    encryptionKeyLength: 256,
    hashingAlgorithm: "SHA-256",
    digitalSignature: undefined,
    certificateInfo: undefined,
  };
}

export async function generateIntegrityCheck(
  fileBuffer: Buffer,
  structuredData: StructuredDataResult,
  processingId: string,
): Promise<IntegrityCheck> {
  const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const dataString = JSON.stringify(structuredData);
  const hash = crypto.createHash("sha256").update(dataString).digest("hex");

  return {
    checksum,
    hash,
    digitalSignature: undefined,
    verified: true,
    verifiedAt: new Date(),
    verifier: "system",
  };
}

export async function persistProcessingResults(
  processingId: string,
  structuredData: StructuredDataResult,
  extractionResult: ExtractionResult,
  validationResults: ValidationResults,
  processingOptions?: {
    batchId?: string;
    correlationId?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    customData?: Record<string, any>;
  },
): Promise<void> {
  try {
    await prisma.pdfProcessingLog.create({
      data: {
        processingId,
        batchId: processingOptions?.batchId,
        correlationId: processingOptions?.correlationId,
        fileName: processingOptions?.fileName || "unknown.pdf",
        fileSize: processingOptions?.fileSize || 0,
        mimeType: processingOptions?.mimeType || "application/pdf",
        extractionMethod: extractionResult.engine,
        extractionConfidence: extractionResult.textMetrics.extractionConfidence,
        validationScore: validationResults.documentValidation.score || 0,
        qualityScore: 0,
        processingDurationMs: 0,
        status: "COMPLETED",
        structuredData: structuredData as any,
        extractionResult: extractionResult as any,
        validationResults: validationResults as any,
        metadata: processingOptions?.customData || {},
      },
    });
  } catch (error) {
    await auditLogger.log(
      "PERSISTENCE_FAILED",
      "invoice",
      processingId,
      "WARNING",
      {
        processingId,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }
}

export function getFallbackExtractionMethod(
  currentMethod: ExtractionMethod,
): ExtractionMethod | null {
  switch (currentMethod) {
    case "ocr-azure":
      return "ocr-google";
    case "ocr-google":
      return "ocr-amazon";
    case "ocr-amazon":
      return "ocr-tesseract";
    case "ocr-tesseract":
      return "native-pdf";
    default:
      return null;
  }
}

export function calculateCompletenessScore(
  extractionResult: ExtractionResult,
  validationResults: ValidationResults,
): number {
  let score = 0;
  let maxScore = 0;

  maxScore += 25;
  if (extractionResult.textMetrics.totalCharacters > 100) score += 25;
  else if (extractionResult.textMetrics.totalCharacters > 50) score += 15;
  else if (extractionResult.textMetrics.totalCharacters > 10) score += 5;

  maxScore += 25;
  if (extractionResult.tableMetrics.totalTables > 0) score += 25;
  else if (extractionResult.tableMetrics.totalRows > 0) score += 15;

  maxScore += 25;
  if (extractionResult.fields.length > 10) score += 25;
  else if (extractionResult.fields.length > 5) score += 15;
  else if (extractionResult.fields.length > 0) score += 5;

  maxScore += 25;
  if (validationResults.documentValidation.isValid) score += 25;
  else if (validationResults.documentValidation.warnings.length === 0)
    score += 15;

  return (score / maxScore) * 100;
}

export function extractKeyValuePairs(text: string): Record<string, any> {
  const pairs: Record<string, any> = {};

  const lines = text.split("\n");
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, "_");
      const value = match[2].trim();
      pairs[key] = value;
    }
  }

  return pairs;
}

export function detectSections(
  text: string,
  processingId: string,
): DetectedSection[] {
  return [];
}

export function detectForms(
  text: string,
  processingId: string,
): DetectedForm[] {
  return [];
}

export async function detectAndExtractTables(
  filePath: string,
  processingId: string,
): Promise<any[]> {
  return [];
}

export function extractFieldsWithPatterns(
  text: string,
  processingId: string,
): any[] {
  const fields: any[] = [];

  const fieldPatterns: Record<string, RegExp> = {
    invoiceNumber: /(?:invoice\s*(?:#|number)?|inv\.?)[:\s]*([A-Z0-9\-\/]+)/i,
    invoiceDate:
      /(?:invoice\s+date|date)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    dueDate:
      /(?:due\s+date|payment\s+due)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    supplierName: /(?:supplier|vendor|from)[:\s]*([A-Z][a-z\s\.\,\&\-]{5,50})/i,
    totalAmount:
      /(?:total\s+amount|amount\s+due)[:\s]*R?\s*([\d,]+\.?\d{0,2})/i,
  };

  Object.entries(fieldPatterns).forEach(([fieldName, pattern]) => {
    const match = text.match(pattern);
    if (match && match[1]) {
      fields.push({
        fieldId: `field_${fieldName}_${Date.now()}_${generateRandomString(6)}`,
        fieldName,
        fieldValue: match[1].trim(),
        confidence: 0.85,
        boundingBox: undefined,
        pageNumber: 1,
        metadata: {},
      });
    }
  });

  return fields;
}

export async function checkForTextContent(
  pdfDoc: PDFDocument,
): Promise<boolean> {
  try {
    const pages = pdfDoc.getPages();
    if (pages.length === 0) return false;
    return false;
  } catch {
    return false;
  }
}

export async function checkForImages(pdfDoc: PDFDocument): Promise<boolean> {
  return false;
}

export async function detectTables(pdfDoc: PDFDocument): Promise<boolean> {
  return false;
}
