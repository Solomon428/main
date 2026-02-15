import { createWorker, type Worker } from 'tesseract.js';
import type { OcrResult, OcrProgress, LanguageInfo } from '../types';
import { OcrServiceError, OcrProcessingError } from '../errors';
import { TESSERACT_WHITELIST } from '../constants';

export interface TesseractEngineConfig {
  language: string;
  pageSegmentationMode: number;
  ocrEngineMode: number;
  logger?: (message: any) => void;
  errorHandler?: (error: any) => void;
}

export class TesseractEngine {
  private worker: Worker | null = null;
  private config: TesseractEngineConfig;

  constructor(config: TesseractEngineConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      this.worker = await createWorker({
        logger: this.config.logger,
        errorHandler: this.config.errorHandler,
      });

      await this.worker.loadLanguage(this.config.language);
      await this.worker.initialize(this.config.language);
      await this.worker.setParameters({
        tessedit_pageseg_mode: this.config.pageSegmentationMode.toString(),
        tessedit_ocr_engine_mode: this.config.ocrEngineMode.toString(),
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: TESSERACT_WHITELIST,
      });
    } catch (error) {
      throw new OcrServiceError(
        'Failed to initialize Tesseract.js',
        'TESSERACT_INIT_FAILED',
        { language: this.config.language },
        error instanceof Error ? error : undefined
      );
    }
  }

  async process(
    imageBuffer: Buffer,
    fileName: string,
    jobId: string,
    updateProgress: (jobId: string, progress: OcrProgress) => void
  ): Promise<OcrResult> {
    if (!this.worker) {
      throw new OcrServiceError('Tesseract worker not initialized', 'TESSERACT_NOT_INITIALIZED');
    }

    try {
      updateProgress(jobId, {
        stage: 'extracting',
        progress: 60,
        message: 'Running Tesseract OCR',
        timestamp: new Date()
      });

      const startTime = Date.now();
      const result = await this.worker.recognize(imageBuffer);
      const processingTime = Date.now() - startTime;

      updateProgress(jobId, {
        stage: 'postprocessing',
        progress: 85,
        message: 'Post-processing extracted text',
        timestamp: new Date()
      });

      const confidence = result.data.confidence || 0;
      const detectedLanguage = result.data.language || this.config.language;

      return {
        success: true,
        text: result.data.text || '',
        confidence,
        pages: 1,
        language: detectedLanguage,
        processingTime,
        provider: 'tesseract',
        metadata: {
          blockCount: result.data.blocks?.length || 0,
          paragraphCount: result.data.paragraphs?.length || 0,
          lineCount: result.data.lines?.length || 0,
          wordCount: result.data.words?.length || 0
        }
      };
    } catch (error) {
      throw new OcrProcessingError(
        'Tesseract processing failed',
        'TESSERACT_PROCESSING_FAILED',
        { fileName },
        error instanceof Error ? error : undefined
      );
    }
  }

  async shutdown(): Promise<void> {
    try {
      if (this.worker) {
        await this.worker.terminate();
        this.worker = null;
      }
    } catch (error) {
      // Log but don't throw on shutdown errors
    }
  }

  async getLanguages(): Promise<LanguageInfo[]> {
    if (!this.worker) {
      return [];
    }

    try {
      const languages = await this.worker.getLanguages();
      const languageMap: Record<string, { name: string; nativeName: string }> = {
        eng: { name: 'English', nativeName: 'English' },
        spa: { name: 'Spanish', nativeName: 'Español' },
        fra: { name: 'French', nativeName: 'Français' },
        deu: { name: 'German', nativeName: 'Deutsch' },
        ita: { name: 'Italian', nativeName: 'Italiano' },
        por: { name: 'Portuguese', nativeName: 'Português' },
        rus: { name: 'Russian', nativeName: 'Русский' },
        chi_sim: { name: 'Chinese Simplified', nativeName: '简体中文' },
        chi_tra: { name: 'Chinese Traditional', nativeName: '繁體中文' },
        jpn: { name: 'Japanese', nativeName: '日本語' },
        kor: { name: 'Korean', nativeName: '한국어' },
        ara: { name: 'Arabic', nativeName: 'العربية' },
        hin: { name: 'Hindi', nativeName: 'हिन्दी' },
        ben: { name: 'Bengali', nativeName: 'বাংলা' }
      };

      return languages.map(lang => {
        const info = languageMap[lang] || { name: lang, nativeName: lang };
        return {
          code: lang,
          name: info.name,
          nativeName: info.nativeName,
          supported: true
        };
      });
    } catch (error) {
      return [];
    }
  }
}

export default TesseractEngine;
