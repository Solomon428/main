// src/modules/invoices/file-attachments.service.ts
import { Prisma, type FileAttachment, type Invoice, type User, type Organization, PrismaClient } from '@prisma/client';
import { type Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';
import { type Logger } from 'winston';
import { addDays, differenceInDays, format, parseISO, isBefore, isAfter, isValid, subDays } from 'date-fns';
import { validateEmail, validateVAT, validateBankAccount, validateInvoiceNumber, validateTaxId, validatePostalCode, validatePhoneNumber } from '../../utils/validation';
import { generateId, validateId, parseId, createCuid, parseCuid, validateCuid } from '../../utils/ids';
import { AuditAction } from '../../domain/enums/AuditAction';
import { EntityType } from '../../domain/enums/EntityType';
import { InvoiceNotFoundError } from '../common/errors/InvoiceNotFoundError';
import { ValidationError } from '../common/errors/ValidationError';
import { PermissionError } from '../common/errors/PermissionError';
import { AuditLogService } from '../common/services/audit-log.service';
import { getLogger } from '../../logging/logger';

// --- INPUT INTERFACES ---
export interface CreateFileAttachmentInput {
  invoiceId: string;
  fileName: string;
  fileType: string; // e.g., 'application/pdf', 'image/jpeg'
  fileSize: number; // in bytes
  storagePath: string; // Path within the storage provider
  storageProvider: string; // e.g., 'S3', 'AZURE', 'LOCAL'
  isEncrypted: boolean;
  encryptionKey?: string; // If encrypted, the key used (often stored separately or not at all)
  mimeType: string;
  description?: string;
  uploadedById: string;
  checksum?: string; // SHA256 or MD5 hash for integrity
  version?: number; // Version number for the file
}

export interface UpdateFileAttachmentInput {
  description?: string;
  isEncrypted?: boolean;
  encryptionKey?: string;
  checksum?: string;
  version?: number;
  updatedById: string;
}

export interface GetFileAttachmentIncludeOptions {
  invoice?: boolean;
  uploadedBy?: boolean;
  updatedBy?: boolean;
}

export interface FileAttachmentSummary {
  totalCount: number;
  totalSize: number; // Total size in bytes
  byMimeType: Record<string, { count: number; totalSize: number }>;
  byStorageProvider: Record<string, { count: number; totalSize: number }>;
}

export interface FileUploadMetadata {
  originalName: string;
  sanitizedFileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  storageProvider: string;
  isEncrypted: boolean;
  checksum?: string;
}

/**
 * Service responsible for managing FileAttachment entities.
 * Handles CRUD operations, storage interactions, and audit trails for file attachments.
 * Note: Actual file upload/download/storage logic would typically be handled by separate storage services
 * (e.g., s3.storage.ts) which this service might orchestrate.
 */
export class FileAttachmentService {
  private readonly logger: Logger;
  private readonly auditLogService: AuditLogService;

  constructor(
    private prisma: PrismaClient,
    logger?: Logger
  ) {
    this.logger = logger ?? getLogger('FileAttachmentService');
    this.auditLogService = new AuditLogService(prisma, this.logger);
  }

  /**
   * Creates a new file attachment record in the database.
   * This assumes the file has already been physically stored by a storage service.
   * @param tx An active Prisma transaction client.
   * @param input Data for the new file attachment.
   * @returns The created file attachment record.
   */
  async createFileAttachment(tx: any, input: CreateFileAttachmentInput): Promise<FileAttachment> {
    const startTime = Date.now();
    const transactionId = createCuid();
    this.logger.info('Starting file attachment creation', { transactionId, invoiceId: input.invoiceId, fileName: input.fileName });

    try {
      await this.validateCreateFileAttachmentInput(input);

      // Check if the parent invoice exists and belongs to the correct organization
      const invoice = await tx.invoice.findUnique({
        where: { id: input.invoiceId, deletedAt: null },
        select: { id: true, organizationId: true },
      });

      if (!invoice) {
        throw new InvoiceNotFoundError(input.invoiceId);
      }

      // Optional: Check file size limits here based on organization settings
      // const orgSettings = await tx.systemSetting.findMany({ where: { organizationId: invoice.organizationId, key: 'MAX_FILE_SIZE_MB' }});
      // const maxSizeBytes = parseInt(orgSettings[0]?.value || '10') * 1024 * 1024; // Default 10MB
      // if (input.fileSize > maxSizeBytes) {
      //     throw new ValidationError(`File size ${input.fileSize} bytes exceeds limit of ${maxSizeBytes} bytes.`);
      // }

      const fileAttachment = await tx.fileAttachment.create({
         {
          id: generateId(),
          invoiceId: input.invoiceId,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          storagePath: input.storagePath,
          storageProvider: input.storageProvider,
          isEncrypted: input.isEncrypted,
          encryptionKey: input.encryptionKey || null, // Often not stored for security
          mimeType: input.mimeType,
          description: input.description || null,
          checksum: input.checksum || null,
          version: input.version || 1,
          uploadedById: input.uploadedById,
        },
      });

      // Create audit log for creation
      await this.auditLogService.createAuditLog(tx, {
        entityType: EntityType.FILEATTACHMENT,
        entityId: fileAttachment.id,
        action: AuditAction.CREATE,
        userId: input.uploadedById,
        organizationId: invoice.organizationId,
        changes: {
          fileName: input.fileName,
          fileSize: input.fileSize,
          storageProvider: input.storageProvider,
        },
      });

      const duration = Date.now() - startTime;
      this.logger.info('File attachment created successfully', {
        transactionId,
        fileAttachmentId: fileAttachment.id,
        invoiceId: fileAttachment.invoiceId,
        fileName: fileAttachment.fileName,
        duration,
      });

      return fileAttachment;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to create file attachment', {
        transactionId,
        invoiceId: input.invoiceId,
        fileName: input.fileName,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Retrieves a file attachment by its ID, with optional related data.
   * @param attachmentId The unique identifier of the file attachment.
   * @param userId The user requesting the attachment.
   * @param organizationId The organization context.
   * @param include Options for including related entities.
   * @returns The file attachment object.
   */
  async getFileAttachmentById(
    attachmentId: string,
    userId: string,
    organizationId: string,
    include: GetFileAttachmentIncludeOptions = {}
  ): Promise<FileAttachment & {
    invoice?: Invoice;
    uploadedBy?: User;
    updatedBy?: User;
  }> {
    try {
      // Check permissions (example: user must belong to the org containing the invoice)
      await this.checkViewFileAttachmentPermissions(attachmentId, userId, organizationId);

      const includeClause: any = {};
      if (include.invoice) includeClause.invoice = { select: { id: true, invoiceNumber: true, organizationId: true } }; // Basic info only
      if (include.uploadedBy) includeClause.uploadedBy = { select: { id: true, email: true, name: true } };
      if (include.updatedBy) includeClause.updatedBy = { select: { id: true, email: true, name: true } };

      const attachment = await this.prisma.fileAttachment.findUnique({
        where: {
          id: attachmentId,
          deletedAt: null,
          invoice: { organizationId }, // Ensure it's part of the correct org
        },
        include: includeClause,
      });

      if (!attachment) {
        throw new ValidationError(`File attachment with ID ${attachmentId} not found or does not belong to organization.`);
      }

      // Create audit log for view
      await this.auditLogService.createAuditLog(this.prisma, {
        entityType: EntityType.FILEATTACHMENT,
        entityId: attachmentId,
        action: AuditAction.VIEW,
        userId,
        organizationId,
        ipAddress: '127.0.0.1', // Placeholder
      });

      return attachment;
    } catch (error) {
      this.logger.error('Failed to get file attachment', {
        attachmentId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Updates an existing file attachment metadata.
   * Note: This does not update the physical file itself, only the database record.
   * @param attachmentId The ID of the file attachment to update.
   * @param input The update data.
   * @returns The updated file attachment.
   */
  async updateFileAttachment(attachmentId: string, input: UpdateFileAttachmentInput): Promise<FileAttachment> {
    const startTime = Date.now();
    const transactionId = createCuid();
    this.logger.info('Starting file attachment update', { transactionId, attachmentId });

    try {
      const currentAttachment = await this.prisma.fileAttachment.findUnique({
        where: { id: attachmentId, deletedAt: null },
        include: { invoice: { select: { id: true, organizationId: true } } },
      });

      if (!currentAttachment) {
        throw new ValidationError(`File attachment with ID ${attachmentId} not found.`);
      }

      // Example: Only the uploader or an admin can update metadata
      // const isAdmin = await this.hasAdminPermission(userId, currentAttachment.invoice.organizationId);
      // if (currentAttachment.uploadedById !== userId && !isAdmin) {
      //     throw new PermissionError('Only the uploader or an admin can update file metadata.');
      // }

      // Validate update input against current state
      const validationErrors = await this.validateUpdateFileAttachmentInput(input, currentAttachment);
      if (validationErrors.length > 0) {
        throw new ValidationError('Validation failed for update input', validationErrors);
      }

      const updatedAttachment = await this.prisma.$transaction(async (tx) => {
        const updateData: any = {};
        if (input.description !== undefined) updateData.description = input.description;
        if (input.isEncrypted !== undefined) updateData.isEncrypted = input.isEncrypted;
        if (input.encryptionKey !== undefined) updateData.encryptionKey = input.encryptionKey; // Be very careful with this
        if (input.checksum !== undefined) updateData.checksum = input.checksum;
        if (input.version !== undefined) updateData.version = input.version;

        // Determine which fields actually changed for audit log
        const changes: Record<string, any> = {};
        Object.entries(updateData).forEach(([key, value]) => {
          const currentValue = currentAttachment[key as keyof typeof currentAttachment];
          if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
            changes[key] = { from: currentValue, to: value };
          }
        });

        if (Object.keys(changes).length === 0) {
          this.logger.info('No changes detected in update request', { attachmentId });
          return currentAttachment; // Return original if no changes
        }

        const updatedAttachmentRecord = await tx.fileAttachment.update({
          where: { id: attachmentId },
           {
            ...updateData,
            updatedById: input.updatedById,
            updatedAt: new Date(),
          },
        });

        // Create audit log for update
        await this.auditLogService.createAuditLog(tx, {
          entityType: EntityType.FILEATTACHMENT,
          entityId: attachmentId,
          action: AuditAction.UPDATE,
          userId: input.updatedById,
          organizationId: currentAttachment.invoice.organizationId,
          changes,
        });

        return updatedAttachmentRecord;
      });

      const duration = Date.now() - startTime;
      this.logger.info('File attachment metadata updated successfully', {
        attachmentId,
        updatedById: input.updatedById,
        duration,
        changes: Object.keys(updateData),
      });

      return updatedAttachment;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to update file attachment', {
        attachmentId,
        updatedById: input.updatedById,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Soft deletes a file attachment record.
   * Note: This does not delete the physical file. That should be handled separately by a cleanup job.
   * @param attachmentId The ID of the file attachment to delete.
   * @param deletedById The ID of the user performing the deletion.
   * @param organizationId The organization context.
   */
  async deleteFileAttachment(attachmentId: string, deletedById: string, organizationId: string): Promise<void> {
    try {
      const attachment = await this.prisma.fileAttachment.findUnique({
        where: { id: attachmentId, deletedAt: null },
        include: { invoice: { select: { id: true, organizationId: true } } },
      });

      if (!attachment) {
        throw new ValidationError(`File attachment with ID ${attachmentId} not found.`);
      }

      // Example: Only the uploader or an admin can delete
      // const isAdmin = await this.hasAdminPermission(deletedById, attachment.invoice.organizationId);
      // if (attachment.uploadedById !== deletedById && !isAdmin) {
      //     throw new PermissionError('Only the uploader or an admin can delete a file.');
      // }

      await this.prisma.$transaction(async (tx) => {
        await tx.fileAttachment.update({
          where: { id: attachmentId, invoice: { organizationId } }, // Ensure it's part of the correct org
          data: {
            deletedAt: new Date(),
            updatedById: deletedById,
          },
        });

        // Create audit log for deletion
        await this.auditLogService.createAuditLog(tx, {
          entityType: EntityType.FILEATTACHMENT,
          entityId: attachmentId,
          action: AuditAction.DELETE,
          userId: deletedById,
          organizationId,
        });
      });
    } catch (error) {
      this.logger.error('Failed to delete file attachment', {
        attachmentId,
        deletedById,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Retrieves a summary of file attachments for an invoice or organization.
   * @param organizationId The organization ID.
   * @param invoiceId Optional. If provided, summarize attachments for this specific invoice.
   * @returns Summary statistics for the attachments.
   */
  async getFileAttachmentSummary(organizationId: string, invoiceId?: string): Promise<FileAttachmentSummary> {
    try {
      const whereClause: any = { invoice: { organizationId }, deletedAt: null };
      if (invoiceId) {
          whereClause.invoiceId = invoiceId;
      }

      const [
        overallAgg,
        mimeTypeGroup,
        providerGroup,
      ] = await Promise.all([
        this.prisma.fileAttachment.aggregate({
            where: whereClause,
            _count: true,
            _sum: { fileSize: true },
        }),
        this.prisma.fileAttachment.groupBy({
          by: ['mimeType'],
          where: whereClause,
          _count: true,
          _sum: { fileSize: true },
        }),
        this.prisma.fileAttachment.groupBy({
          by: ['storageProvider'],
          where: whereClause,
          _count: true,
          _sum: { fileSize: true },
        }),
      ]);

      const summary: FileAttachmentSummary = {
        totalCount: overallAgg._count,
        totalSize: overallAgg._sum.fileSize || 0,
        byMimeType: {},
        byStorageProvider: {},
      };

      // Populate mime type breakdown
      mimeTypeGroup.forEach(group => {
          summary.byMimeType[group.mimeType] = {
              count: group._count,
              totalSize: group._sum.fileSize || 0,
          };
      });

      // Populate storage provider breakdown
      providerGroup.forEach(group => {
          summary.byStorageProvider[group.storageProvider] = {
              count: group._count,
              totalSize: group._sum.fileSize || 0,
          };
      });

      return summary;
    } catch (error) {
      this.logger.error('Failed to get file attachment summary', {
        organizationId,
        invoiceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // --- Helper Methods ---

  private async validateCreateFileAttachmentInput(input: CreateFileAttachmentInput): Promise<void> {
    const errors: string[] = [];

    if (!input.invoiceId) errors.push('invoiceId is required');
    if (!input.fileName) errors.push('fileName is required');
    if (!input.fileType) errors.push('fileType is required');
    if (input.fileSize === undefined || input.fileSize < 0) errors.push('fileSize is required and must be non-negative');
    if (!input.storagePath) errors.push('storagePath is required');
    if (!input.storageProvider) errors.push('storageProvider is required');
    if (input.isEncrypted === undefined) errors.push('isEncrypted is required');
    if (!input.mimeType) errors.push('mimeType is required');
    if (!input.uploadedById) errors.push('uploadedById is required');

    // Basic file type and mime type consistency check (optional)
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedMimeTypes.includes(input.mimeType)) {
        errors.push(`Unsupported mime type: ${input.mimeType}`);
    }

    // Example: If encrypted, ensure a key is provided (or handled securely elsewhere)
    // if (input.isEncrypted && !input.encryptionKey) {
    //     errors.push('encryptionKey is required when isEncrypted is true');
    // }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed for create file attachment input', errors);
    }
  }

  private async validateUpdateFileAttachmentInput(input: UpdateFileAttachmentInput, currentAttachment: FileAttachment & { invoice: Invoice }): Promise<string[]> {
    const errors: string[] = [];

    // Add specific validations for updates here if needed
    // e.g., validate file size increase limits
    if (input.fileSize !== undefined && input.fileSize < currentAttachment.fileSize) {
        errors.push('fileSize cannot be decreased');
    }

    return errors;
  }

  private async checkViewFileAttachmentPermissions(attachmentId: string, userId: string, organizationId: string): Promise<void> {
    // Example permission check: User must belong to the same organization as the invoice linked to the attachment
    const attachmentWithInvoice = await this.prisma.fileAttachment.findUnique({
      where: { id: attachmentId },
      include: { invoice: { select: { organizationId: true } } },
    });

    if (!attachmentWithInvoice || attachmentWithInvoice.invoice.organizationId !== organizationId) {
      throw new PermissionError('User does not have permission to view this file attachment');
    }
  }
}

// Export default instance if using a singleton pattern within the app module
// export default new FileAttachmentService(prismaClientInstance);