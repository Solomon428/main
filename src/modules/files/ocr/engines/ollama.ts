import type { OcrResult, LanguageInfo } from "../types";
import { OcrProcessingError } from "../errors";

export interface OllamaConfig {
  language: string;
  host?: string;
  model?: string;
}

export class OllamaEngine {
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Ollama local OCR initialization would go here
    // This would connect to a local Ollama instance
    // and use a vision-capable model like llava or similar
    throw new OcrProcessingError(
      "Ollama OCR not yet implemented",
      "OLLAMA_NOT_IMPLEMENTED",
    );
  }

  async process(_imageBuffer: Buffer, fileName: string): Promise<OcrResult> {
    throw new OcrProcessingError(
      "Ollama OCR not yet implemented",
      "OLLAMA_NOT_IMPLEMENTED",
      { fileName },
    );
  }

  async shutdown(): Promise<void> {
    // Cleanup would go here
  }

  async getLanguages(): Promise<LanguageInfo[]> {
    // Ollama with vision models typically supports all languages
    return [
      {
        code: "auto",
        name: "Auto-detect",
        nativeName: "Auto-detect",
        supported: true,
      },
    ];
  }
}

export default OllamaEngine;
