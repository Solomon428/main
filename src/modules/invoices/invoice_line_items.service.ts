// src/modules/invoices/invoice-line-items.service.ts
import {
  Prisma,
  type InvoiceLineItem,
  type Invoice,
  type User,
  type Organization,
  PrismaClient,
} from "@prisma/client";
import { type Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";
import { type Logger } from "winston";
import { validateId, generateId } from "../../utils/ids";
import { TaxType } from "../../domain/enums/TaxType";
import { AuditAction } from "../../domain/enums/AuditAction";
import { EntityType } from "../../domain/enums/EntityType";
import { InvoiceNotFoundError } from "../common/errors/InvoiceNotFoundError";
import { ValidationError } from "../common/errors/ValidationError";
import { PermissionError } from "../common/errors/PermissionError";
import { AuditLogService } from "../common/services/audit-log.service";
import { getLogger } from "../../logging/logger";

// --- INPUT INTERFACES ---
export interface CreateInvoiceLineItemInput {
  invoiceId: string;
  lineNumber: number;
  description: string;
  quantity: Decimal | number | string;
  unitPrice: Decimal | number | string;
  unitOfMeasure?: string;
  taxRate?: Decimal | number | string;
  taxType?: TaxType;
  taxAmount?: Decimal | number | string;
  discountRate?: Decimal | number | string;
  discountAmount?: Decimal | number | string;
  totalAmount: Decimal | number | string;
  glAccountCode?: string;
  costCenter?: string;
  projectCode?: string;
  departmentCode?: string;
  customFields?: Record<string, any>;
  createdById: string;
}

export interface UpdateInvoiceLineItemInput {
  description?: string;
  quantity?: Decimal | number | string;
  unitPrice?: Decimal | number | string;
  unitOfMeasure?: string;
  taxRate?: Decimal | number | string;
  taxType?: TaxType;
  taxAmount?: Decimal | number | string;
  discountRate?: Decimal | number | string;
  discountAmount?: Decimal | number | string;
  totalAmount?: Decimal | number | string;
  glAccountCode?: string;
  costCenter?: string;
  projectCode?: string;
  departmentCode?: string;
  customFields?: Record<string, any>;
  updatedById: string;
}

export interface GetInvoiceLineItemIncludeOptions {
  invoice?: boolean;
  createdBy?: boolean;
  updatedBy?: boolean;
}

export interface InvoiceLineItemSummary {
  totalCount: number;
  totalQuantity: Decimal;
  totalAmount: Decimal;
  averageUnitPrice: Decimal;
}

/**
 * Service responsible for managing InvoiceLineItem entities.
 * Handles CRUD operations, business logic, and audit trails for line items.
 */
export class InvoiceLineItemService {
  private readonly logger: Logger;
  private readonly auditLogService: AuditLogService;

  constructor(
    private prisma: PrismaClient,
    logger?: Logger,
  ) {
    this.logger = logger ?? getLogger("InvoiceLineItemService");
    this.auditLogService = new AuditLogService(prisma, this.logger);
  }

  /**
   * Creates a new invoice line item.
   * @param input Data for the new line item.
   * @returns The created line item.
   */
  async createInvoiceLineItem(
    input: CreateInvoiceLineItemInput,
  ): Promise<InvoiceLineItem> {
    const startTime = Date.now();
    const transactionId = generateId(); // Using cuid for transaction ID
    this.logger.info("Starting invoice line item creation", {
      transactionId,
      invoiceId: input.invoiceId,
      lineNumber: input.lineNumber,
    });

    try {
      await this.validateCreateInvoiceLineItemInput(input);

      const lineItem = await this.prisma.$transaction(async (tx) => {
        // Check if the parent invoice exists and belongs to the correct organization
        const invoice = await tx.invoice.findUnique({
          where: { id: input.invoiceId, deletedAt: null },
          select: { id: true, organizationId: true, status: true },
        });

        if (!invoice) {
          throw new InvoiceNotFoundError(input.invoiceId);
        }

        // Prevent modification if invoice is locked (e.g., approved, paid)
        if (["APPROVED", "PAID"].includes(invoice.status)) {
          throw new PermissionError(
            "Cannot add line items to an invoice with status: " +
              invoice.status,
          );
        }

        const createdLineItem = await tx.invoiceLineItem.create({
          data: {
            id: generateId(),
            invoiceId: input.invoiceId,
            lineNumber: input.lineNumber,
            description: input.description,
            quantity: new Prisma.Decimal(input.quantity.toString()),
            unitPrice: new Prisma.Decimal(input.unitPrice.toString()),
            unitOfMeasure: input.unitOfMeasure || null,
            taxRate: input.taxRate
              ? new Prisma.Decimal(input.taxRate.toString())
              : undefined,
            taxType: input.taxType || null,
            taxAmount: input.taxAmount
              ? new Prisma.Decimal(input.taxAmount.toString())
              : undefined,
            discountRate: input.discountRate
              ? new Prisma.Decimal(input.discountRate.toString())
              : undefined,
            discountAmount: input.discountAmount
              ? new Prisma.Decimal(input.discountAmount.toString())
              : undefined,
            totalAmount: new Prisma.Decimal(input.totalAmount.toString()),
            glAccountCode: input.glAccountCode || null,
            costCenter: input.costCenter || null,
            projectCode: input.projectCode || null,
            departmentCode: input.departmentCode || null,
            customFields: input.customFields || {},
            createdById: input.createdById,
          },
        });

        // Optionally trigger recalculation of invoice totals here
        // await this.recalculateInvoiceTotals(tx, input.invoiceId);

        // Create audit log for creation
        await this.auditLogService.createAuditLog(tx, {
          entityType: EntityType.INVOICELINEITEM,
          entityId: createdLineItem.id,
          action: AuditAction.CREATE,
          userId: input.createdById,
          organizationId: invoice.organizationId,
          changes: {
            description: input.description,
            quantity: input.quantity.toString(),
            unitPrice: input.unitPrice.toString(),
            totalAmount: input.totalAmount.toString(),
          },
        });

        return createdLineItem;
      });

      const duration = Date.now() - startTime;
      this.logger.info("Invoice line item created successfully", {
        transactionId,
        lineItemId: lineItem.id,
        invoiceId: lineItem.invoiceId,
        lineNumber: lineItem.lineNumber,
        duration,
      });

      return lineItem;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error("Failed to create invoice line item", {
        transactionId,
        invoiceId: input.invoiceId,
        lineNumber: input.lineNumber,
        duration,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Retrieves an invoice line item by its ID, with optional related data.
   * @param lineItemId The unique identifier of the line item.
   * @param userId The user requesting the line item.
   * @param organizationId The organization context.
   * @param include Options for including related entities.
   * @returns The line item object.
   */
  async getInvoiceLineItemById(
    lineItemId: string,
    userId: string,
    organizationId: string,
    include: GetInvoiceLineItemIncludeOptions = {},
  ): Promise<
    InvoiceLineItem & {
      invoice?: Invoice;
      createdBy?: User;
      updatedBy?: User;
    }
  > {
    try {
      // Check permissions (example: user must belong to the org containing the invoice)
      await this.checkViewLineItemPermissions(
        lineItemId,
        userId,
        organizationId,
      );

      const includeClause: any = {};
      if (include.invoice)
        includeClause.invoice = {
          select: { id: true, invoiceNumber: true, organizationId: true },
        }; // Basic info only
      if (include.createdBy)
        includeClause.createdBy = {
          select: { id: true, email: true, name: true },
        };
      if (include.updatedBy)
        includeClause.updatedBy = {
          select: { id: true, email: true, name: true },
        };

      const lineItem = await this.prisma.invoiceLineItem.findUnique({
        where: {
          id: lineItemId,
          deletedAt: null,
          invoice: { organizationId }, // Ensure it's part of the correct org
        },
        include: includeClause,
      });

      if (!lineItem) {
        throw new InvoiceNotFoundError(
          `Line item with ID ${lineItemId} not found or does not belong to organization.`,
        );
      }

      // Create audit log for view
      await this.auditLogService.createAuditLog(this.prisma, {
        entityType: EntityType.INVOICELINEITEM,
        entityId: lineItemId,
        action: AuditAction.VIEW,
        userId,
        organizationId,
        ipAddress: "127.0.0.1", // Placeholder
      });

      return lineItem;
    } catch (error) {
      this.logger.error("Failed to get invoice line item", {
        lineItemId,
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Updates an existing invoice line item.
   * @param lineItemId The ID of the line item to update.
   * @param input The update data.
   * @returns The updated line item.
   */
  async updateInvoiceLineItem(
    lineItemId: string,
    input: UpdateInvoiceLineItemInput,
  ): Promise<InvoiceLineItem> {
    const startTime = Date.now();
    const transactionId = generateId();
    this.logger.info("Starting invoice line item update", {
      transactionId,
      lineItemId,
    });

    try {
      const currentLineItem = await this.prisma.invoiceLineItem.findUnique({
        where: { id: lineItemId, deletedAt: null },
        include: {
          invoice: { select: { id: true, organizationId: true, status: true } },
        }, // Include invoice for status check
      });

      if (!currentLineItem) {
        throw new ValidationError(`Line item with ID ${lineItemId} not found.`);
      }

      // Check permissions based on invoice status
      if (["APPROVED", "PAID"].includes(currentLineItem.invoice.status)) {
        throw new PermissionError(
          "Cannot update line items on an invoice with status: " +
            currentLineItem.invoice.status,
        );
      }

      // Validate update input against current state
      const validationErrors = await this.validateUpdateInvoiceLineItemInput(
        input,
        currentLineItem,
      );
      if (validationErrors.length > 0) {
        throw new ValidationError(
          "Validation failed for update input",
          validationErrors,
        );
      }

      const updatedLineItem = await this.prisma.$transaction(async (tx) => {
        const updateData: any = {};
        if (input.description !== undefined)
          updateData.description = input.description;
        if (input.quantity !== undefined)
          updateData.quantity = new Prisma.Decimal(input.quantity.toString());
        if (input.unitPrice !== undefined)
          updateData.unitPrice = new Prisma.Decimal(input.unitPrice.toString());
        if (input.unitOfMeasure !== undefined)
          updateData.unitOfMeasure = input.unitOfMeasure;
        if (input.taxRate !== undefined)
          updateData.taxRate = new Prisma.Decimal(input.taxRate.toString());
        if (input.taxType !== undefined) updateData.taxType = input.taxType;
        if (input.taxAmount !== undefined)
          updateData.taxAmount = new Prisma.Decimal(input.taxAmount.toString());
        if (input.discountRate !== undefined)
          updateData.discountRate = new Prisma.Decimal(
            input.discountRate.toString(),
          );
        if (input.discountAmount !== undefined)
          updateData.discountAmount = new Prisma.Decimal(
            input.discountAmount.toString(),
          );
        if (input.totalAmount !== undefined)
          updateData.totalAmount = new Prisma.Decimal(
            input.totalAmount.toString(),
          );
        if (input.glAccountCode !== undefined)
          updateData.glAccountCode = input.glAccountCode;
        if (input.costCenter !== undefined)
          updateData.costCenter = input.costCenter;
        if (input.projectCode !== undefined)
          updateData.projectCode = input.projectCode;
        if (input.departmentCode !== undefined)
          updateData.departmentCode = input.departmentCode;
        if (input.customFields !== undefined)
          updateData.customFields = input.customFields;

        // Determine which fields actually changed for audit log
        const changes: Record<string, any> = {};
        Object.entries(updateData).forEach(([key, value]) => {
          const currentValue =
            currentLineItem[key as keyof typeof currentLineItem];
          if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
            changes[key] = { from: currentValue, to: value };
          }
        });

        if (Object.keys(changes).length === 0) {
          this.logger.info("No changes detected in update request", {
            lineItemId,
          });
          return currentLineItem; // Return original if no changes
        }

        const updatedItem = await tx.invoiceLineItem.update({
          where: { id: lineItemId },
          data: {
            ...updateData,
            updatedById: input.updatedById,
            updatedAt: new Date(),
          },
        });

        // Optionally trigger recalculation of invoice totals here
        // await this.recalculateInvoiceTotals(tx, currentLineItem.invoiceId);

        // Create audit log for update
        await this.auditLogService.createAuditLog(tx, {
          entityType: EntityType.INVOICELINEITEM,
          entityId: lineItemId,
          action: AuditAction.UPDATE,
          userId: input.updatedById,
          organizationId: currentLineItem.invoice.organizationId,
          changes,
        });

        return updatedItem;
      });

      const duration = Date.now() - startTime;
      this.logger.info("Invoice line item updated successfully", {
        lineItemId,
        updatedById: input.updatedById,
        duration,
        changes: Object.keys(updateData),
      });

      return updatedLineItem;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error("Failed to update invoice line item", {
        lineItemId,
        updatedById: input.updatedById,
        duration,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Soft deletes an invoice line item.
   * @param lineItemId The ID of the line item to delete.
   * @param deletedById The ID of the user performing the deletion.
   * @param organizationId The organization context.
   */
  async deleteInvoiceLineItem(
    lineItemId: string,
    deletedById: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const lineItem = await this.prisma.invoiceLineItem.findUnique({
        where: { id: lineItemId, deletedAt: null },
        include: {
          invoice: { select: { id: true, organizationId: true, status: true } },
        },
      });

      if (!lineItem) {
        throw new ValidationError(`Line item with ID ${lineItemId} not found.`);
      }

      // Check permissions for deletion based on invoice status
      if (["APPROVED", "PAID"].includes(lineItem.invoice.status)) {
        throw new PermissionError(
          "Cannot delete line items from an invoice with status: " +
            lineItem.invoice.status,
        );
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.invoiceLineItem.update({
          where: { id: lineItemId, invoice: { organizationId } }, // Ensure it's part of the correct org
          data: {
            deletedAt: new Date(),
            updatedById: deletedById,
          },
        });

        // Create audit log for deletion
        await this.auditLogService.createAuditLog(tx, {
          entityType: EntityType.INVOICELINEITEM,
          entityId: lineItemId,
          action: AuditAction.DELETE,
          userId: deletedById,
          organizationId,
        });
      });
    } catch (error) {
      this.logger.error("Failed to delete invoice line item", {
        lineItemId,
        deletedById,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Retrieves a summary of line items for an invoice.
   * @param invoiceId The ID of the invoice.
   * @returns Summary statistics for the line items.
   */
  async getLineItemSummaryForInvoice(
    invoiceId: string,
  ): Promise<InvoiceLineItemSummary> {
    try {
      const aggregate = await this.prisma.invoiceLineItem.aggregate({
        where: { invoiceId, deletedAt: null },
        _count: true,
        _sum: {
          quantity: true,
          totalAmount: true,
        },
        _avg: {
          unitPrice: true,
        },
      });

      return {
        totalCount: aggregate._count,
        totalQuantity: aggregate._sum.quantity || new Prisma.Decimal(0),
        totalAmount: aggregate._sum.totalAmount || new Prisma.Decimal(0),
        averageUnitPrice: aggregate._avg.unitPrice || new Prisma.Decimal(0),
      };
    } catch (error) {
      this.logger.error("Failed to get line item summary for invoice", {
        invoiceId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  // --- Helper Methods ---

  private async validateCreateInvoiceLineItemInput(
    input: CreateInvoiceLineItemInput,
  ): Promise<void> {
    const errors: string[] = [];

    if (!input.invoiceId) errors.push("invoiceId is required");
    if (input.lineNumber === undefined || input.lineNumber === null)
      errors.push("lineNumber is required");
    if (!input.description) errors.push("description is required");
    if (input.quantity === undefined || input.unitPrice === undefined) {
      errors.push("quantity and unitPrice are required");
    }

    // Validate quantities and prices are positive
    if (
      input.quantity !== undefined &&
      new Prisma.Decimal(input.quantity.toString()).lessThanOrEqualTo(0)
    ) {
      errors.push("quantity must be greater than zero");
    }
    if (
      input.unitPrice !== undefined &&
      new Prisma.Decimal(input.unitPrice.toString()).lessThan(0)
    ) {
      errors.push("unitPrice cannot be negative");
    }

    // Validate tax rate is between 0 and 100
    if (input.taxRate !== undefined) {
      const rate = new Prisma.Decimal(input.taxRate.toString());
      if (rate.lessThan(0) || rate.greaterThan(100)) {
        errors.push("taxRate must be between 0 and 100");
      }
    }

    // Validate discount rate is between 0 and 100
    if (input.discountRate !== undefined) {
      const rate = new Prisma.Decimal(input.discountRate.toString());
      if (rate.lessThan(0) || rate.greaterThan(100)) {
        errors.push("discountRate must be between 0 and 100");
      }
    }

    // Validate tax type if provided
    if (input.taxType && !Object.values(TaxType).includes(input.taxType)) {
      errors.push(`Invalid tax type: ${input.taxType}`);
    }

    if (errors.length > 0) {
      throw new ValidationError(
        "Validation failed for create line item input",
        errors,
      );
    }
  }

  private async validateUpdateInvoiceLineItemInput(
    input: UpdateInvoiceLineItemInput,
    currentLineItem: InvoiceLineItem & { invoice: Invoice },
  ): Promise<string[]> {
    const errors: string[] = [];

    // Add specific validations for updates here if needed
    // e.g., prevent changing lineNumber after creation
    if (
      input.lineNumber !== undefined &&
      input.lineNumber !== currentLineItem.lineNumber
    ) {
      errors.push("lineNumber cannot be changed after creation");
    }

    // Validate tax rate is between 0 and 100
    if (input.taxRate !== undefined) {
      const rate = new Prisma.Decimal(input.taxRate.toString());
      if (rate.lessThan(0) || rate.greaterThan(100)) {
        errors.push("taxRate must be between 0 and 100");
      }
    }

    // Validate discount rate is between 0 and 100
    if (input.discountRate !== undefined) {
      const rate = new Prisma.Decimal(input.discountRate.toString());
      if (rate.lessThan(0) || rate.greaterThan(100)) {
        errors.push("discountRate must be between 0 and 100");
      }
    }

    // Validate tax type if provided
    if (input.taxType && !Object.values(TaxType).includes(input.taxType)) {
      errors.push(`Invalid tax type: ${input.taxType}`);
    }

    return errors;
  }

  private async checkViewLineItemPermissions(
    lineItemId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    // Example permission check: User must belong to the same organization as the invoice
    const lineItemWithInvoice = await this.prisma.invoiceLineItem.findUnique({
      where: { id: lineItemId },
      include: { invoice: { select: { organizationId: true } } },
    });

    if (
      !lineItemWithInvoice ||
      lineItemWithInvoice.invoice.organizationId !== organizationId
    ) {
      throw new PermissionError(
        "User does not have permission to view this line item",
      );
    }
  }

  // private async recalculateInvoiceTotals(tx: any, invoiceId: string): Promise<void> {
  //   // Example logic to recalculate subtotal, tax, and total for the parent invoice
  //   const lineItems = await tx.invoiceLineItem.findMany({
  //     where: { invoiceId, deletedAt: null },
  //     select: { totalAmount: true },
  //   });
  //
  //   let newTotal = new Prisma.Decimal(0);
  //   lineItems.forEach(item => {
  //     newTotal = newTotal.add(item.totalAmount);
  //   });
  //
  //   await tx.invoice.update({
  //     where: { id: invoiceId },
  //      { totalAmount: newTotal },
  //   });
  // }
}

// Export default instance if using a singleton pattern within the app module
// export default new InvoiceLineItemService(prismaClientInstance);
