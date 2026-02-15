import { Request, Response, NextFunction } from 'express';
import multer, { MulterError, FileFilterCallback } from 'multer';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'image/tif',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
];

// Configure storage - use memory for processing, disk for large files
const storage = multer.memoryStorage();

// File filter
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new AppError(
        `Invalid file type: ${file.mimetype}. Allowed types: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, WEBP, TIFF`,
        'INVALID_FILE_TYPE',
        400
      )
    );
  }
};

// Create multer instance
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // Max 10 files per upload
  },
  fileFilter,
});

/**
 * Middleware for single file upload
 */
export function uploadSingle(fieldName: string) {
  return upload.single(fieldName);
}

/**
 * Middleware for multiple file upload
 */
export function uploadMultiple(fieldName: string, maxCount: number = 10) {
  return upload.array(fieldName, maxCount);
}

/**
 * Middleware for mixed file uploads (multiple fields)
 */
export function uploadFields(fields: Array<{ name: string; maxCount?: number }>) {
  return upload.fields(fields);
}

/**
 * Error handler for multer errors
 */
export function handleMulterError(
  error: Error,
  _req: Request,
  _res: Response,
  next: NextFunction
) {
  if (error instanceof MulterError) {
    logger.error({ error }, 'Multer error occurred');

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return next(
          new AppError(
            `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            'FILE_TOO_LARGE',
            413
          )
        );

      case 'LIMIT_FILE_COUNT':
        return next(
          new AppError(
            'Too many files. Maximum 10 files allowed',
            'TOO_MANY_FILES',
            400
          )
        );

      case 'LIMIT_UNEXPECTED_FILE':
        return next(
          new AppError(
            'Unexpected field name in file upload',
            'UNEXPECTED_FIELD',
            400
          )
        );

      default:
        return next(
          new AppError(
            `File upload error: ${error.message}`,
            'UPLOAD_ERROR',
            400
          )
        );
    }
  }

  next(error);
}

/**
 * Validate file before processing
 */
export function validateFile(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.file && (!req.files || (Array.isArray(req.files) && req.files.length === 0))) {
    return next(new AppError('No file uploaded', 'NO_FILE', 400));
  }

  // Validate file size
  const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return next(
        new AppError(
          `File "${file.originalname}" is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          'FILE_TOO_LARGE',
          413
        )
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return next(
        new AppError(
          `File "${file.originalname}" has invalid type: ${file.mimetype}`,
          'INVALID_FILE_TYPE',
          400
        )
      );
    }
  }

  next();
}

export { upload };
