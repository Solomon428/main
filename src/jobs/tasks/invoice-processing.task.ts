import { prisma } from '../../lib/prisma';
import { ScheduledTask } from '../../domain/models/ScheduledTask';
import { InvoiceStatus } from '../../domain/enums/InvoiceStatus';
import { info, error } from '../../observability/logger';

/**
 * Process pending invoices - validate, extract data, check duplicates
 */
export async function runTask(
  task: ScheduledTask,
  signal: AbortSignal
): Promise<void> {
  info('Starting invoice processing task', { taskId: task.id });

  const invoices = await prisma.invoices.findMany({
    where: {
      status: InvoiceStatus.PENDING_EXTRACTION,
      processingDeadline: {
        lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due within 24 hours
      },
    },
    take: 100,
  });

  info(`Found ${invoices.length} invoices to process`, { taskId: task.id });

  for (const invoice of invoices) {
    if (signal.aborted) {
      info('Invoice processing task aborted', { taskId: task.id });
      return;
    }

    try {
      // Update status to processing
      await prisma.invoices.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.PROCESSING },
      });

      // TODO: Perform OCR extraction
      // TODO: Validate invoice data
      // TODO: Check for duplicates
      // TODO: Run compliance checks

      // Mark as validated if all checks pass
      await prisma.invoices.update({
        where: { id: invoice.id },
        data: { 
          status: InvoiceStatus.VALIDATED,
          validatedDate: new Date(),
        },
      });

    } catch (err) {
      error(`Failed to process invoice ${invoice.id}`, {
        taskId: task.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });

      // Mark for manual review
      await prisma.invoices.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.UNDER_REVIEW,
          manualReviewRequired: true,
          manualReviewReason: 'Processing failed',
        },
      });
    }
  }

  info('Invoice processing task completed', { taskId: task.id });
}
