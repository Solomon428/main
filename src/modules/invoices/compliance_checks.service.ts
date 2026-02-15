// src/modules/invoices/compliance-checks.service.ts
import { Prisma, type ComplianceCheck, type Invoice, type User, type Organization, type Supplier, PrismaClient } from '@prisma/client';
import { type Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';
import { type Logger } from 'winston';
import { addDays, differenceInDays, format, parseISO, isBefore, isAfter, isValid, subDays } from 'date-fns';
import { validateEmail, validateVAT, validateBankAccount, validateInvoiceNumber, validateTaxId, validatePostalCode, validatePhoneNumber } from '../../utils/validation';
import { generateId, validateId, parseId, createCuid, parseCuid, validateCuid } from '../../utils/ids';
import { ComplianceStatus } from '../../domain/enums/ComplianceStatus';
import { InvoiceStatus } from '../../domain/enums/InvoiceStatus';
import { RiskLevel } from '../../domain/enums/RiskLevel';
import { AuditAction } from '../../domain/enums/AuditAction';
import { EntityType } from '../../domain/enums/EntityType';
import { Currency } from '../../domain/enums/Currency';
import { InvoiceNotFoundError } from '../common/errors/InvoiceNotFoundError';
import { ValidationError } from '../common/errors/ValidationError';
import { PermissionError } from '../common/errors/PermissionError';
import { AuditLogService } from '../common/services/audit-log.service';
import { getLogger } from '../../logging/logger';

// --- INPUT INTERFACES ---
export interface CreateComplianceCheckInput {
  invoiceId: string;
  checkType: string; // e.g., 'VAT_NUMBER_VALIDATION', 'AMOUNT_LIMIT_CHECK', 'DUPLICATE_INVOICE_CHECK'
  status: ComplianceStatus;
  rules: Array<{ rule: string; required: boolean; description?: string }>;
  result: Record<string, any>; // Flexible result object
  performedBy: string; // Could be a user ID or 'SYSTEM'
  performedAt?: Date | string;
  notes?: string;
  createdById: string;
}

export interface UpdateComplianceCheckInput {
  status?: ComplianceStatus;
  result?: Record<string, any>;
  notes?: string;
  updatedById: string;
}

export interface GetComplianceCheckIncludeOptions {
  invoice?: boolean;
  performedByUser?: boolean;
  createdBy?: boolean;
  updatedBy?: boolean;
}

export interface ComplianceCheckSummary {
  totalCount: number;
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  bypassedCount: number;
  checkTypes: Record<string, { count: number; passed: number; failed: number; pending: number; bypassed: number }>;
}

export interface ComplianceRuleResult {
  rule: string;
  passed: boolean;
  details: string;
  error?: string;
}

/**
 * Service responsible for managing ComplianceCheck entities.
 * Handles running checks, storing results, and providing summaries.
 */
export class ComplianceCheckService {
  private readonly logger: Logger;
  private readonly auditLogService: AuditLogService;

  constructor(
    private prisma: PrismaClient,
    logger?: Logger
  ) {
    this.logger = logger ?? getLogger('ComplianceCheckService');
    this.auditLogService = new AuditLogService(prisma, this.logger);
  }

  /**
   * Creates a new compliance check record.
   * @param tx An active Prisma transaction client.
   * @param input Data for the new compliance check.
   * @returns The created compliance check.
   */
  async createComplianceCheck(tx: any, input: CreateComplianceCheckInput): Promise<ComplianceCheck> {
    const startTime = Date.now();
    const transactionId = createCuid();
    this.logger.info('Starting compliance check creation', { transactionId, invoiceId: input.invoiceId, checkType: input.checkType });

    try {
      await this.validateCreateComplianceCheckInput(input);

      // Check if the parent invoice exists and belongs to the correct organization
      const invoice = await tx.invoice.findUnique({
        where: { id: input.invoiceId, deletedAt: null },
        select: { id: true, organizationId: true },
      });

      if (!invoice) {
        throw new InvoiceNotFoundError(input.invoiceId);
      }

      const complianceCheck = await tx.complianceCheck.create({
         {
          id: generateId(),
          invoiceId: input.invoiceId,
          checkType: input.checkType,
          status: input.status,
          rules: input.rules,
          result: input.result,
          performedBy: input.performedBy,
          performedAt: input.performedAt ? new Date(input.performedAt) : new Date(),
          notes: input.notes || null,
          createdById: input.createdById,
        },
      });

      // Create audit log for creation
      await this.auditLogService.createAuditLog(tx, {
        entityType: EntityType.COMPLIANCECHECK,
        entityId: complianceCheck.id,
        action: AuditAction.CREATE,
        userId: input.createdById,
        organizationId: invoice.organizationId,
        changes: {
          checkType: input.checkType,
          status: input.status,
          performedBy: input.performedBy,
        },
      });

      const duration = Date.now() - startTime;
      this.logger.info('Compliance check created successfully', {
        transactionId,
        complianceCheckId: complianceCheck.id,
        invoiceId: complianceCheck.invoiceId,
        checkType: complianceCheck.checkType,
        status: complianceCheck.status,
        duration,
      });

      return complianceCheck;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to create compliance check', {
        transactionId,
        invoiceId: input.invoiceId,
        checkType: input.checkType,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Retrieves a compliance check by its ID, with optional related data.
   * @param checkId The unique identifier of the compliance check.
   * @param userId The user requesting the check.
   * @param organizationId The organization context.
   * @param include Options for including related entities.
   * @returns The compliance check object.
   */
  async getComplianceCheckById(
    checkId: string,
    userId: string,
    organizationId: string,
    include: GetComplianceCheckIncludeOptions = {}
  ): Promise<ComplianceCheck & {
    invoice?: Invoice;
    performedByUser?: User;
    createdBy?: User;
    updatedBy?: User;
  }> {
    try {
      // Check permissions (example: user must belong to the org containing the invoice)
      await this.checkViewComplianceCheckPermissions(checkId, userId, organizationId);

      const includeClause: any = {};
      if (include.invoice) includeClause.invoice = { select: { id: true, invoiceNumber: true, organizationId: true } }; // Basic info only
      if (include.performedByUser) includeClause.performedByUser = { select: { id: true, email: true, name: true } };
      if (include.createdBy) includeClause.createdBy = { select: { id: true, email: true, name: true } };
      if (include.updatedBy) includeClause.updatedBy = { select: { id: true, email: true, name: true } };

      const check = await this.prisma.complianceCheck.findUnique({
        where: {
          id: checkId,
          deletedAt: null,
          invoice: { organizationId }, // Ensure it's part of the correct org
        },
        include: includeClause,
      });

      if (!check) {
        throw new ValidationError(`Compliance check with ID ${checkId} not found or does not belong to organization.`);
      }

      // Create audit log for view
      await this.auditLogService.createAuditLog(this.prisma, {
        entityType: EntityType.COMPLIANCECHECK,
        entityId: checkId,
        action: AuditAction.VIEW,
        userId,
        organizationId,
        ipAddress: '127.0.0.1', // Placeholder
      });

      return check;
    } catch (error) {
      this.logger.error('Failed to get compliance check', {
        checkId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Updates an existing compliance check.
   * Note: Status might be locked depending on business rules after initial creation.
   * @param checkId The ID of the compliance check to update.
   * @param input The update data.
   * @returns The updated compliance check.
   */
  async updateComplianceCheck(checkId: string, input: UpdateComplianceCheckInput): Promise<ComplianceCheck> {
    const startTime = Date.now();
    const transactionId = createCuid();
    this.logger.info('Starting compliance check update', { transactionId, checkId });

    try {
      const currentCheck = await this.prisma.complianceCheck.findUnique({
        where: { id: checkId, deletedAt: null },
        include: { invoice: { select: { id: true, organizationId: true } } },
      });

      if (!currentCheck) {
        throw new ValidationError(`Compliance check with ID ${checkId} not found.`);
      }

      // Example: Prevent updating status if it's already final (PASSED/FAILED/BYPASSED)
      if ([ComplianceStatus.PASSED, ComplianceStatus.FAILED, ComplianceStatus.BYPASSED].includes(currentCheck.status)) {
          throw new PermissionError(`Cannot update a compliance check with status: ${currentCheck.status}. It is final.`);
      }

      // Validate update input against current state
      const validationErrors = await this.validateUpdateComplianceCheckInput(input, currentCheck);
      if (validationErrors.length > 0) {
        throw new ValidationError('Validation failed for update input', validationErrors);
      }

      const updatedCheck = await this.prisma.$transaction(async (tx) => {
        const updateData: any = {};
        if (input.status !== undefined) updateData.status = input.status;
        if (input.result !== undefined) updateData.result = input.result;
        if (input.notes !== undefined) updateData.notes = input.notes;

        // Determine which fields actually changed for audit log
        const changes: Record<string, any> = {};
        Object.entries(updateData).forEach(([key, value]) => {
          const currentValue = currentCheck[key as keyof typeof currentCheck];
          if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
            changes[key] = { from: currentValue, to: value };
          }
        });

        if (Object.keys(changes).length === 0) {
          this.logger.info('No changes detected in update request', { checkId });
          return currentCheck; // Return original if no changes
        }

        const updatedCheckRecord = await tx.complianceCheck.update({
          where: { id: checkId },
          data: {
            ...updateData,
            updatedById: input.updatedById,
            updatedAt: new Date(),
          },
        });

        // Create audit log for update
        await this.auditLogService.createAuditLog(tx, {
          entityType: EntityType.COMPLIANCECHECK,
          entityId: checkId,
          action: AuditAction.UPDATE,
          userId: input.updatedById,
          organizationId: currentCheck.invoice.organizationId,
          changes,
        });

        return updatedCheckRecord;
      });

      const duration = Date.now() - startTime;
      this.logger.info('Compliance check updated successfully', {
        checkId,
        updatedById: input.updatedById,
        duration,
        changes: Object.keys(updateData),
      });

      return updatedCheck;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to update compliance check', {
        checkId,
        updatedById: input.updatedById,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Soft deletes a compliance check.
   * @param checkId The ID of the compliance check to delete.
   * @param deletedById The ID of the user performing the deletion.
   * @param organizationId The organization context.
   */
  async deleteComplianceCheck(checkId: string, deletedById: string, organizationId: string): Promise<void> {
    try {
      const check = await this.prisma.complianceCheck.findUnique({
        where: { id: checkId, deletedAt: null },
        include: { invoice: { select: { id: true, organizationId: true } } },
      });

      if (!check) {
        throw new ValidationError(`Compliance check with ID ${checkId} not found.`);
      }

      // Check permissions for deletion (e.g., maybe only certain roles can delete checks)
      // Example: Only allow deletion if status is PENDING
      if (check.status !== ComplianceStatus.PENDING) {
          throw new PermissionError(`Cannot delete a compliance check with status: ${check.status}. Only PENDING checks can be deleted.`);
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.complianceCheck.update({
          where: { id: checkId, invoice: { organizationId } }, // Ensure it's part of the correct org
          data: {
            deletedAt: new Date(),
            updatedById: deletedById,
          },
        });

        // Create audit log for deletion
        await this.auditLogService.createAuditLog(tx, {
          entityType: EntityType.COMPLIANCECHECK,
          entityId: checkId,
          action: AuditAction.DELETE,
          userId: deletedById,
          organizationId,
        });
      });
    } catch (error) {
      this.logger.error('Failed to delete compliance check', {
        checkId,
        deletedById,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Retrieves a summary of compliance checks for an invoice or organization.
   * @param organizationId The organization ID.
   * @param invoiceId Optional. If provided, summarize checks for this specific invoice.
   * @returns Summary statistics for the checks.
   */
  async getComplianceCheckSummary(organizationId: string, invoiceId?: string): Promise<ComplianceCheckSummary> {
    try {
      const whereClause: any = { invoice: { organizationId }, deletedAt: null };
      if (invoiceId) {
          whereClause.invoiceId = invoiceId;
      }

      const [
        overallAgg,
        statusGroup,
        typeGroup,
      ] = await Promise.all([
        this.prisma.complianceCheck.count({ where: whereClause }),
        this.prisma.complianceCheck.groupBy({
          by: ['status'],
          where: whereClause,
          _count: true,
        }),
        this.prisma.complianceCheck.groupBy({
          by: ['checkType'],
          where: whereClause,
          _count: true,
          _groupBy: { status: true },
        }),
      ]);

      const summary: ComplianceCheckSummary = {
        totalCount: overallAgg,
        passedCount: 0,
        failedCount: 0,
        pendingCount: 0,
        bypassedCount: 0,
        checkTypes: {},
      };

      // Populate status counts
      statusGroup.forEach(group => {
        switch (group.status) {
          case ComplianceStatus.PASSED:
            summary.passedCount = group._count;
            break;
          case ComplianceStatus.FAILED:
            summary.failedCount = group._count;
            break;
          case ComplianceStatus.PENDING:
            summary.pendingCount = group._count;
            break;
          case ComplianceStatus.BYPASSED:
            summary.bypassedCount = group._count;
            break;
        }
      });

      // Populate check type breakdown
      typeGroup.forEach(group => {
          const checkType = group.checkType;
          const status = group.status;
          const count = group._count;

          if (!summary.checkTypes[checkType]) {
              summary.checkTypes[checkType] = { count: 0, passed: 0, failed: 0, pending: 0, bypassed: 0 };
          }
          summary.checkTypes[checkType].count += count;
          switch (status) {
            case ComplianceStatus.PASSED: summary.checkTypes[checkType].passed += count; break;
            case ComplianceStatus.FAILED: summary.checkTypes[checkType].failed += count; break;
            case ComplianceStatus.PENDING: summary.checkTypes[checkType].pending += count; break;
            case ComplianceStatus.BYPASSED: summary.checkTypes[checkType].bypassed += count; break;
          }
      });

      return summary;
    } catch (error) {
      this.logger.error('Failed to get compliance check summary', {
        organizationId,
        invoiceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Runs a standard set of compliance checks for an invoice.
   * @param tx An active Prisma transaction client.
   * @param invoiceId The ID of the invoice to check.
   * @returns An array of the created compliance check records.
   */
  async runStandardComplianceChecks(tx: any, invoiceId: string): Promise<ComplianceCheck[]> {
      const checks: ComplianceCheck[] = [];
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { supplier: true, lineItems: true },
      });

      if (!invoice) {
        throw new InvoiceNotFoundError(invoiceId);
      }

      // --- 1. VAT Number Validation ---
      if (invoice.supplier.vatNumber) {
        try {
          const isValidVat = validateVAT(invoice.supplier.vatNumber, invoice.supplier.countryCode || 'ZA'); // Default to ZA
          const check = await this.createComplianceCheck(tx, {
            invoiceId,
            checkType: 'VAT_NUMBER_VALIDATION',
            status: isValidVat ? ComplianceStatus.PASSED : ComplianceStatus.FAILED,
            rules: [{ rule: 'VAT_NUMBER_FORMAT', required: true, description: 'Validate VAT number format against country standard' }],
            result: { vatNumber: invoice.supplier.vatNumber, countryCode: invoice.supplier.countryCode, isValid: isValidVat },
            performedBy: 'SYSTEM',
            performedAt: new Date(),
            notes: isValidVat ? 'VAT number format is valid.' : 'VAT number format is invalid.',
            createdById: invoice.createdById, // Use invoice creator ID as placeholder, might want a system user
          });
          checks.push(check);
        } catch (error) {
            // If validation fails due to unknown country or other reasons, mark as pending manual review
            const check = await this.createComplianceCheck(tx, {
            invoiceId,
            checkType: 'VAT_NUMBER_VALIDATION',
            status: ComplianceStatus.PENDING,
            rules: [{ rule: 'VAT_NUMBER_FORMAT', required: true, description: 'Validate VAT number format against country standard' }],
            result: { vatNumber: invoice.supplier.vatNumber, countryCode: invoice.supplier.countryCode, error: (error as Error).message },
            performedBy: 'SYSTEM',
            performedAt: new Date(),
            notes: `VAT number validation failed with error: ${(error as Error).message}. Requires manual review.`,
            createdById: invoice.createdById,
          });
          checks.push(check);
        }
      }

      // --- 2. Amount Limit Check ---
      // Example: Check if total amount exceeds a defined threshold
      const AMOUNT_THRESHOLD = new Prisma.Decimal('50000'); // Example threshold
      const amountCheckPassed = invoice.totalAmount.lte(AMOUNT_THRESHOLD);
      const amountCheck = await this.createComplianceCheck(tx, {
        invoiceId,
        checkType: 'AMOUNT_LIMIT_CHECK',
        status: amountCheckPassed ? ComplianceStatus.PASSED : ComplianceStatus.FAILED,
        rules: [{ rule: 'TOTAL_AMOUNT_UNDER_THRESHOLD', required: true, description: `Ensure total amount is under ${AMOUNT_THRESHOLD}` }],
        result: { totalAmount: invoice.totalAmount.toString(), threshold: AMOUNT_THRESHOLD.toString(), isUnderThreshold: amountCheckPassed },
        performedBy: 'SYSTEM',
        performedAt: new Date(),
        notes: amountCheckPassed ? `Amount ${invoice.totalAmount} is below threshold ${AMOUNT_THRESHOLD}.` : `Amount ${invoice.totalAmount} exceeds threshold ${AMOUNT_THRESHOLD}.`,
        createdById: invoice.createdById,
      });
      checks.push(amountCheck);

      // --- 3. Duplicate Invoice Check ---
      // This logic is complex and often involves fuzzy matching. Here's a basic example.
      const potentialDuplicates = await tx.invoice.findMany({
        where: {
          organizationId: invoice.organizationId,
          supplierId: invoice.supplierId,
          invoiceNumber: invoice.invoiceNumber,
          id: { not: invoice.id }, // Exclude the current invoice
          issueDate: {
            gte: subDays(invoice.issueDate, 30), // Check last 30 days
            lte: addDays(invoice.issueDate, 30),
          },
        },
        include: { supplier: true },
        take: 10,
      });

      const duplicateCheckPassed = potentialDuplicates.length === 0;
      const duplicateCheck = await this.createComplianceCheck(tx, {
        invoiceId,
        checkType: 'DUPLICATE_INVOICE_CHECK',
        status: duplicateCheckPassed ? ComplianceStatus.PASSED : ComplianceStatus.FAILED,
        rules: [{ rule: 'NO_DUPLICATE_FOUND', required: true, description: 'Check for previously processed invoices with same number and supplier' }],
        result: { potentialMatches: potentialDuplicates.length, matchedInvoices: potentialDuplicates.map(d => ({ id: d.id, invoiceNumber: d.invoiceNumber, issueDate: d.issueDate, totalAmount: d.totalAmount })) },
        performedBy: 'SYSTEM',
        performedAt: new Date(),
        notes: duplicateCheckPassed ? 'No duplicate invoices found.' : `Found ${potentialDuplicates.length} potential duplicate(s).`,
        createdById: invoice.createdById,
      });
      checks.push(duplicateCheck);

      // --- 4. Supplier Verification Check ---
      // Example: Check if supplier is marked as active
      const supplierCheckPassed = invoice.supplier.status === 'ACTIVE';
      const supplierCheck = await this.createComplianceCheck(tx, {
        invoiceId,
        checkType: 'SUPPLIER_VERIFICATION',
        status: supplierCheckPassed ? ComplianceStatus.PASSED : ComplianceStatus.FAILED,
        rules: [{ rule: 'SUPPLIER_STATUS_ACTIVE', required: true, description: 'Verify supplier account is active' }],
        result: { supplierId: invoice.supplierId, currentStatus: invoice.supplier.status },
        performedBy: 'SYSTEM',
        performedAt: new Date(),
        notes: supplierCheckPassed ? 'Supplier is active.' : `Supplier status is '${invoice.supplier.status}', which is not active.`,
        createdById: invoice.createdById,
      });
      checks.push(supplierCheck);

      // --- 5. Invoice Date Validity Check ---
      // Example: Check if issue date is not in the future
      const now = new Date();
      const dateCheckPassed = !isAfter(invoice.issueDate, now);
      const dateCheck = await this.createComplianceCheck(tx, {
        invoiceId,
        checkType: 'ISSUE_DATE_VALIDITY',
        status: dateCheckPassed ? ComplianceStatus.PASSED : ComplianceStatus.FAILED,
        rules: [{ rule: 'ISSUE_DATE_NOT_FUTURE', required: true, description: 'Ensure issue date is not in the future' }],
        result: { issueDate: invoice.issueDate, currentDate: now, isNotFuture: dateCheckPassed },
        performedBy: 'SYSTEM',
        performedAt: new Date(),
        notes: dateCheckPassed ? 'Issue date is valid (not in the future).' : 'Issue date is in the future.',
        createdById: invoice.createdById,
      });
      checks.push(dateCheck);

      // --- Add more standard checks here as needed ---

      this.logger.info('Standard compliance checks completed', { invoiceId, checkResults: checks.map(c => ({ type: c.checkType, status: c.status })) });
      return checks;
  }

  // --- Helper Methods ---

  private async validateCreateComplianceCheckInput(input: CreateComplianceCheckInput): Promise<void> {
    const errors: string[] = [];

    if (!input.invoiceId) errors.push('invoiceId is required');
    if (!input.checkType) errors.push('checkType is required');
    if (!input.status) errors.push('status is required');
    if (!input.rules || !Array.isArray(input.rules) || input.rules.length === 0) errors.push('rules array is required and cannot be empty');
    if (!input.result) errors.push('result object is required');
    if (!input.performedBy) errors.push('performedBy is required');
    if (!input.createdById) errors.push('createdById is required');

    // Validate status enum
    if (!Object.values(ComplianceStatus).includes(input.status)) {
        errors.push(`Invalid status: ${input.status}`);
    }

    // Validate rules array structure
    input.rules.forEach((rule, index) => {
        if (typeof rule.rule !== 'string') {
            errors.push(`Rule ${index + 1}: rule name must be a string`);
        }
        if (typeof rule.required !== 'boolean') {
            errors.push(`Rule ${index + 1}: required flag must be a boolean`);
        }
    });

    if (errors.length > 0) {
      throw new ValidationError('Validation failed for create compliance check input', errors);
    }
  }

  private async validateUpdateComplianceCheckInput(input: UpdateComplianceCheckInput, currentCheck: ComplianceCheck & { invoice: Invoice }): Promise<string[]> {
    const errors: string[] = [];

    // Add specific validations for updates here if needed
    // e.g., prevent changing checkType after creation
    if (input.checkType !== undefined && input.checkType !== currentCheck.checkType) {
        errors.push('checkType cannot be changed after creation');
    }

    // Validate status enum if provided
    if (input.status !== undefined && !Object.values(ComplianceStatus).includes(input.status)) {
        errors.push(`Invalid status: ${input.status}`);
    }

    return errors;
  }

  private async checkViewComplianceCheckPermissions(checkId: string, userId: string, organizationId: string): Promise<void> {
    // Example permission check: User must belong to the same organization as the invoice linked to the check
    const checkWithInvoice = await this.prisma.complianceCheck.findUnique({
      where: { id: checkId },
      include: { invoice: { select: { organizationId: true } } },
    });

    if (!checkWithInvoice || checkWithInvoice.invoice.organizationId !== organizationId) {
      throw new PermissionError('User does not have permission to view this compliance check');
    }
  }
}

// Export default instance if using a singleton pattern within the app module
// export default new ComplianceCheckService(prismaClientInstance);