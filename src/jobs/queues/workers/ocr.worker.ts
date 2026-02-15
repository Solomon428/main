import { Job } from 'bullmq';
import { prisma } from '../../../lib/prisma';
import { createWorker, QUEUE_NAMES } from '../queue';
import { info, error } from '../../../observability/logger';

interface OCROutput {
  fileId: string;
  fileUrl: string;
  organizationId: string;
}

/**
 * Process OCR jobs - extract text from uploaded documents
 */
async function processOCRJob(job: Job<OCROutput>): Promise<void> {
  const { fileId, fileUrl } = job.data;

  info(`Starting OCR processing for file ${fileId}`, { jobId: job.id });

  try {
    // Update file status
    await prisma.fileAttachment.update({
      where: { id: fileId },
      data: { processingStatus: 'PROCESSING' },
    });

    // TODO: Implement actual OCR processing
    // This would use Tesseract.js, Google Vision, AWS Textract, etc.
    
    // Simulated OCR result
    const extractedText = 'Extracted text from document...';
    const confidence = 95;

    // Update file with OCR results
    await prisma.fileAttachment.update({
      where: { id: fileId },
      data: {
        ocrText: extractedText,
        ocrConfidence: confidence,
        ocrProcessedAt: new Date(),
        processingStatus: 'COMPLETED',
      },
    });

    // If file is an invoice, trigger invoice parsing
    const file = await prisma.fileAttachment.findUnique({
      where: { id: fileId },
    });

    if (file?.fileType === 'application/pdf' || file?.fileType?.startsWith('image/')) {
      // Trigger invoice extraction if applicable
      // await triggerInvoiceExtraction(fileId, extractedText);
    }

    info(`OCR completed for file ${fileId}`, { jobId: job.id, confidence });

  } catch (err) {
    error(`OCR failed for file ${fileId}`, {
      jobId: job.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    await prisma.fileAttachment.update({
      where: { id: fileId },
      data: {
        processingStatus: 'FAILED',
        processingError: err instanceof Error ? err.message : 'Unknown error',
      },
    });

    throw err;
  }
}

/**
 * Create and export the OCR worker
 */
export const ocrWorker = createWorker<OCROutput>(
  QUEUE_NAMES.OCR,
  processOCRJob,
  { concurrency: 2 } // Process 2 OCR jobs concurrently
);

export default ocrWorker;
