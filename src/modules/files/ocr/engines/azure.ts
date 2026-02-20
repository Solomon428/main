import type { OcrResult, LanguageInfo } from "../types";
import { OcrProcessingError } from "../errors";

export interface AzureCognitiveConfig {
  language: string;
  endpoint?: string;
  apiKey?: string;
}

export class AzureCognitiveEngine {
  private config: AzureCognitiveConfig;

  constructor(config: AzureCognitiveConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Azure Computer Vision initialization would go here
    // Requires @azure/cognitiveservices-computervision package
    throw new OcrProcessingError(
      "Azure Cognitive Services not yet implemented",
      "AZURE_NOT_IMPLEMENTED",
    );
  }

  async process(_imageBuffer: Buffer, fileName: string): Promise<OcrResult> {
    throw new OcrProcessingError(
      "Azure Cognitive Services not yet implemented",
      "AZURE_NOT_IMPLEMENTED",
      { fileName },
    );
  }

  async shutdown(): Promise<void> {
    // Cleanup would go here
  }

  async getLanguages(): Promise<LanguageInfo[]> {
    return [
      { code: "en", name: "English", nativeName: "English", supported: true },
      { code: "es", name: "Spanish", nativeName: "Español", supported: true },
      { code: "fr", name: "French", nativeName: "Français", supported: true },
      { code: "de", name: "German", nativeName: "Deutsch", supported: true },
    ];
  }
}

export default AzureCognitiveEngine;
