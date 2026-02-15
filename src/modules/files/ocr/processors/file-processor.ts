import { fromBuffer } from 'file-type';
import type { OcrResult, OcrProgress, OcrConfig } from '../types';
import { OcrServiceError, OcrValidationError, OcrProcessingError } from '../errors';
import { TextPostprocessor } from '../postprocessing';
import { ImagePreprocessor } from '../preprocessing';
import type { TesseractEngine } from '../engines/tesseract';
import type { GoogleVisionEngine } from '../engines/google';
import type { AwsTextractEngine } from '../engines/amazon';
import type { AzureCognitiveEngine } from '../engines/azure';
import type { OllamaEngine } from '../engines/ollama';

export interface FileProcessorOptions {
  config: OcrConfig;
  preprocessor: ImagePreprocessor;
  tesseractEngine: TesseractEngine | null;
  googleVisionEngine: GoogleVisionEngine | null;
  awsTextractEngine: AwsTextractEngine | null;
  azureEngine: AzureCognitiveEngine | null;
  ollamaEngine: OllamaEngine | null;
  updateProgress: (jobId: string, progress: OcrProgress) => void;
}

export class FileProcessor {
  private options: FileProcessorOptions;

  constructor(options: FileProcessorOptions) {
    this.options = options;
  }

  async processFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    jobId: string
  ): Promise<OcrResult> {
    // Determine document type and process accordingly
    const fileType = await fromBuffer(fileBuffer);
    const actualMimeType = fileType?.mime || mimeType;

    if (actualMimeType === 'application/pdf') {
      return this.processPdfFile(fileBuffer, fileName, jobId);
    } else if (actualMimeType.startsWith('image/')) {
      return this.processImageFile(fileBuffer, fileName, actualMimeType, jobId);
    } else {
      throw new OcrValidationError(`Unsupported file type: ${actualMimeType}`, {
        fileName,
        mimeType: actualMimeType
      });
    }
  }

  private async processPdfFile(
    pdfBuffer: Buffer,
    fileName: string,
    jobId: string
  ): Promise<OcrResult> {
    try {
      this.options.updateProgress(jobId, {
        stage: 'preprocessing',
        progress: 10,
        message: 'Loading PDF document',
        timestamp: new Date()
      });

      const pageImages = await this.options.preprocessor.convertAllPdfPages(pdfBuffer);
      const pageCount = pageImages.length;

      this.options.updateProgress(jobId, {
        stage: 'preprocessing',
        progress: 20,
        message: `PDF loaded: ${pageCount} page(s)`,
        details: { pageCount },
        timestamp: new Date()
      });

      let allText = '';
      let totalConfidence = 0;
      let processedPages = 0;
      const errors: string[] = [];
      const warnings: string[] = [];

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        try {
          this.options.updateProgress(jobId, {
            stage: 'extracting',
            progress: 20 + Math.floor((pageIndex / pageCount) * 60),
            message: `Processing page ${pageIndex + 1} of ${pageCount}`,
            details: { currentPage: pageIndex + 1, totalPages: pageCount },
            timestamp: new Date()
          });

          const imageBuffer = pageImages[pageIndex];
          const pageResult = await this.processImageWithProvider(
            imageBuffer,
            `${fileName}_page_${pageIndex + 1}.png`,
            jobId
          );

          if (pageResult.success && pageResult.text) {
            allText += `\n\n--- Page ${pageIndex + 1} ---\n${pageResult.text}`;
            totalConfidence += pageResult.confidence;
            processedPages++;
          } else {
            errors.push(`Failed to extract text from page ${pageIndex + 1}`);
          }
        } catch (pageError) {
          const errorMsg = pageError instanceof Error ? pageError.message : 'Unknown error';
          errors.push(`Error processing page ${pageIndex + 1}: ${errorMsg}`);
        }
      }

      const averageConfidence = processedPages > 0 ? totalConfidence / processedPages : 0;

      const validation = TextPostprocessor.validateInvoiceExtraction(allText);

      if (!validation.isValid) {
        warnings.push(...validation.suggestions);
      }

      return {
        success: errors.length === 0,
        text: allText,
        confidence: averageConfidence,
        pages: pageCount,
        language: this.options.config.language,
        processingTime: 0,
        provider: this.options.config.provider,
        metadata: {
          pageCount,
          processedPages,
          validationScore: validation.score,
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      throw new OcrProcessingError(
        'Failed to process PDF file',
        'PDF_PROCESSING_FAILED',
        { fileName },
        error instanceof Error ? error : undefined
      );
    }
  }

  private async processImageFile(
    imageBuffer: Buffer,
    fileName: string,
    mimeType: string,
    jobId: string
  ): Promise<OcrResult> {
    try {
      this.options.updateProgress(jobId, {
        stage: 'preprocessing',
        progress: 15,
        message: 'Preprocessing image for OCR',
        timestamp: new Date()
      });

      const preprocessedImage = await this.options.preprocessor.preprocessImage(imageBuffer, mimeType);

      this.options.updateProgress(jobId, {
        stage: 'extracting',
        progress: 40,
        message: 'Extracting text from image',
        timestamp: new Date()
      });

      const result = await this.processImageWithProvider(
        preprocessedImage,
        fileName,
        jobId
      );

      return result;
    } catch (error) {
      throw new OcrProcessingError(
        'Failed to process image file',
        'IMAGE_PROCESSING_FAILED',
        { fileName, mimeType },
        error instanceof Error ? error : undefined
      );
    }
  }

  private async processImageWithProvider(
    imageBuffer: Buffer,
    fileName: string,
    jobId: string
  ): Promise<OcrResult> {
    const { config, updateProgress } = this.options;

    switch (config.provider) {
      case 'tesseract':
        if (!this.options.tesseractEngine) {
          throw new OcrServiceError('Tesseract engine not initialized', 'TESSERACT_NOT_INITIALIZED');
        }
        return this.options.tesseractEngine.process(imageBuffer, fileName, jobId, updateProgress);
      case 'google-vision':
        if (!this.options.googleVisionEngine) {
          throw new OcrServiceError('Google Vision engine not initialized', 'GOOGLE_VISION_NOT_INITIALIZED');
        }
        return this.options.googleVisionEngine.process(imageBuffer, fileName);
      case 'aws-textract':
        if (!this.options.awsTextractEngine) {
          throw new OcrServiceError('AWS Textract engine not initialized', 'AWS_TEXTRACT_NOT_INITIALIZED');
        }
        return this.options.awsTextractEngine.process(imageBuffer, fileName);
      case 'azure':
        if (!this.options.azureEngine) {
          throw new OcrServiceError('Azure engine not initialized', 'AZURE_NOT_INITIALIZED');
        }
        return this.options.azureEngine.process(imageBuffer, fileName);
      case 'ollama':
        if (!this.options.ollamaEngine) {
          throw new OcrServiceError('Ollama engine not initialized', 'OLLAMA_NOT_INITIALIZED');
        }
        return this.options.ollamaEngine.process(imageBuffer, fileName);
      default:
        throw new OcrServiceError(
          `Unsupported OCR provider: ${config.provider}`,
          'UNSUPPORTED_PROVIDER'
        );
    }
  }
}

export default FileProcessor;
