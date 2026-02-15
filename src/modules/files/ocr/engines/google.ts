import { Vision } from '@google-cloud/vision';
import type { OcrResult, LanguageInfo } from '../types';
import { OcrServiceError, OcrProcessingError } from '../errors';

export interface GoogleVisionConfig {
  language: string;
  keyFilename?: string;
  projectId?: string;
}

export class GoogleVisionEngine {
  private client: Vision.ImageAnnotatorClient | null = null;
  private config: GoogleVisionConfig;

  constructor(config: GoogleVisionConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT) {
        throw new OcrServiceError(
          'Google Cloud credentials not configured',
          'GOOGLE_VISION_CREDENTIALS_MISSING'
        );
      }

      this.client = new Vision.ImageAnnotatorClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        projectId: process.env.GOOGLE_CLOUD_PROJECT
      });
    } catch (error) {
      throw new OcrServiceError(
        'Failed to initialize Google Vision',
        'GOOGLE_VISION_INIT_FAILED',
        {},
        error instanceof Error ? error : undefined
      );
    }
  }

  async process(imageBuffer: Buffer, fileName: string): Promise<OcrResult> {
    if (!this.client) {
      throw new OcrServiceError('Google Vision client not initialized', 'GOOGLE_VISION_NOT_INITIALIZED');
    }

    try {
      const startTime = Date.now();

      const [result] = await this.client.textDetection({
        image: { content: imageBuffer.toString('base64') },
        imageContext: {
          languageHints: [this.config.language]
        }
      });

      const processingTime = Date.now() - startTime;

      const detections = result.textAnnotations || [];
      const fullText = detections[0]?.description || '';
      const confidence = detections.length > 0 
        ? detections.slice(1).reduce((sum, detection) => sum + (detection.confidence || 0), 0) / (detections.length - 1) 
        : 0;

      let detectedLanguage = this.config.language;
      if (result.textAnnotations && result.textAnnotations.length > 0) {
        const locale = result.textAnnotations[0].locale;
        if (locale) {
          detectedLanguage = locale.split('-')[0];
        }
      }

      return {
        success: true,
        text: fullText,
        confidence: confidence * 100,
        pages: 1,
        language: detectedLanguage,
        processingTime,
        provider: 'google-vision',
        metadata: {
          detectionsCount: detections.length,
          locale: result.textAnnotations?.[0]?.locale,
        }
      };
    } catch (error) {
      throw new OcrProcessingError(
        'Google Vision processing failed',
        'GOOGLE_VISION_PROCESSING_FAILED',
        { fileName },
        error instanceof Error ? error : undefined
      );
    }
  }

  async shutdown(): Promise<void> {
    try {
      if (this.client) {
        this.client = null;
      }
    } catch (error) {
      // Log but don't throw on shutdown errors
    }
  }

  async getLanguages(): Promise<LanguageInfo[]> {
    const supportedLanguages = [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' }
    ];

    return supportedLanguages.map(lang => ({
      ...lang,
      supported: true
    }));
  }
}

export default GoogleVisionEngine;
