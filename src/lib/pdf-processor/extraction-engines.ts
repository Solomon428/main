/**
 * PDF Processor OCR Extraction Engines
 * OCR-based extraction implementations
 */

import {
  ExtractionResult,
  PDFProcessingOptions,
  ProcessingException,
} from "./types";

export async function extractWithTesseractOCR(
  filePath: string,
  processingId: string,
  processingOptions?: PDFProcessingOptions,
): Promise<ExtractionResult> {
  throw new ProcessingException(
    "OCR_NOT_IMPLEMENTED",
    "Tesseract OCR integration not yet implemented",
    processingId,
  );
}

export async function extractWithAzureOCR(
  filePath: string,
  processingId: string,
  processingOptions?: PDFProcessingOptions,
): Promise<ExtractionResult> {
  throw new ProcessingException(
    "OCR_NOT_IMPLEMENTED",
    "Azure OCR integration not yet implemented",
    processingId,
  );
}

export async function extractWithGoogleOCR(
  filePath: string,
  processingId: string,
  processingOptions?: PDFProcessingOptions,
): Promise<ExtractionResult> {
  throw new ProcessingException(
    "OCR_NOT_IMPLEMENTED",
    "Google OCR integration not yet implemented",
    processingId,
  );
}

export async function extractWithAmazonOCR(
  filePath: string,
  processingId: string,
  processingOptions?: PDFProcessingOptions,
): Promise<ExtractionResult> {
  throw new ProcessingException(
    "OCR_NOT_IMPLEMENTED",
    "Amazon OCR integration not yet implemented",
    processingId,
  );
}

export async function extractWithOllamaOCR(
  filePath: string,
  processingId: string,
  processingOptions?: PDFProcessingOptions,
): Promise<ExtractionResult> {
  throw new ProcessingException(
    "OCR_NOT_IMPLEMENTED",
    "Ollama OCR integration not yet implemented",
    processingId,
  );
}
