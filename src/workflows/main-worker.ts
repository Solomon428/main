/**
 * Main Worker Service for CreditorFlow EMS
 * Processes background jobs from the job queue
 */

import { Job } from 'bull';
import { JobType, JobData, JobResult, jobQueue } from '@/lib/job-queue';
import { PDFProcessor } from '@/lib/pdf-processor';
import { OCRProcessor } from '@/lib/pdf-processor';
import { prisma } from '@/lib/database/client';
import { auditLogger } from '@/lib/utils/audit-logger';
import { EntityType, LogSeverity } from '@/types';

// Import services
import { ComplianceService } from '@/services/compliance-service';
import { ApprovalService } from '@/services/approval-service';
import { NotificationService } from '@/services/notification-service';
import { ReportingService } from '@/services/reporting-service';
import { SupplierService } from '@/services/supplier-service';

export class MainWorker {
  private pdfProcessor: PDFProcessor;
  private ocrProcessor: OCRProcessor;
  private complianceService: ComplianceService;
  private approvalService: ApprovalService;
  private notificationService: NotificationService;
  private reportingService: ReportingService;
  private supplierService: SupplierService;
  private isRunning = false;

  constructor() {
    this.pdfProcessor = PDFProcessor.getInstance();
    this.ocrProcessor = new OCRProcessor();
    this.complianceService = new ComplianceService();
    this.approvalService = new ApprovalService();
    this.notificationService = new NotificationService();
    this.reportingService = new ReportingService();
    this.supplierService = new SupplierService();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Worker is already running');
      return;
    }

    console.log('🚀 Starting main worker...');
    this.isRunning = true;

    // Initialize OCR processor
    await this.ocrProcessor.initialize();

    // Start processing jobs
    await this.processJobs();
  }

  private async processJobs(): Promise<void> {
    const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '3');

    // Process PDF jobs
    await this.processPdfJobs(concurrency);

    // Process OCR jobs
    await this.processOcrJobs(concurrency);

    // Process compliance jobs
    await this.processComplianceJobs(concurrency);

    // Process approval workflow jobs
    await this.processApprovalJobs(concurrency);

    // Process notification jobs
    await this.processNotificationJobs(concurrency);

    // Process report generation jobs
    await this.processReportJobs(concurrency);

    // Process supplier risk jobs
    await this.processSupplierRiskJobs(concurrency);

    // Process cleanup jobs
    await this.processCleanupJobs(concurrency);

    // Process archival jobs
    await this.processArchivalJobs(concurrency);

    console.log('✅ All job processors started');
  }

  private async processPdfJobs(concurrency: number): Promise<void> {
    const queue = jobQueue['queues'].get(JobType.PROCESS_PDF);
    if (!queue) return;

    queue.process(
      concurrency,
      async (job: Job<JobData>): Promise<JobResult> => {
        const startTime = Date.now();
        try {
          const { fileBuffer, fileName, userId, options } = job.data.payload;

          console.log(`📄 Processing PDF: ${fileName} [${job.id}]`);

          const result = await this.pdfProcessor.processInvoicePDF(
            Buffer.from(fileBuffer.data || fileBuffer),
            fileName,
            userId,
            options
          );

          // Store processing result
          await prisma.invoices.updateMany({
            where: { invoiceNumber: result.structuredData.invoiceNumber },
            data: {
              processingMetadata: {
                jobId: job.id,
                confidence: result.metadata.confidence,
                strategy: result.metadata.strategy,
                processingTime: result.metadata.processingTime,
              },
            },
          });

          return {
            success: true,
            data: result,
            processingTime: Date.now() - startTime,
            jobId: job.id,
          };
        } catch (error: any) {
          throw new Error(`PDF processing failed: ${error.message}`);
        }
      }
    );
  }

  private async processOcrJobs(concurrency: number): Promise<void> {
    const queue = jobQueue['queues'].get(JobType.OCR_EXTRACTION);
    if (!queue) return;

    queue.process(
      concurrency,
      async (job: Job<JobData>): Promise<JobResult> => {
        const startTime = Date.now();
        try {
          const { imageBuffer, language } = job.data.payload;

          console.log(`🔍 Performing OCR extraction [${job.id}]`);

          const result = await this.ocrProcessor.processPDF(
            Buffer.from(imageBuffer.data || imageBuffer)
          );

          return {
            success: true,
            data: result,
            processingTime: Date.now() - startTime,
            jobId: job.id,
          };
        } catch (error: any) {
          throw new Error(`OCR extraction failed: ${error.message}`);
        }
      }
    );
  }

  private async processComplianceJobs(concurrency: number): Promise<void> {
    const queue = jobQueue['queues'].get(JobType.COMPLIANCE_CHECK);
    if (!queue) return;

    queue.process(
      concurrency,
      async (job: Job<JobData>): Promise<JobResult> => {
        const startTime = Date.now();
        try {
          const { invoiceId, supplierId, userId } = job.data.payload;

          console.log(
            `✅ Running compliance checks for ${invoiceId} [${job.id}]`
          );

          // Get invoice and supplier data
          const invoice = await prisma.invoices.findUnique({
            where: { id: invoiceId },
          });

          const supplier = await prisma.supplier.findUnique({
            where: { id: supplierId },
          });

          if (!invoice || !supplier) {
            throw new Error('Invoice or supplier not found');
          }

          // Run compliance checks
          const complianceResult = await this.complianceService.checkCompliance(
            {
              invoice,
              supplier,
              userId,
            }
          );

          // Update invoice with compliance status
          await prisma.invoices.update({
            where: { id: invoiceId },
            data: {
              vatCompliant: complianceResult.vatCompliant,
              termsCompliant: complianceResult.termsCompliant,
              complianceNotes: complianceResult.notes,
            },
          });

          return {
            success: true,
            data: complianceResult,
            processingTime: Date.now() - startTime,
            jobId: job.id,
          };
        } catch (error: any) {
          throw new Error(`Compliance check failed: ${error.message}`);
        }
      }
    );
  }

  private async processApprovalJobs(concurrency: number): Promise<void> {
    const queue = jobQueue['queues'].get(JobType.APPROVAL_WORKFLOW);
    if (!queue) return;

    queue.process(
      concurrency,
      async (job: Job<JobData>): Promise<JobResult> => {
        const startTime = Date.now();
        try {
          const { invoiceId, userId, action, comments } = job.data.payload;

          console.log(
            `👤 Processing approval workflow for ${invoiceId} [${job.id}]`
          );

          const result = await this.approvalService.processApproval({
            invoiceId,
            userId,
            action,
            comments,
          });

          return {
            success: true,
            data: result,
            processingTime: Date.now() - startTime,
            jobId: job.id,
          };
        } catch (error: any) {
          throw new Error(`Approval workflow failed: ${error.message}`);
        }
      }
    );
  }

  private async processNotificationJobs(concurrency: number): Promise<void> {
    const queue = jobQueue['queues'].get(JobType.NOTIFICATION);
    if (!queue) return;

    queue.process(
      concurrency,
      async (job: Job<JobData>): Promise<JobResult> => {
        const startTime = Date.now();
        try {
          const { type, userId, data } = job.data.payload;

          console.log(`📧 Sending ${type} notification [${job.id}]`);

          let result;
          switch (type) {
            case 'EMAIL':
              result = await this.notificationService.sendEmail(userId, data);
              break;
            case 'IN_APP':
              result = await this.notificationService.createNotification(
                userId,
                data
              );
              break;
            default:
              throw new Error(`Unsupported notification type: ${type}`);
          }

          return {
            success: result.success,
            data: result,
            processingTime: Date.now() - startTime,
            jobId: job.id,
            error: result.error,
          };
        } catch (error: any) {
          throw new Error(`Notification failed: ${error.message}`);
        }
      }
    );
  }

  private async processReportJobs(concurrency: number): Promise<void> {
    const queue = jobQueue['queues'].get(JobType.REPORT_GENERATION);
    if (!queue) return;

    queue.process(
      concurrency,
      async (job: Job<JobData>): Promise<JobResult> => {
        const startTime = Date.now();
        try {
          const { reportType, parameters, userId } = job.data.payload;

          console.log(`📊 Generating ${reportType} report [${job.id}]`);

          const report = await this.reportingService.generateReport({
            type: reportType,
            parameters,
            userId,
          });

          return {
            success: true,
            data: report,
            processingTime: Date.now() - startTime,
            jobId: job.id,
          };
        } catch (error: any) {
          throw new Error(`Report generation failed: ${error.message}`);
        }
      }
    );
  }

  private async processSupplierRiskJobs(concurrency: number): Promise<void> {
    const queue = jobQueue['queues'].get(JobType.SUPPLIER_RISK_SCORING);
    if (!queue) return;

    queue.process(
      concurrency,
      async (job: Job<JobData>): Promise<JobResult> => {
        const startTime = Date.now();
        try {
          const { supplierIds } = job.data.payload;

          console.log(
            `⚠️ Calculating risk scores for ${supplierIds.length} suppliers [${job.id}]`
          );

          const results = [];

          for (const supplierId of supplierIds) {
            const riskScore =
              await this.supplierService.calculateRiskScore(supplierId);

            await prisma.supplier.update({
              where: { id: supplierId },
              data: {
                riskScore: riskScore.score,
                riskLevel: riskScore.level,
              },
            });

            results.push({ supplierId, riskScore: riskScore.score });
          }

          return {
            success: true,
            data: { processedCount: results.length, results },
            processingTime: Date.now() - startTime,
            jobId: job.id,
          };
        } catch (error: any) {
          throw new Error(`Supplier risk scoring failed: ${error.message}`);
        }
      }
    );
  }

  private async processCleanupJobs(concurrency: number): Promise<void> {
    const queue = jobQueue['queues'].get(JobType.DATA_CLEANUP);
    if (!queue) return;

    queue.process(
      concurrency,
      async (job: Job<JobData>): Promise<JobResult> => {
        const startTime = Date.now();
        try {
          const { cleanupType, retentionDays } = job.data.payload;

          console.log(`🧹 Performing ${cleanupType} cleanup [${job.id}]`);

          let cleanedCount = 0;
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

          switch (cleanupType) {
            case 'OLD_INVOICES':
              const result = await prisma.invoices.deleteMany({
                where: {
                  status: 'ARCHIVED',
                  archivedAt: { lt: cutoffDate },
                },
              });
              cleanedCount = result.count;
              break;
            case 'OLD_NOTIFICATIONS':
              const notifResult = await prisma.notifications.deleteMany({
                where: {
                  isRead: true,
                  createdAt: { lt: cutoffDate },
                },
              });
              cleanedCount = notifResult.count;
              break;
            default:
              throw new Error(`Unsupported cleanup type: ${cleanupType}`);
          }

          return {
            success: true,
            data: { cleanupType, cleanedCount },
            processingTime: Date.now() - startTime,
            jobId: job.id,
          };
        } catch (error: any) {
          throw new Error(`Data cleanup failed: ${error.message}`);
        }
      }
    );
  }

  private async processArchivalJobs(concurrency: number): Promise<void> {
    const queue = jobQueue['queues'].get(JobType.INVOICE_ARCHIVAL);
    if (!queue) return;

    queue.process(
      concurrency,
      async (job: Job<JobData>): Promise<JobResult> => {
        const startTime = Date.now();
        try {
          const { invoiceIds } = job.data.payload;

          console.log(`📦 Archiving ${invoiceIds.length} invoices [${job.id}]`);

          await prisma.invoices.updateMany({
            where: { id: { in: invoiceIds } },
            data: {
              status: 'ARCHIVED',
              archivedAt: new Date(),
            },
          });

          return {
            success: true,
            data: { archivedCount: invoiceIds.length },
            processingTime: Date.now() - startTime,
            jobId: job.id,
          };
        } catch (error: any) {
          throw new Error(`Invoice archival failed: ${error.message}`);
        }
      }
    );
  }

  async shutdown(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Shutting down worker...');
    this.isRunning = false;

    await this.ocrProcessor.destroy();
    await this.pdfProcessor.cleanup();
    await jobQueue.shutdown();

    console.log('✅ Worker shut down');
  }
}

// Export singleton instance
let mainWorkerInstance: MainWorker | null = null;

export function getMainWorker(): MainWorker {
  if (!mainWorkerInstance) {
    mainWorkerInstance = new MainWorker();
  }
  return mainWorkerInstance;
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down worker...');
  if (mainWorkerInstance) {
    await mainWorkerInstance.shutdown();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down worker...');
  if (mainWorkerInstance) {
    await mainWorkerInstance.shutdown();
  }
  process.exit(0);
});

export default MainWorker;

