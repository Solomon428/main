import sharp from 'sharp';
import { PDFDocument, type PDFPage } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { OcrProcessingError } from './errors';
import { IMAGE_CONSTRAINTS, PREPROCESSING_DEFAULTS } from './constants';

export interface PreprocessingOptions {
  grayscale?: boolean;
  contrastAlpha?: number;
  contrastBeta?: number;
  medianFilter?: number;
  sharpen?: boolean;
  maxDimension?: number;
  targetDpi?: number;
}

export class ImagePreprocessor {
  private tempDir: string;

  constructor(tempDir: string) {
    this.tempDir = tempDir;
  }

  async preprocessImage(
    imageBuffer: Buffer,
    mimeType: string,
    options: PreprocessingOptions = {}
  ): Promise<Buffer> {
    const opts = {
      grayscale: PREPROCESSING_DEFAULTS.GRAYSCALE,
      contrastAlpha: PREPROCESSING_DEFAULTS.CONTRAST_ALPHA,
      contrastBeta: PREPROCESSING_DEFAULTS.CONTRAST_BETA,
      medianFilter: PREPROCESSING_DEFAULTS.MEDIAN_FILTER_SIZE,
      sharpen: PREPROCESSING_DEFAULTS.SHARPEN,
      maxDimension: IMAGE_CONSTRAINTS.MAX_DIMENSION,
      targetDpi: IMAGE_CONSTRAINTS.TARGET_DPI,
      ...options
    };

    try {
      let image = sharp(imageBuffer);
      const metadata = await image.metadata();

      // Apply preprocessing pipeline
      if (opts.grayscale) {
        image = image.grayscale();
      }

      image = image
        .linear(opts.contrastAlpha, opts.contrastBeta * 255)
        .median(opts.medianFilter);

      if (opts.sharpen) {
        image = image.sharpen();
      }

      // Set DPI metadata
      image = image.withMetadata({
        density: Math.max(metadata.density || IMAGE_CONSTRAINTS.MIN_DPI, opts.targetDpi)
      });

      // Resize if too large
      if (metadata.width && metadata.width > opts.maxDimension) {
        image = image.resize(opts.maxDimension, null, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      if (metadata.height && metadata.height > opts.maxDimension) {
        image = image.resize(null, opts.maxDimension, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      const processedBuffer = await image.png().toBuffer();
      return processedBuffer;
    } catch (error) {
      throw new OcrProcessingError(
        'Failed to preprocess image',
        'PREPROCESSING_FAILED',
        { mimeType },
        error instanceof Error ? error : undefined
      );
    }
  }

  async convertPdfPageToImage(
    page: PDFPage,
    pageIndex: number,
    pdfDoc: PDFDocument
  ): Promise<Buffer> {
    try {
      // Create a temporary single-page PDF
      const tempPdf = await PDFDocument.create();
      const [copiedPage] = await tempPdf.copyPages(pdfDoc, [pageIndex]);
      tempPdf.addPage(copiedPage);

      const tempPdfBytes = await tempPdf.save();
      const tempPdfPath = path.join(
        this.tempDir,
        `page_${pageIndex}_${Date.now()}.pdf`
      );

      fs.writeFileSync(tempPdfPath, tempPdfBytes);

      try {
        // Convert PDF to image using sharp
        const image = await sharp(tempPdfPath, {
          density: IMAGE_CONSTRAINTS.TARGET_DPI
        })
          .png()
          .toBuffer();

        fs.unlinkSync(tempPdfPath);
        return image;
      } catch (sharpError) {
        // Cleanup on error
        if (fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath);
        }
        throw sharpError;
      }
    } catch (error) {
      throw new OcrProcessingError(
        'Failed to convert PDF page to image',
        'PDF_CONVERSION_FAILED',
        { pageIndex },
        error instanceof Error ? error : undefined
      );
    }
  }

  async convertAllPdfPages(pdfBuffer: Buffer): Promise<Buffer[]> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      const images: Buffer[] = [];

      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        const image = await this.convertPdfPageToImage(page, i, pdfDoc);
        images.push(image);
      }

      return images;
    } catch (error) {
      throw new OcrProcessingError(
        'Failed to convert PDF pages',
        'PDF_CONVERSION_FAILED',
        {},
        error instanceof Error ? error : undefined
      );
    }
  }
}

export default ImagePreprocessor;
