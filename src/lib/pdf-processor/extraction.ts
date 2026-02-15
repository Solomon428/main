/**
 * PDF Processor Extraction Logic
 * Document quality analysis and extraction methods
 */

import pdf from 'pdf-parse';
import { PDFDocument } from 'pdf-lib';

import {
  ExtractionMethod,
  DocumentQualityMetrics,
  TextExtractionMetrics,
  TableExtractionMetrics,
  FormExtractionMetrics,
  ImageExtractionMetrics,
  ExtractionResult,
  PDFProcessingOptions,
  ProcessingException
} from './types';
import { auditLogger } from '../audit-logger';
import {
  SUPPORTED_MIME_TYPES,
  OCR_ENGINES,
  QUALITY_THRESHOLDS
} from './constants';
import {
  readFile,
  normalizeText,
  cleanText,
  detectLanguage,
  detectAndExtractTables,
  extractFieldsWithPatterns,
  checkForTextContent,
  checkForImages,
  detectTables
} from './utils';
import {
  extractWithTesseractOCR,
  extractWithAzureOCR,
  extractWithGoogleOCR,
  extractWithAmazonOCR,
  extractWithOllamaOCR
} from './extraction-engines';

export async function analyzeDocumentQuality(
  filePath: string,
  mimeType: string,
  processingId: string
): Promise<DocumentQualityMetrics> {
  try {
    if (mimeType === 'application/pdf') {
      const pdfBytes = await readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      const pageCount = pdfDoc.getPageCount();
      const hasText = await checkForTextContent(pdfDoc);
      const hasImages = await checkForImages(pdfDoc);
      const hasTables = await detectTables(pdfDoc);
      
      return {
        clarityScore: hasText ? 0.95 : (hasImages ? 0.60 : 0.30),
        resolutionScore: 0.85,
        skewAngle: 0.0,
        rotationCorrectionApplied: false,
        noiseLevel: hasImages ? 0.15 : 0.05,
        contrastLevel: 0.85,
        brightnessLevel: 0.80,
        pageCount,
        hasText,
        hasImages,
        hasTables,
        isSearchable: hasText
      };
    }
    
    return {
      clarityScore: 0.70,
      resolutionScore: 0.75,
      skewAngle: 0.0,
      rotationCorrectionApplied: false,
      noiseLevel: 0.20,
      contrastLevel: 0.70,
      brightnessLevel: 0.75,
      pageCount: 1,
      hasText: false,
      hasImages: true,
      hasTables: false,
      isSearchable: false
    };
  } catch (error) {
    await auditLogger.log(
      'QUALITY_ANALYSIS_FAILED',
      'invoice',
      processingId,
      'WARNING',
      {
        processingId,
        error: error instanceof Error ? error.message : String(error)
      }
    );
    
    return {
      clarityScore: 0.50,
      resolutionScore: 0.50,
      skewAngle: 0.0,
      rotationCorrectionApplied: false,
      noiseLevel: 0.50,
      contrastLevel: 0.50,
      brightnessLevel: 0.50,
      pageCount: 1,
      hasText: false,
      hasImages: true,
      hasTables: false,
      isSearchable: false
    };
  }
}

export function determineExtractionMethod(
  mimeType: string,
  qualityMetrics: DocumentQualityMetrics,
  processingOptions?: PDFProcessingOptions
): ExtractionMethod {
  if (processingOptions?.extractionMethod) {
    return processingOptions.extractionMethod;
  }
  
  if (mimeType === 'application/pdf' && qualityMetrics.isSearchable && qualityMetrics.clarityScore > 0.80) {
    return 'native-pdf';
  }
  
  if (mimeType === 'application/pdf' || mimeType.startsWith('image/')) {
    const preferredEngine = processingOptions?.preferredOCREngine || OCR_ENGINES.TESSERACT;
    
    switch (preferredEngine) {
      case OCR_ENGINES.AZURE:
        return 'ocr-azure';
      case OCR_ENGINES.GOOGLE:
        return 'ocr-google';
      case OCR_ENGINES.AMAZON:
        return 'ocr-amazon';
      case OCR_ENGINES.OLLAMA:
        return 'ocr-ollama';
      default:
        return 'ocr-tesseract';
    }
  }
  
  return 'native-pdf';
}

export async function performExtraction(
  filePath: string,
  mimeType: string,
  extractionMethod: ExtractionMethod,
  processingId: string,
  processingOptions?: PDFProcessingOptions
): Promise<ExtractionResult> {
  try {
    switch (extractionMethod) {
      case 'native-pdf':
        return await extractWithNativePDF(filePath, processingId);
      
      case 'ocr-tesseract':
        return await extractWithTesseractOCR(filePath, processingId, processingOptions);
      
      case 'ocr-azure':
        return await extractWithAzureOCR(filePath, processingId, processingOptions);
      
      case 'ocr-google':
        return await extractWithGoogleOCR(filePath, processingId, processingOptions);
      
      case 'ocr-amazon':
        return await extractWithAmazonOCR(filePath, processingId, processingOptions);
      
      case 'ocr-ollama':
        return await extractWithOllamaOCR(filePath, processingId, processingOptions);
      
      default:
        throw new ProcessingException(
          'UNSUPPORTED_EXTRACTION_METHOD',
          `Extraction method not supported: ${extractionMethod}`,
          processingId
        );
    }
  } catch (error) {
    if (processingOptions?.enableFallback) {
      const { getFallbackExtractionMethod } = await import('./utils');
      const fallbackMethod = getFallbackExtractionMethod(extractionMethod);
      if (fallbackMethod) {
        await auditLogger.log(
          'EXTRACTION_FALLBACK_TRIGGERED',
          'invoice',
          processingId,
          'WARNING',
          {
            processingId,
            originalMethod: extractionMethod,
            fallbackMethod,
            error: error instanceof Error ? error.message : String(error)
          }
        );
        
        return await performExtraction(
          filePath,
          mimeType,
          fallbackMethod,
          processingId,
          { ...processingOptions, enableFallback: false }
        );
      }
    }
    
    throw error;
  }
}

export async function extractWithNativePDF(
  filePath: string,
  processingId: string
): Promise<ExtractionResult> {
  try {
    const fileBuffer = await readFile(filePath);
    const pdfResult = await pdf(fileBuffer);
    
    const rawText = pdfResult.text;
    const normalizedText = normalizeText(rawText);
    const cleanedText = cleanText(normalizedText);
    
    const textMetrics: TextExtractionMetrics = {
      totalCharacters: rawText.length,
      totalWords: rawText.split(/\s+/).length,
      totalLines: rawText.split('\n').length,
      totalParagraphs: rawText.split(/\n\s*\n/).length,
      averageWordLength: rawText.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / Math.max(rawText.split(/\s+/).length, 1),
      averageLineLength: rawText.split('\n').reduce((sum, line) => sum + line.length, 0) / Math.max(rawText.split('\n').length, 1),
      extractionConfidence: 0.95,
      languageConfidence: 0.90,
      encodingConfidence: 0.98
    };
    
    const tables = await detectAndExtractTables(filePath, processingId);
    const tableMetrics: TableExtractionMetrics = {
      totalTables: tables.length,
      totalRows: tables.reduce((sum, table) => sum + table.rows.length, 0),
      totalColumns: tables.length > 0 ? tables[0].headers.cells.length : 0,
      totalCells: tables.reduce((sum, table) => sum + table.rows.reduce((rowSum: number, row: any) => rowSum + row.cells.length, 0), 0),
      extractionConfidence: tables.length > 0 ? 0.85 : 0.30,
      structureConfidence: 0.80,
      dataConfidence: 0.75
    };
    
    const fields = extractFieldsWithPatterns(cleanedText, processingId);
    const formMetrics: FormExtractionMetrics = {
      totalForms: 1,
      totalFields: fields.length,
      totalValues: fields.filter((f: any) => f.fieldValue.trim().length > 0).length,
      extractionConfidence: fields.length > 0 ? 0.80 : 0.40,
      fieldDetectionConfidence: 0.75,
      valueExtractionConfidence: 0.70
    };
    
    const imageMetrics: ImageExtractionMetrics = {
      totalImages: 0,
      totalGraphics: 0,
      totalSignatures: 0,
      extractionConfidence: 0.50,
      qualityScore: 0.60
    };
    
    return {
      engine: 'pdf-parse',
      engineVersion: '1.1.1',
      rawText,
      normalizedText,
      cleanedText,
      textMetrics,
      tableMetrics,
      formMetrics,
      imageMetrics,
      tables,
      tableConfidences: tables.map((table: any) => ({
        tableId: table.tableId,
        structureConfidence: 0.80,
        dataConfidence: 0.75,
        overallConfidence: 0.77,
        metadata: {}
      })),
      fields,
      fieldConfidences: fields.map((field: any) => ({
        fieldId: field.fieldId,
        detectionConfidence: 0.85,
        extractionConfidence: 0.80,
        overallConfidence: 0.82,
        metadata: {}
      })),
      language: detectLanguage(cleanedText),
      metadata: {}
    };
  } catch (error) {
    throw new ProcessingException(
      'NATIVE_PDF_EXTRACTION_FAILED',
      error instanceof Error ? error.message : 'Native PDF extraction failed',
      processingId
    );
  }
}
