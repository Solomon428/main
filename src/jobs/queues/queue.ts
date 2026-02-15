// ============================================================================
// Job Queue - BullMQ Setup
// ============================================================================

import { info, error } from '../../observability/logger';

// BullMQ types - using any for compatibility when not installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Queue = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Worker = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Job = any;

// Redis connection config
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

// Queue instances
const queues = new Map<string, Queue>();

/**
 * Get or create a queue
 */
export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    // Dynamically import bullmq to avoid errors when not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Queue } = require('bullmq');
    
    const queue = new Queue(name, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    queue.on('error', (err: Error) => {
      error(`Queue ${name} error`, { error: err.message });
    });

    queues.set(name, queue);
  }

  return queues.get(name)!;
}

/**
 * Add a job to a queue
 */
export async function addJob<T>(
  queueName: string,
  jobName: string,
  data: T,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }
): Promise<Job> {
  const queue = getQueue(queueName);
  
  return queue.add(jobName, data, {
    delay: options?.delay,
    priority: options?.priority,
    attempts: options?.attempts,
  });
}

/**
 * Create a worker for a queue
 */
export function createWorker<T>(
  queueName: string,
  processor: (job: Job) => Promise<void>,
  options?: {
    concurrency?: number;
    limiter?: { max: number; duration: number };
  }
): Worker {
  // Dynamically import bullmq to avoid errors when not installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require('bullmq');
  
  const worker = new Worker(
    queueName,
    async (job: Job) => {
      info(`Processing job ${job.id} in queue ${queueName}`, {
        jobName: job.name,
        queue: queueName,
      });
      
      await processor(job);
      
      info(`Completed job ${job.id} in queue ${queueName}`, {
        jobName: job.name,
        queue: queueName,
      });
    },
    {
      connection: redisConnection,
      concurrency: options?.concurrency || 1,
      limiter: options?.limiter,
    }
  );

  worker.on('failed', (job: Job | undefined, err: Error) => {
    error(`Job ${job?.id} failed in queue ${queueName}`, {
      error: err.message,
      jobName: job?.name,
      queue: queueName,
    });
  });

  return worker;
}

/**
 * Queue names
 */
export const QUEUE_NAMES = {
  OCR: 'ocr-queue',
  WEBHOOK: 'webhook-queue',
  NOTIFICATION: 'notification-queue',
  EXPORT: 'export-queue',
  IMPORT: 'import-queue',
} as const;

/**
 * Close all queues
 */
export async function closeQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }
  queues.clear();
}
