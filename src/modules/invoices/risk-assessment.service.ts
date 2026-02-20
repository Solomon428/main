// src/modules/invoices/risk-assessment.service.ts
import { Prisma, type RiskScore, type Invoice, type Supplier, type User, type Organization, PrismaClient } from '@prisma/client';
import { type Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';
import { type Logger } from 'winston';
import { addDays, differenceInDays, format, parseISO, isBefore, isAfter, isValid, subDays, isWeekend, isSameDay } from 'date-fns';
import { validateEmail, validateVAT, validateBankAccount, validateInvoiceNumber, validateTaxId, validatePostalCode, validatePhoneNumber } from '../../utils/validation';
import { generateId, validateId, parseId, createCuid, parseCuid, validateCuid } from '../../utils/ids';
import { RiskLevel } from '../../domain/enums/RiskLevel';
import { InvoiceStatus } from '../../domain/enums/InvoiceStatus';
import { ComplianceStatus } from '../../domain/enums/ComplianceStatus';
import { AuditAction } from '../../domain/enums/AuditAction';
import { EntityType } from '../../domain/enums/EntityType';
import { Currency } from '../../domain/enums/Currency';
import { InvoiceNotFoundError } from '../common/errors/InvoiceNotFoundError';
import { ValidationError } from '../common/errors/ValidationError';
import { PermissionError } from '../common/errors/PermissionError';
import { AuditLogService } from '../common/services/audit-log.service';
import { getLogger } from '../../logging/logger';

// --- INPUT INTERFACES ---
export interface CreateRiskScoreInput {
  invoiceId: string;
  riskLevel: RiskLevel;
  score: number; // Numeric score (e.g., 0-100)
  factors: string[]; // List of contributing factors
  calculationMethod: string; // E.g., 'RULE_BASED', 'ML_MODEL_V1', 'MANUAL_REVIEW'
  metadata?: Record<string, any>; // Additional data used in calculation
  notes?: string;
  createdById: string;
}

export interface UpdateRiskScoreInput {
  riskLevel?: RiskLevel;
  score?: number;
  factors?: string[];
  metadata?: Record<string, any>;
  notes?: string;
  updatedById: string;
}

export interface GetRiskScoreIncludeOptions {
  invoice?: boolean;
  createdBy?: boolean;
  updatedBy?: boolean;
}

export interface RiskScoreSummary {
  totalCount: number;
  averageScore: number;
  lowRiskCount: number;
  mediumRiskCount: number;
  highRiskCount: number;
  criticalRiskCount: number;
  riskLevelDistribution: Record<RiskLevel, number>;
}

export interface RiskCalculationFactors {
  supplierHistory: number; // 0-20 points
  invoiceAmount: number; // 0-20 points
  dueDateProximity: number; // 0-20 points
  complianceIssues: number; // 0-20 points
  supplierAge: number; // 0-20 points
  [key: string]: number; // Allow dynamic keys for custom factors
}

/**
 * Service responsible for calculating and managing RiskScore entities.
 * Evaluates invoices for potential risks based on various factors.
 */
export class RiskAssessmentService {
  private readonly logger: Logger;
  private readonly auditLogService: AuditLogService;

  constructor(
    private prisma: PrismaClient,
    logger?: Logger
  ) {
    this.logger = logger ?? getLogger('RiskAssessmentService');
    this.auditLogService = new AuditLogService(prisma, this.logger);
  }

  /**
   * Creates a new risk score record.
   * @param tx An active Prisma transaction client.
   * @param input Data for the new risk score.
   * @returns The created risk score.
   */
  async createRiskScore(tx: any, input: CreateRiskScoreInput): Promise<RiskScore> {
    const startTime = Date.now();
    const transactionId = createCuid();
    this.logger.info('Starting risk score creation', { transactionId, invoiceId: input.invoiceId, riskLevel: input.riskLevel });

    try {
      await this.validateCreateRiskScoreInput(input);

      // Check if the parent invoice exists and belongs to the correct organization
      const invoice = await tx.invoice.findUnique({
        where: { id: input.invoiceId, deletedAt: null },
        select: { id: true, organizationId: true },
      });

      if (!invoice) {
        throw new InvoiceNotFoundError(input.invoiceId);
      }

      const riskScore = await tx.riskScore.create({
         {
          id: generateId(),
          invoiceId: input.invoiceId,
          riskLevel: input.riskLevel,
          score: input.score,
          factors: input.factors,
          calculationMethod: input.calculationMethod,
          meta input.metadata || {},
          notes: input.notes || null,
          createdById: input.createdById,
        },
      });

      // Create audit log for creation
      await this.auditLogService.createAuditLog(tx, {
        entityType: EntityType.RISKSCORE,
        entityId: riskScore.id,
        action: AuditAction.CREATE,
        userId: input.createdById,
        organizationId: invoice.organizationId,
        changes: {
          riskLevel: input.riskLevel,
          score: input.score,
          calculationMethod: input.calculationMethod,
        },
      });

      const duration = Date.now() - startTime;
      this.logger.info('Risk score created successfully', {
        transactionId,
        riskScoreId: riskScore.id,
        invoiceId: riskScore.invoiceId,
        riskLevel: riskScore.riskLevel,
        score: riskScore.score,
        duration,
      });

      return riskScore;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to create risk score', {
        transactionId,
        invoiceId: input.invoiceId,
        riskLevel: input.riskLevel,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Retrieves a risk score by its ID, with optional related data.
   * @param riskScoreId The unique identifier of the risk score.
   * @param userId The user requesting the score.
   * @param organizationId The organization context.
   * @param include Options for including related entities.
   * @returns The risk score object.
   */
  async getRiskScoreById(
    riskScoreId: string,
    userId: string,
    organizationId: string,
    include: GetRiskScoreIncludeOptions = {}
  ): Promise<RiskScore & {
    invoice?: Invoice;
    createdBy?: User;
    updatedBy?: User;
  }> {
    try {
      // Check permissions (example: user must belong to the org containing the invoice)
      await this.checkViewRiskScorePermissions(riskScoreId, userId, organizationId);

      const includeClause: any = {};
      if (include.invoice) includeClause.invoice = { select: { id: true, invoiceNumber: true, organizationId: true } }; // Basic info only
      if (include.createdBy) includeClause.createdBy = { select: { id: true, email: true, name: true } };
      if (include.updatedBy) includeClause.updatedBy = { select: { id: true, email: true, name: true } };

      const score = await this.prisma.riskScore.findUnique({
        where: {
          id: riskScoreId,
          deletedAt: null,
          invoice: { organizationId }, // Ensure it's part of the correct org
        },
        include: includeClause,
      });

      if (!score) {
        throw new ValidationError(`Risk score with ID ${riskScoreId} not found or does not belong to organization.`);
      }

      // Create audit log for view
      await this.auditLogService.createAuditLog(this.prisma, {
        entityType: EntityType.RISKSCORE,
        entityId: riskScoreId,
        action: AuditAction.VIEW,
        userId,
        organizationId,
        ipAddress: '127.0.0.1', // Placeholder
      });

      return score;
    } catch (error) {
      this.logger.error('Failed to get risk score', {
        riskScoreId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Updates an existing risk score.
   * Note: Scores are often immutable once calculated, but this allows for manual adjustments.
   * @param riskScoreId The ID of the risk score to update.
   * @param input The update data.
   * @returns The updated risk score.
   */
  async updateRiskScore(riskScoreId: string, input: UpdateRiskScoreInput): Promise<RiskScore> {
    const startTime = Date.now();
    const transactionId = createCuid();
    this.logger.info('Starting risk score update', { transactionId, riskScoreId });

    try {
      const currentScore = await this.prisma.riskScore.findUnique({
        where: { id: riskScoreId, deletedAt: null },
        include: { invoice: { select: { id: true, organizationId: true } } },
      });

      if (!currentScore) {
        throw new ValidationError(`Risk score with ID ${riskScoreId} not found.`);
      }

      // Example: Add permission check for manual override
      // const userCanOverride = await this.hasRiskOverridePermission(userId);
      // if (!userCanOverride) {
      //   throw new PermissionError('User does not have permission to update risk scores.');
      // }

      // Validate update input against current state
      const validationErrors = await this.validateUpdateRiskScoreInput(input, currentScore);
      if (validationErrors.length > 0) {
        throw new ValidationError('Validation failed for update input', validationErrors);
      }

      const updatedScore = await this.prisma.$transaction(async (tx) => {
        const updateData: any = {};
        if (input.riskLevel !== undefined) updateData.riskLevel = input.riskLevel;
        if (input.score !== undefined) updateData.score = input.score;
        if (input.factors !== undefined) updateData.factors = input.factors;
        if (input.metadata !== undefined) updateData.metadata = input.metadata;
        if (input.notes !== undefined) updateData.notes = input.notes;

        // Determine which fields actually changed for audit log
        const changes: Record<string, any> = {};
        Object.entries(updateData).forEach(([key, value]) => {
          const currentValue = currentScore[key as keyof typeof currentScore];
          if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
            changes[key] = { from: currentValue, to: value };
          }
        });

        if (Object.keys(changes).length === 0) {
          this.logger.info('No changes detected in update request', { riskScoreId });
          return currentScore; // Return original if no changes
        }

        const updatedScoreRecord = await tx.riskScore.update({
          where: { id: riskScoreId },
           {
            ...updateData,
            updatedById: input.updatedById,
            updatedAt: new Date(),
          },
        });

        // Create audit log for update
        await this.auditLogService.createAuditLog(tx, {
          entityType: EntityType.RISKSCORE,
          entityId: riskScoreId,
          action: AuditAction.UPDATE,
          userId: input.updatedById,
          organizationId: currentScore.invoice.organizationId,
          changes,
        });

        return updatedScoreRecord;
      });

      const duration = Date.now() - startTime;
      this.logger.info('Risk score updated successfully', {
        riskScoreId,
        updatedById: input.updatedById,
        duration,
        changes: Object.keys(updateData),
      });

      return updatedScore;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to update risk score', {
        riskScoreId,
        updatedById: input.updatedById,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Soft deletes a risk score.
   * This is generally discouraged as risk scores are part of the immutable audit trail.
   * @param riskScoreId The ID of the risk score to delete.
   * @param deletedById The ID of the user performing the deletion.
   * @param organizationId The organization context.
   */
  async deleteRiskScore(riskScoreId: string, deletedById: string, organizationId: string): Promise<void> {
    try {
      const score = await this.prisma.riskScore.findUnique({
        where: { id: riskScoreId, deletedAt: null },
        include: { invoice: { select: { id: true, organizationId: true } } },
      });

      if (!score) {
        throw new ValidationError(`Risk score with ID ${riskScoreId} not found.`);
      }

      // Risk scores are typically immutable. Deletion might require special permission or be disallowed.
      // For now, we'll assume a super-admin or similar role could do this, but it's highly discouraged.
      // throw new PermissionError('Deletion of Risk Scores is not permitted.');

      await this.prisma.$transaction(async (tx) => {
        await tx.riskScore.update({
          where: { id: riskScoreId, invoice: { organizationId } }, // Ensure it's part of the correct org
          data: {
            deletedAt: new Date(),
            updatedById: deletedById,
          },
        });

        // Create audit log for deletion
        await this.auditLogService.createAuditLog(tx, {
          entityType: EntityType.RISKSCORE,
          entityId: riskScoreId,
          action: AuditAction.DELETE,
          userId: deletedById,
          organizationId,
        });
      });
    } catch (error) {
      this.logger.error('Failed to delete risk score', {
        riskScoreId,
        deletedById,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Retrieves a summary of risk scores for an invoice or organization.
   * @param organizationId The organization ID.
   * @param invoiceId Optional. If provided, summarize scores for this specific invoice.
   * @returns Summary statistics for the scores.
   */
  async getRiskScoreSummary(organizationId: string, invoiceId?: string): Promise<RiskScoreSummary> {
    try {
      const whereClause: any = { invoice: { organizationId }, deletedAt: null };
      if (invoiceId) {
          whereClause.invoiceId = invoiceId;
      }

      const [
        overallAgg,
        levelAgg,
      ] = await Promise.all([
        this.prisma.riskScore.aggregate({
            where: whereClause,
            _avg: { score: true },
            _count: true,
        }),
        this.prisma.riskScore.groupBy({
          by: ['riskLevel'],
          where: whereClause,
          _count: true,
        }),
      ]);

      const summary: RiskScoreSummary = {
        totalCount: overallAgg._count,
        averageScore: overallAgg._avg.score || 0,
        lowRiskCount: 0,
        mediumRiskCount: 0,
        highRiskCount: 0,
        criticalRiskCount: 0,
        riskLevelDistribution: {
          [RiskLevel.LOW]: 0,
          [RiskLevel.MEDIUM]: 0,
          [RiskLevel.HIGH]: 0,
          [RiskLevel.CRITICAL]: 0,
        },
      };

      // Populate level counts
      levelAgg.forEach(group => {
        const count = group._count;
        switch (group.riskLevel) {
          case RiskLevel.LOW:
            summary.lowRiskCount = count;
            summary.riskLevelDistribution[RiskLevel.LOW] = count;
            break;
          case RiskLevel.MEDIUM:
            summary.mediumRiskCount = count;
            summary.riskLevelDistribution[RiskLevel.MEDIUM] = count;
            break;
          case RiskLevel.HIGH:
            summary.highRiskCount = count;
            summary.riskLevelDistribution[RiskLevel.HIGH] = count;
            break;
          case RiskLevel.CRITICAL:
            summary.criticalRiskCount = count;
            summary.riskLevelDistribution[RiskLevel.CRITICAL] = count;
            break;
        }
      });

      return summary;
    } catch (error) {
      this.logger.error('Failed to get risk score summary', {
        organizationId,
        invoiceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Calculates and creates a risk score for an invoice based on various factors.
   * @param tx An active Prisma transaction client.
   * @param invoiceId The ID of the invoice to assess.
   * @param calculationMethod Optional. The method used for calculation (default: 'RULE_BASED').
   * @returns The newly created risk score.
   */
  async calculateRiskScore(tx: any, invoiceId: string, calculationMethod: string = 'RULE_BASED'): Promise<RiskScore> {
    const startTime = Date.now();
    this.logger.info('Starting risk calculation', { invoiceId, calculationMethod });

    try {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          supplier: { select: { id: true, createdAt: true, status: true, riskProfile: true /* assuming a field exists */ } },
          lineItems: { select: { totalAmount: true } },
          complianceChecks: { where: { status: ComplianceStatus.FAILED }, select: { checkType: true, notes: true } },
        },
      });

      if (!invoice) {
        throw new InvoiceNotFoundError(invoiceId);
      }

      let riskScore = 0;
      const factors: string[] = [];
      const factorDetails: RiskCalculationFactors = {
        supplierHistory: 0,
        invoiceAmount: 0,
        dueDateProximity: 0,
        complianceIssues: 0,
        supplierAge: 0,
      };

      // --- FACTOR 1: Supplier History (Payment behavior, past issues) ---
      // This would ideally pull from historical payment data, which is complex.
      // For now, we'll use a simple proxy: supplier status and risk profile.
      if (invoice.supplier.status === 'BLOCKED' || invoice.supplier.riskProfile === 'HIGH') {
          riskScore += 20;
          factors.push('Supplier status is BLOCKED or HIGH risk');
          factorDetails.supplierHistory = 20;
      } else if (invoice.supplier.status === 'ON_HOLD') {
          riskScore += 10;
          factors.push('Supplier status is ON_HOLD');
          factorDetails.supplierHistory = 10;
      }

      // --- FACTOR 2: Invoice Amount ---
      // Higher amounts generally carry higher risk
      const amountThresholds = [
        { max: 1000, points: 0 },
        { max: 5000, points: 5 },
        { max: 10000, points: 10 },
        { max: 25000, points: 15 },
        { max: 50000, points: 20 },
        { max: Infinity, points: 25 },
      ];
      const amountPoints = amountThresholds.find(t => invoice.totalAmount.lte(new Prisma.Decimal(t.max)))?.points || 25;
      riskScore += amountPoints;
      factors.push(`High invoice amount: ${invoice.totalAmount} (${amountPoints} points)`);
      factorDetails.invoiceAmount = amountPoints;

      // --- FACTOR 3: Due Date Proximity ---
      // Invoices due soon might indicate urgency or cash flow issues from supplier
      const daysUntilDue = differenceInDays(invoice.dueDate, new Date());
      if (daysUntilDue < 7) {
          riskScore += 15;
          factors.push(`Short due date (< 7 days): ${daysUntilDue} days left`);
          factorDetails.dueDateProximity = 15;
      } else if (daysUntilDue < 30) {
          riskScore += 8;
          factors.push(`Medium due date (7-30 days): ${daysUntilDue} days left`);
          factorDetails.dueDateProximity = 8;
      }

      // --- FACTOR 4: Failed Compliance Checks ---
      // Failed checks indicate potential issues
      const failedChecks = invoice.complianceChecks.filter(cc => cc.status === ComplianceStatus.FAILED);
      const compliancePenalty = failedChecks.length * 10; // 10 points per failed check
      riskScore += compliancePenalty;
      if (failedChecks.length > 0) {
          factors.push(`${failedChecks.length} failed compliance check(s)`);
          factorDetails.complianceIssues = compliancePenalty;
      }

      // --- FACTOR 5: Supplier Age ---
      // New suppliers might be riskier
      const supplierAgeDays = differenceInDays(new Date(), new Date(invoice.supplier.createdAt));
      if (supplierAgeDays < 90) { // Less than 3 months
          riskScore += 15;
          factors.push(`New supplier (< 90 days old): ${supplierAgeDays} days`);
          factorDetails.supplierAge = 15;
      } else if (supplierAgeDays < 365) { // Less than 1 year
          riskScore += 5;
          factors.push(`Relatively new supplier (< 1 year old): ${supplierAgeDays} days`);
          factorDetails.supplierAge = 5;
      }

      // --- DETERMINE RISK LEVEL ---
      let riskLevel: RiskLevel;
      if (riskScore >= 70) {
          riskLevel = RiskLevel.CRITICAL;
      } else if (riskScore >= 50) {
          riskLevel = RiskLevel.HIGH;
      } else if (riskScore >= 30) {
          riskLevel = RiskLevel.MEDIUM;
      } else {
          riskLevel = RiskLevel.LOW;
      }

      // --- CREATE THE RISK SCORE RECORD ---
      // Use the invoice creator as the default scorer, or a system user
      const createdById = invoice.createdById; // Or use a dedicated system user ID

      const riskScoreRecord = await this.createRiskScore(tx, {
        invoiceId,
        riskLevel,
        score: riskScore,
        factors,
        calculationMethod,
        meta {
            factorBreakdown: factorDetails,
            calculationTimestamp: new Date().toISOString(),
        },
        notes: `Calculated automatically. Final score: ${riskScore}, Level: ${riskLevel}. Factors: ${factors.join(', ')}`,
        createdById,
      });

      const duration = Date.now() - startTime;
      this.logger.info('Risk calculation completed', {
        invoiceId,
        calculationMethod,
        riskScore: riskScoreRecord.score,
        riskLevel: riskScoreRecord.riskLevel,
        duration,
        factors,
      });

      return riskScoreRecord;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to calculate risk score', {
        invoiceId,
        calculationMethod,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  // --- Helper Methods ---

  private async validateCreateRiskScoreInput(input: CreateRiskScoreInput): Promise<void> {
    const errors: string[] = [];

    if (!input.invoiceId) errors.push('invoiceId is required');
    if (input.riskLevel === undefined) errors.push('riskLevel is required');
    if (input.score === undefined || input.score < 0 || input.score > 100) errors.push('score must be a number between 0 and 100');
    if (!input.factors || !Array.isArray(input.factors)) errors.push('factors array is required');
    if (!input.calculationMethod) errors.push('calculationMethod is required');
    if (!input.createdById) errors.push('createdById is required');

    // Validate risk level enum
    if (!Object.values(RiskLevel).includes(input.riskLevel)) {
        errors.push(`Invalid risk level: ${input.riskLevel}`);
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed for create risk score input', errors);
    }
  }

  private async validateUpdateRiskScoreInput(input: UpdateRiskScoreInput, currentScore: RiskScore & { invoice: Invoice }): Promise<string[]> {
    const errors: string[] = [];

    // Add specific validations for updates here if needed
    // e.g., validate score range
    if (input.score !== undefined && (input.score < 0 || input.score > 100)) {
        errors.push('score must be a number between 0 and 100');
    }

    // Validate risk level enum if provided
    if (input.riskLevel !== undefined && !Object.values(RiskLevel).includes(input.riskLevel)) {
        errors.push(`Invalid risk level: ${input.riskLevel}`);
    }

    return errors;
  }

  private async checkViewRiskScorePermissions(riskScoreId: string, userId: string, organizationId: string): Promise<void> {
    // Example permission check: User must belong to the same organization as the invoice linked to the score
    const scoreWithInvoice = await this.prisma.riskScore.findUnique({
      where: { id: riskScoreId },
      include: { invoice: { select: { organizationId: true } } },
    });

    if (!scoreWithInvoice || scoreWithInvoice.invoice.organizationId !== organizationId) {
      throw new PermissionError('User does not have permission to view this risk score');
    }
  }
}

// Export default instance if using a singleton pattern within the app module
// export default new RiskAssessmentService(prismaClientInstance);
