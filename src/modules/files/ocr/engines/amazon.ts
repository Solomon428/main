import {
  TextractClient,
  AnalyzeDocumentCommand,
  FeatureType,
} from "@aws-sdk/client-textract";
import type { OcrResult, LanguageInfo } from "../types";
import { OcrServiceError, OcrProcessingError } from "../errors";

export interface AwsTextractConfig {
  language: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export class AwsTextractEngine {
  private client: TextractClient | null = null;
  private config: AwsTextractConfig;

  constructor(config: AwsTextractConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      if (
        !process.env.AWS_ACCESS_KEY_ID ||
        !process.env.AWS_SECRET_ACCESS_KEY
      ) {
        throw new OcrServiceError(
          "AWS credentials not configured",
          "AWS_TEXTRACT_CREDENTIALS_MISSING",
        );
      }

      this.client = new TextractClient({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    } catch (error) {
      throw new OcrServiceError(
        "Failed to initialize AWS Textract",
        "AWS_TEXTRACT_INIT_FAILED",
        {},
        error instanceof Error ? error : undefined,
      );
    }
  }

  async process(imageBuffer: Buffer, fileName: string): Promise<OcrResult> {
    if (!this.client) {
      throw new OcrServiceError(
        "AWS Textract client not initialized",
        "AWS_TEXTRACT_NOT_INITIALIZED",
      );
    }

    try {
      const startTime = Date.now();

      const command = new AnalyzeDocumentCommand({
        Document: {
          Bytes: imageBuffer,
        },
        FeatureTypes: [FeatureType.TABLES, FeatureType.FORMS],
      });

      const response = await this.client.send(command);
      const processingTime = Date.now() - startTime;

      let fullText = "";
      const blocks = response.Blocks || [];

      for (const block of blocks) {
        if (block.BlockType === "LINE" && block.Text) {
          fullText += block.Text + "\n";
        }
      }

      const wordBlocks = blocks.filter((b) => b.BlockType === "WORD");
      const confidence =
        wordBlocks.length > 0
          ? wordBlocks.reduce(
              (sum, block) => sum + (block.Confidence || 0),
              0,
            ) / wordBlocks.length
          : 0;

      return {
        success: true,
        text: fullText.trim(),
        confidence,
        pages: 1,
        language: this.config.language,
        processingTime,
        provider: "aws-textract",
        metadata: {
          blockCount: blocks.length,
          pageCount: response.DocumentMetadata?.Pages || 1,
        },
      };
    } catch (error) {
      throw new OcrProcessingError(
        "AWS Textract processing failed",
        "AWS_TEXTRACT_PROCESSING_FAILED",
        { fileName },
        error instanceof Error ? error : undefined,
      );
    }
  }

  async shutdown(): Promise<void> {
    try {
      if (this.client) {
        this.client.destroy();
        this.client = null;
      }
    } catch (error) {
      // Log but don't throw on shutdown errors
    }
  }

  async getLanguages(): Promise<LanguageInfo[]> {
    const supportedLanguages = [
      { code: "en", name: "English", nativeName: "English" },
      { code: "es", name: "Spanish", nativeName: "Español" },
      { code: "fr", name: "French", nativeName: "Français" },
      { code: "de", name: "German", nativeName: "Deutsch" },
      { code: "it", name: "Italian", nativeName: "Italiano" },
      { code: "pt", name: "Portuguese", nativeName: "Português" },
    ];

    return supportedLanguages.map((lang) => ({
      ...lang,
      supported: true,
    }));
  }
}

export default AwsTextractEngine;
