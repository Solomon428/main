/**
 * Job Queue System for CreditorFlow EMS
 * Redis-based job queue using Bull
 */

import Queue from "bull";
import type { Job, QueueOptions, JobOptions, JobId } from "bull";
import { auditLogger } from "@/lib/utils/audit-logger";
import { EntityType, LogSeverity } from "@/types";

type QueueInstance = InstanceType<typeof Queue>;

export enum JobType {
  PROCESS_PDF = "process_pdf",
  OCR_EXTRACTION = "ocr_extraction",
  COMPLIANCE_CHECK = "compliance_check",
  APPROVAL_WORKFLOW = "approval_workflow",
  NOTIFICATION = "notification",
  REPORT_GENERATION = "report_generation",
  SUPPLIER_RISK_SCORING = "supplier_risk_scoring",
  DATA_CLEANUP = "data_cleanup",
  INVOICE_ARCHIVAL = "invoice_archival",
  AUDIT_LOG_SYNC = "audit_log_sync",
}

export interface JobData {
  type: JobType;
  payload: any;
  userId?: string;
  priority?: JobPriority;
  retryConfig?: RetryConfig;
  metadata?: JobMetadata;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
  jobId: string;
}

export interface JobMetadata {
  invoiceId?: string;
  fileName?: string;
  supplierId?: string;
  batchId?: string;
  correlationId?: string;
  attempt?: number;
}

export enum JobPriority {
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  BACKGROUND = 4,
}

export interface RetryConfig {
  attempts: number;
  backoff: {
    type: "exponential" | "fixed";
    delay: number;
  };
}

export class JobQueue {
  private queues: Map<JobType, QueueInstance>;
  private static instance: JobQueue;

  private constructor() {
    this.queues = new Map();
    this.initializeQueues();
  }

  static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }

  private initializeQueues(): void {
    const queueOptions: QueueOptions = {
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        db: 0,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    };

    Object.values(JobType).forEach((jobType) => {
      const queue = new Queue(jobType, queueOptions);

      queue.on("completed", (job: Job, result: any) => {
        this.handleJobCompleted(job, result);
      });

      queue.on("failed", (job: Job, error: Error) => {
        this.handleJobFailed(job, error);
      });

      queue.on("stalled", (job: Job) => {
        this.handleJobStalled(job);
      });

      queue.on("progress", (job: Job, progress: number) => {
        this.handleJobProgress(job, progress);
      });

      this.queues.set(jobType, queue);
    });

    console.log(`📊 Job queues initialized for ${this.queues.size} job types`);
  }

  async addJob(jobData: JobData): Promise<Job> {
    const queue = this.queues.get(jobData.type);
    if (!queue) {
      throw new Error(`No queue found for job type: ${jobData.type}`);
    }

    const jobOptions: JobOptions = {
      priority: jobData.priority || JobPriority.MEDIUM,
      attempts: jobData.retryConfig?.attempts || 3,
      backoff: jobData.retryConfig?.backoff || {
        type: "exponential",
        delay: 1000,
      },
      delay: 0,
      timeout: this.getTimeoutForJobType(jobData.type),
      removeOnComplete: true,
      removeOnFail: false,
    };

    if (!jobData.metadata) {
      jobData.metadata = {};
    }
    jobData.metadata.correlationId = this.generateCorrelationId();
    jobData.metadata.attempt = 1;

    try {
      const job = await queue.add(jobData, jobOptions);

      await auditLogger.log({
        action: "CREATE",
        entityType: EntityType.SYSTEM,
        entityId: job.id,
        entityDescription: `Job created: ${jobData.type}`,
        severity: LogSeverity.INFO,
        userId: jobData.userId,
        metadata: {
          jobId: job.id,
          jobType: jobData.type,
          priority: jobOptions.priority ?? 2,
          metadata: jobData.metadata ?? undefined,
        },
      });

      console.log(`📥 Job added: ${jobData.type} [${job.id}]`);
      return job;
    } catch (error) {
      console.error(`❌ Failed to add job ${jobData.type}:`, error);
      throw error;
    }
  }

  async addBulkJobs(jobs: JobData[]): Promise<Job[]> {
    const results: Job[] = [];

    for (const jobData of jobs) {
      try {
        const job = await this.addJob(jobData);
        results.push(job);
      } catch (error) {
        console.error(`Failed to add bulk job ${jobData.type}:`, error);
      }
    }

    return results;
  }

  async getJobStatus(jobId: string, jobType: JobType): Promise<JobStatus> {
    const queue = this.queues.get(jobType);
    if (!queue) {
      throw new Error(`No queue found for job type: ${jobType}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const state = await job.getState();

    return {
      jobId,
      type: job.data.type,
      state,
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      data: job.data,
    };
  }

  async retryJob(jobId: string, jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType);
    if (!queue) throw new Error(`No queue found for job type: ${jobType}`);

    const job = await queue.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    await job.retry();
  }

  async cancelJob(jobId: string, jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType);
    if (!queue) throw new Error(`No queue found for job type: ${jobType}`);

    const job = await queue.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    await job.remove();
  }

  async getQueueMetrics(jobType: JobType): Promise<QueueMetrics> {
    const queue = this.queues.get(jobType);
    if (!queue) throw new Error(`No queue found for job type: ${jobType}`);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      jobType,
      waiting,
      active,
      completed,
      failed,
      delayed,
      timestamp: new Date(),
    };
  }

  async cleanupOldJobs(
    jobType: JobType,
    daysToKeep: number = 7,
  ): Promise<void> {
    const queue = this.queues.get(jobType);
    if (!queue) throw new Error(`No queue found for job type: ${jobType}`);

    const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    await queue.clean(cutoff, 1000, "completed");

    const failedCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    await queue.clean(failedCutoff, 100, "failed");
  }

  async pauseQueue(jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType);
    if (!queue) throw new Error(`No queue found for job type: ${jobType}`);
    await queue.pause();
  }

  async resumeQueue(jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType);
    if (!queue) throw new Error(`No queue found for job type: ${jobType}`);
    await queue.resume();
  }

  async drainQueue(jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType);
    if (!queue) throw new Error(`No queue found for job type: ${jobType}`);
    await queue.obliterate({ force: true });
  }

  private async handleJobCompleted(job: Job, result: any): Promise<void> {
    const processingTime =
      job.processedOn && job.finishedOn ? job.finishedOn - job.processedOn : 0;

    await auditLogger.log({
      action: "UPDATE",
      entityType: EntityType.SYSTEM,
      entityId: job.id,
      entityDescription: `Job completed: ${job.data.type}`,
      severity: LogSeverity.INFO,
      userId: job.data.userId,
      metadata: {
        jobId: job.id,
        jobType: job.data.type,
        processingTime,
        attempts: job.attemptsMade,
      },
    });

    console.log(`✅ Job completed: ${job.data.type} [${job.id}]`);
  }

  private async handleJobFailed(job: Job, error: Error): Promise<void> {
    await auditLogger.log({
      action: "UPDATE",
      entityType: EntityType.SYSTEM,
      entityId: job.id,
      entityDescription: `Job failed: ${job.data.type}`,
      severity: LogSeverity.ERROR,
      userId: job.data.userId,
      metadata: {
        jobId: job.id,
        jobType: job.data.type,
        error: error.message,
        attempts: job.attemptsMade,
      },
    });

    console.error(`❌ Job failed: ${job.data.type} [${job.id}]`, error.message);
  }

  private async handleJobStalled(job: Job): Promise<void> {
    await auditLogger.log({
      action: "UPDATE",
      entityType: EntityType.SYSTEM,
      entityId: job.id,
      entityDescription: `Job stalled: ${job.data.type}`,
      severity: LogSeverity.WARNING,
      userId: job.data.userId,
      metadata: { jobId: job.id, jobType: job.data.type },
    });

    console.warn(`⚠️ Job stalled: ${job.data.type} [${job.id}]`);
  }

  private async handleJobProgress(job: Job, progress: number): Promise<void> {
    if (progress % 25 === 0 || progress === 100) {
      await auditLogger.log({
        action: "UPDATE",
        entityType: EntityType.SYSTEM,
        entityId: job.id,
        entityDescription: `Job progress: ${job.data.type}`,
        severity: LogSeverity.INFO,
        userId: job.data.userId,
        metadata: { jobId: job.id, jobType: job.data.type, progress },
      });
    }
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTimeoutForJobType(jobType: JobType): number {
    const timeouts: Record<JobType, number> = {
      [JobType.PROCESS_PDF]: 300000,
      [JobType.OCR_EXTRACTION]: 600000,
      [JobType.COMPLIANCE_CHECK]: 120000,
      [JobType.APPROVAL_WORKFLOW]: 180000,
      [JobType.NOTIFICATION]: 30000,
      [JobType.REPORT_GENERATION]: 300000,
      [JobType.SUPPLIER_RISK_SCORING]: 240000,
      [JobType.DATA_CLEANUP]: 600000,
      [JobType.INVOICE_ARCHIVAL]: 300000,
      [JobType.AUDIT_LOG_SYNC]: 180000,
    };

    return timeouts[jobType] || 120000;
  }

  async shutdown(): Promise<void> {
    console.log("🛑 Shutting down job queues...");
    for (const [, queue] of this.queues) {
      await queue.close();
    }
  }
}

export interface JobStatus {
  jobId: string;
  type: JobType;
  state: string;
  progress: number | object;
  attemptsMade: number;
  failedReason?: string;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  data: JobData;
}

export interface QueueMetrics {
  jobType: JobType;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  timestamp: Date;
}

export const jobQueue = JobQueue.getInstance();
export default JobQueue;
