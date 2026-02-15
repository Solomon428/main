/**
 * File Routes
 * 
 * Handles file uploads, OCR processing, document parsing,
 * progress tracking, and retry mechanisms.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Prisma, FileAttachment } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireAuth } from '@/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/middleware/validation.middleware';
import { uploadSingle, uploadMultiple, handleMulterError } from '@/middleware/upload.middleware';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { auditService } from '@/lib/audit/audit.service';
import { AuditAction, EntityType } from '@/domain/enums';
import { OcrService } from './ocr/ocr.service';
import { ExtractionService } from './ocr/extraction.service';
import { documentParserService } from './services/document-parser.service';
import { fileAttachmentsService } from './services/file-attachments.service';
import { UploadedFile } from './types/file-types';

const router = Router();
const ocrService = new OcrService();
const extractionService = new ExtractionService();

// Track active jobs for SSE progress updates
const activeJobs = new Map<string, {
  res: Response;
  timeout: NodeJS.Timeout;
}>();

// Track upload progress for resumable uploads
const uploadProgress = new Map<string, {
  received: number;
  total: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
}>();

// Helper function to get organizationId from authenticated user
function getOrgId(req: Request): string {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    throw new AppError('Organization ID required', 'ORGANIZATION_REQUIRED', 400);
  }
  return orgId;
}

// Validation schemas
const fileUploadQuerySchema = z.object({
  entityType: z.enum(['INVOICE', 'SUPPLIER', 'PURCHASE_ORDER', 'PAYMENT', 'USER', 'ORGANIZATION']).optional(),
  entityId: z.string().optional(),
  autoProcess: z.coerce.boolean().optional().default(true),
  language: z.string().optional(),
  extractionMode: z.enum(['standard', 'aggressive']).optional().default('standard'),
});

const bulkUploadSchema = z.object({
  files: z.array(z.any()).min(1).max(20),
  entityType: z.enum(['INVOICE', 'SUPPLIER', 'PURCHASE_ORDER', 'PAYMENT', 'USER', 'ORGANIZATION']).optional(),
  autoProcess: z.coerce.boolean().optional().default(true),
});

const retryProcessingSchema = z.object({
  useAdvancedOCR: z.coerce.boolean().optional().default(false),
  extractionMode: z.enum(['standard', 'aggressive']).optional().default('standard'),
});

// ============================================================================
// Upload Endpoints
// ============================================================================

/**
 * POST /api/files/upload
 * Upload a single file with optional OCR processing
 */
router.post(
  '/upload',
  authenticate,
  requireAuth,
  uploadSingle('file'),
  handleMulterError,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = getOrgId(req);
      const userId = req.user!.id;
      const file = req.file as UploadedFile | undefined;
      
      if (!file) {
        throw new AppError('No file uploaded', 'NO_FILE', 400);
      }

      const entityType = req.body.entityType as EntityType | undefined;
      const entityId = req.body.entityId as string | undefined;
      const autoProcess = req.body.autoProcess !== 'false';
      const language = req.body.language as string | undefined;

      logger.info({ 
        fileName: file.originalname, 
        mimeType: file.mimetype,
        organizationId,
        autoProcess 
      }, 'File upload started');

      // Save file attachment record
      const fileAttachment = await fileAttachmentsService.createFileAttachment({
        fileName: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path || '',
        entityType,
        entityId,
        organizationId,
        uploadedById: userId,
        processingStatus: 'PENDING',
        metadata: {
          uploadedAt: new Date().toISOString(),
          language,
          autoProcess,
        },
      });

      // Create audit log
      await auditService.createLog({
        action: AuditAction.FILE_UPLOADED,
        entityType: EntityType.FILE_ATTACHMENT,
        entityId: fileAttachment.id,
        userId,
        organizationId,
        metadata: {
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        },
      });

      // Start OCR processing if autoProcess is enabled and file is a document
      if (autoProcess && isDocumentFile(file.mimetype)) {
        // Process asynchronously
        processFileWithOCR(fileAttachment.id, file, userId, organizationId, language).catch((error) => {
          logger.error({ error, fileId: fileAttachment.id }, 'OCR processing failed');
        });
      }

      res.status(201).json({
        success: true,
        data: {
          fileId: fileAttachment.id,
          fileName: fileAttachment.fileName,
          processingStatus: fileAttachment.processingStatus,
          autoProcess,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/files/invoice-upload
 * Specialized endpoint for invoice uploads with OCR
 */
router.post(
  '/invoice-upload',
  authenticate,
  requireAuth,
  uploadSingle('file'),
  handleMulterError,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = getOrgId(req);
      const userId = req.user!.id;
      const file = req.file as UploadedFile | undefined;
      
      if (!file) {
        throw new AppError('No file uploaded', 'NO_FILE', 400);
      }

      // Validate file type for invoices
      if (!isSupportedInvoiceFormat(file.mimetype)) {
        throw new AppError(
          `Unsupported file format: ${file.mimetype}. Supported: PDF, PNG, JPG, TIFF`,
          'INVALID_FORMAT',
          400
        );
      }

      logger.info({ 
        fileName: file.originalname, 
        organizationId 
      }, 'Invoice upload started');

      // Save file attachment record
      const fileAttachment = await fileAttachmentsService.createFileAttachment({
        fileName: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path || '',
        entityType: EntityType.INVOICE,
        organizationId,
        uploadedById: userId,
        processingStatus: 'PROCESSING',
        metadata: {
          uploadedAt: new Date().toISOString(),
          documentType: 'invoice',
        },
      });

      // Start OCR processing immediately
      processFileWithOCR(fileAttachment.id, file, userId, organizationId).catch((error) => {
        logger.error({ error, fileId: fileAttachment.id }, 'Invoice OCR processing failed');
      });

      res.status(201).json({
        success: true,
        data: {
          fileId: fileAttachment.id,
          fileName: fileAttachment.fileName,
          processingStatus: 'PROCESSING',
          message: 'Invoice upload accepted. OCR processing in progress.',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/files/bulk-upload
 * Upload multiple files
 */
router.post(
  '/bulk-upload',
  authenticate,
  requireAuth,
  uploadMultiple('files', 10),
  handleMulterError,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = getOrgId(req);
      const userId = req.user!.id;
      const files = req.files as UploadedFile[] | undefined;
      
      if (!files || files.length === 0) {
        throw new AppError('No files uploaded', 'NO_FILES', 400);
      }

      const entityType = req.body.entityType as EntityType | undefined;
      const autoProcess = req.body.autoProcess !== 'false';

      logger.info({ 
        fileCount: files.length, 
        organizationId 
      }, 'Bulk upload started');

      const results = await Promise.all(
        files.map(async (file) => {
          try {
            const fileAttachment = await fileAttachmentsService.createFileAttachment({
              fileName: file.originalname,
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              path: file.path || '',
              entityType,
              organizationId,
              uploadedById: userId,
              processingStatus: 'PENDING',
              metadata: {
                uploadedAt: new Date().toISOString(),
                autoProcess,
              },
            });

            // Start OCR if autoProcess and document
            if (autoProcess && isDocumentFile(file.mimetype)) {
              processFileWithOCR(fileAttachment.id, file, userId, organizationId).catch((error) => {
                logger.error({ error, fileId: fileAttachment.id }, 'Bulk OCR processing failed');
              });
            }

            return {
              success: true,
              fileId: fileAttachment.id,
              fileName: file.originalname,
              processingStatus: fileAttachment.processingStatus,
            };
          } catch (error) {
            return {
              success: false,
              fileName: file.originalname,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );

      const successful = results.filter((r: {success: boolean}) => r.success);
      const failed = results.filter((r: {success: boolean}) => !r.success);

      res.status(201).json({
        success: true,
        data: {
          total: files.length,
          successful: successful.length,
          failed: failed.length,
          files: results,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// Processing & Extraction Endpoints
// ============================================================================

/**
 * POST /api/files/:fileId/process
 * Trigger OCR processing for a file
 */
router.post(
  '/:fileId/process',
  authenticate,
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = getOrgId(req);
      const userId = req.user!.id;
      const { fileId } = req.params;
      const { useAdvancedOCR, extractionMode } = req.body as { useAdvancedOCR?: boolean; extractionMode?: 'standard' | 'aggressive' };

      const fileAttachment = await prisma.fileAttachment.findUnique({
        where: { id: fileId },
      });

      if (!fileAttachment) {
        throw new AppError('File not found', 'FILE_NOT_FOUND', 404);
      }

      if (fileAttachment.organizationId !== organizationId) {
        throw new AppError('Access denied', 'ACCESS_DENIED', 403);
      }

      // Update status to processing
      await prisma.fileAttachment.update({
        where: { id: fileId },
        data: { status: FileStatus.PROCESSING },
      });

      // Start processing
      const result = await documentParserService.parseDocument({
        fileId,
        userId,
        organizationId,
        options: {
          autoProcess: true,
          extractionMode: extractionMode || 'standard',
        },
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/files/:fileId/retry
 * Retry OCR processing for a failed file
 */
router.post(
  '/:fileId/retry',
  authenticate,
  requireAuth,
  validateBody(retryProcessingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = getOrgId(req);
      const userId = req.user!.id;
      const { fileId } = req.params;
      const { useAdvancedOCR, extractionMode } = req.body;

      const result = await documentParserService.reprocessDocument({
        fileId,
        userId,
        organizationId,
        options: {
          useAdvancedOCR,
          extractionMode,
        },
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/files/bulk-retry
 * Retry OCR processing for multiple files
 */
router.post(
  '/bulk-retry',
  authenticate,
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = getOrgId(req);
      const userId = req.user!.id;
      const { fileIds } = req.body as { fileIds: string[] };

      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        throw new AppError('fileIds array required', 'VALIDATION_ERROR', 400);
      }

      if (fileIds.length > 50) {
        throw new AppError('Maximum 50 files per bulk retry', 'VALIDATION_ERROR', 400);
      }

      const result = await documentParserService.bulkReprocess(
        fileIds,
        userId,
        organizationId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/files/:fileId/extraction
 * Get extraction results for a file
 */
router.get(
  '/:fileId/extraction',
  authenticate,
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = getOrgId(req);
      const { fileId } = req.params;

      const result = await documentParserService.getExtractionResult(
        fileId,
        organizationId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/files/:fileId/progress
 * SSE endpoint for real-time progress updates
 */
router.get(
  '/:fileId/progress',
  authenticate,
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = getOrgId(req);
      const { fileId } = req.params;

      // Verify file access
      const fileAttachment = await prisma.fileAttachment.findUnique({
        where: { id: fileId },
        select: { organizationId: true, status: true },
      });

      if (!fileAttachment) {
        throw new AppError('File not found', 'FILE_NOT_FOUND', 404);
      }

      if (fileAttachment.organizationId !== organizationId) {
        throw new AppError('Access denied', 'ACCESS_DENIED', 403);
      }

      // Set up SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      // Send initial status
      res.write(`data: ${JSON.stringify({ type: 'connected', fileId, status: fileAttachment.status })}\n\n`);

      // Store connection for updates
      const timeout = setInterval(async () => {
        try {
          const file = await prisma.fileAttachment.findUnique({
            where: { id: fileId },
            select: { processingStatus: true, metadata: true },
          });

          if (file) {
            res.write(`data: ${JSON.stringify({ 
              type: 'status', 
              fileId, 
              processingStatus: file.processingStatus,
              progress: (file.metadata as { progress?: number })?.progress 
            })}\n\n`);

            // Close connection if processing is complete or failed
            if (file.processingStatus === 'COMPLETED' || file.processingStatus === 'ERROR') {
              res.write(`data: ${JSON.stringify({ type: 'complete', fileId, status: file.status })}\n\n`);
              res.end();
              clearInterval(timeout);
            }
          }
        } catch (error) {
          logger.error({ error, fileId }, 'Progress polling error');
        }
      }, 2000);

      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(timeout);
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// File Management Endpoints
// ============================================================================

/**
 * GET /api/files
 * List files with filtering and pagination
 */
router.get(
  '/',
  authenticate,
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = getOrgId(req);
      const { 
        entityType, 
        entityId, 
        status,
        search,
        page = '1',
        limit = '20',
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: Prisma.FileAttachmentWhereInput = {
        organizationId,
        ...(entityType && { entityType: entityType as EntityType }),
        ...(entityId && { entityId: entityId as string }),
        ...(status && { processingStatus: status as string }),
        ...(search && {
          OR: [
            { fileName: { contains: search as string, mode: 'insensitive' } },
            { originalName: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      };

      const [files, total] = await Promise.all([
        prisma.fileAttachment.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        prisma.fileAttachment.count({ where }),
      ]);

      res.json({
        success: true,
        data: files,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/files/:fileId
 * Get file details
 */
router.get(
  '/:fileId',
  authenticate,
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = getOrgId(req);
      const { fileId } = req.params;

      const file = await prisma.fileAttachment.findUnique({
        where: { id: fileId },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!file) {
        throw new AppError('File not found', 'FILE_NOT_FOUND', 404);
      }

      if (file.organizationId !== organizationId) {
        throw new AppError('Access denied', 'ACCESS_DENIED', 403);
      }

      res.json({
        success: true,
        data: file,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/files/:fileId
 * Delete a file
 */
router.delete(
  '/:fileId',
  authenticate,
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = getOrgId(req);
      const userId = req.user!.id;
      const { fileId } = req.params;

      const file = await prisma.fileAttachment.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new AppError('File not found', 'FILE_NOT_FOUND', 404);
      }

      if (file.organizationId !== organizationId) {
        throw new AppError('Access denied', 'ACCESS_DENIED', 403);
      }

      await fileAttachmentsService.deleteFileAttachment(fileId, userId, organizationId);

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// Helper Functions
// ============================================================================

function isDocumentFile(mimeType: string): boolean {
  const documentTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/tiff',
    'image/tif',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];
  return documentTypes.includes(mimeType);
}

function isSupportedInvoiceFormat(mimeType: string): boolean {
  const supportedFormats = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/tiff',
    'image/tif',
  ];
  return supportedFormats.includes(mimeType);
}

async function processFileWithOCR(
  fileId: string,
  file: UploadedFile,
  userId: string,
  organizationId: string,
  language?: string
): Promise<void> {
  try {
    // Update status to processing
    await prisma.fileAttachment.update({
      where: { id: fileId },
      data: { status: FileStatus.PROCESSING },
    });

    // Perform OCR
    const ocrResult = await ocrService.extractTextFromFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      fileId
    );

    if (!ocrResult.success) {
      throw new Error('OCR extraction failed');
    }

    // Extract invoice data
    const extractionResult = await extractionService.parseInvoice(
      ocrResult.text,
      fileId,
      organizationId
    );

    // Update file with results
    await prisma.fileAttachment.update({
      where: { id: fileId },
      data: {
        processingStatus: extractionResult.success ? 'COMPLETED' : 'ERROR',
        metadata: {
          ocrResult: {
            text: ocrResult.text,
            confidence: ocrResult.confidence,
            pages: ocrResult.pages,
            processingTime: ocrResult.processingTime,
          },
          extractionResult: extractionResult.success
            ? {
                data: extractionResult.data,
                validation: extractionResult.validation,
              }
            : undefined,
          error: !extractionResult.success ? extractionResult.error : undefined,
        },
      },
    });

    logger.info({ fileId, success: extractionResult.success }, 'OCR processing completed');
  } catch (error) {
    // Update status to error
    await prisma.fileAttachment.update({
      where: { id: fileId },
      data: {
        processingStatus: 'ERROR',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    });

    throw error;
  }
}

export default router;
