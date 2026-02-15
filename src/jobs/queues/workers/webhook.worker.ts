import { Job } from 'bullmq';
import { createWorker, QUEUE_NAMES } from '../queue';
import { info, error } from '../../../observability/logger';

interface WebhookJob {
  webhookId: string;
  url: string;
  payload: Record<string, unknown>;
  secret?: string;
  attempts?: number;
}

/**
 * Process webhook delivery jobs
 */
async function processWebhookJob(job: Job<WebhookJob>): Promise<void> {
  const { url, payload, secret } = job.data;
  const attempt = job.attemptsMade + 1;

  info(`Sending webhook to ${url}`, { jobId: job.id, attempt });

  try {
    // Generate signature if secret provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (secret) {
      // In production, implement proper HMAC signature
      headers['X-Webhook-Signature'] = 'sha256=' + generateSignature(payload, secret);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    info(`Webhook delivered successfully to ${url}`, {
      jobId: job.id,
      status: response.status,
    });

  } catch (err) {
    error(`Webhook delivery failed to ${url}`, {
      jobId: job.id,
      attempt,
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    // Throw to trigger retry
    throw err;
  }
}

/**
 * Generate HMAC signature for webhook
 */
function generateSignature(payload: Record<string, unknown>, secret: string): string {
  // In production, use crypto module for HMAC
  // const crypto = require('crypto');
  // return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  return 'placeholder-signature';
}

/**
 * Create and export the webhook worker
 */
export const webhookWorker = createWorker<WebhookJob>(
  QUEUE_NAMES.WEBHOOK,
  processWebhookJob,
  {
    concurrency: 5,
    limiter: { max: 10, duration: 1000 }, // 10 webhooks per second
  }
);

export default webhookWorker;
