// ============================================================================
// Approval Workflow Engine
// ============================================================================

import { prisma } from '../db/prisma';
import { ApprovalStatus, ApprovalDecision, ApprovalChainType } from '../domain/enums';

interface WorkflowContext {
  invoiceId: string;
  organizationId: string;
  amount: number;
  currency: string;
  department?: string;
  category?: string;
  requesterId: string;
}

interface ApprovalStep {
  level: number;
  approverId: string;
  approverRole: string;
  isRequired: boolean;
}

interface WorkflowResult {
  success: boolean;
  approvalChainId?: string;
  steps: ApprovalStep[];
  error?: string;
}

/**
 * Determine the appropriate approval chain for an invoice
 */
export async function determineApprovalChain(context: WorkflowContext): Promise<WorkflowResult> {
  try {
    // Find matching approval chains based on criteria
    const chains = await prisma.approvalChain.findMany({
      where: {
        organizationId: context.organizationId,
        isActive: true,
        minAmount: {
          lte: context.amount,
        },
        OR: [
          { maxAmount: null },
          { maxAmount: { gte: context.amount } },
        ],
      },
      orderBy: { priority: 'desc' },
    });

    // Find the best matching chain
    const matchingChain = chains.find((chain: {
      department: string | null;
      category: string | null;
      levels: unknown;
      id: string;
      priority: number;
    }) => {
      if (context.department && chain.department && chain.department !== context.department) {
        return false;
      }
      if (context.category && chain.category && chain.category !== context.category) {
        return false;
      }
      return true;
    });

    if (!matchingChain) {
      return {
        success: false,
        steps: [],
        error: 'No matching approval chain found for this invoice',
      };
    }

    // Parse approval levels from chain configuration
    const levels = matchingChain.levels as Array<{
      level: number;
      approverRole?: string;
      specificApproverId?: string;
      isRequired: boolean;
    }>;

    const steps: ApprovalStep[] = levels.map((level, index) => ({
      level: level.level || index + 1,
      approverId: level.specificApproverId || '',
      approverRole: level.approverRole || '',
      isRequired: level.isRequired !== false,
    }));

    return {
      success: true,
      approvalChainId: matchingChain.id,
      steps,
    };
  } catch (error) {
    return {
      success: false,
      steps: [],
      error: error instanceof Error ? error.message : 'Unknown error determining approval chain',
    };
  }
}

/**
 * Initialize the approval workflow for an invoice
 */
export async function initializeApprovalWorkflow(
  context: WorkflowContext
): Promise<WorkflowResult> {
  const chainResult = await determineApprovalChain(context);

  if (!chainResult.success || !chainResult.approvalChainId) {
    return chainResult;
  }

  try {
    // Create approval records for each step
    const approvals = await Promise.all(
      chainResult.steps.map(async (step, index) => {
        const slaDueDate = new Date();
        slaDueDate.setHours(slaDueDate.getHours() + 24); // Default 24 hour SLA

        return prisma.approval.create({
          data: {
            invoiceId: context.invoiceId,
            approvalChainId: chainResult.approvalChainId,
            approverId: step.approverId,
            level: step.level,
            sequence: index + 1,
            status: index === 0 ? ApprovalStatus.PENDING : ApprovalStatus.PENDING,
            slaDueDate,
          },
        });
      })
    );

    // Update invoice status
    await prisma.invoice.update({
      where: { id: context.invoiceId },
      data: {
        status: 'PENDING_APPROVAL',
        currentApproverId: approvals[0]?.approverId || null,
      },
    });

    return {
      success: true,
      approvalChainId: chainResult.approvalChainId,
      steps: chainResult.steps,
    };
  } catch (error) {
    return {
      success: false,
      steps: chainResult.steps,
      error: error instanceof Error ? error.message : 'Failed to initialize approval workflow',
    };
  }
}

/**
 * Process an approval decision and advance workflow if approved
 */
export async function processApprovalDecision(
  approvalId: string,
  decision: ApprovalDecision,
  decidedById: string,
  notes?: string
): Promise<{
  success: boolean;
  nextApprovalId?: string;
  workflowComplete?: boolean;
  error?: string;
}> {
  try {
    // Get the current approval
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        invoice: true,
        approvalChain: true,
      },
    });

    if (!approval) {
      return { success: false, error: 'Approval not found' };
    }

    // Update the approval with the decision
    await prisma.approval.update({
      where: { id: approvalId },
      data: {
        decision,
        decisionNotes: notes,
        status: decision === ApprovalDecision.APPROVED ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        actionedAt: new Date(),
        approvedAt: decision === ApprovalDecision.APPROVED ? new Date() : null,
        rejectedAt: decision === ApprovalDecision.REJECTED ? new Date() : null,
      },
    });

    // If rejected, reject the entire workflow
    if (decision === ApprovalDecision.REJECTED) {
      await prisma.invoice.update({
        where: { id: approval.invoiceId },
        data: {
          status: 'REJECTED',
          currentApproverId: null,
        },
      });

      return {
        success: true,
        workflowComplete: true,
      };
    }

    // Find the next approval in the sequence
    const nextApproval = await prisma.approval.findFirst({
      where: {
        invoiceId: approval.invoiceId,
        status: ApprovalStatus.PENDING,
        sequence: { gt: approval.sequence },
      },
      orderBy: { sequence: 'asc' },
    });

    if (nextApproval) {
      // Activate the next approval
      await prisma.approval.update({
        where: { id: nextApproval.id },
        data: {
          status: ApprovalStatus.PENDING,
          assignedAt: new Date(),
        },
      });

      // Update invoice with new current approver
      await prisma.invoice.update({
        where: { id: approval.invoiceId },
        data: {
          currentApproverId: nextApproval.approverId,
        },
      });

      return {
        success: true,
        nextApprovalId: nextApproval.id,
        workflowComplete: false,
      };
    }

    // No more approvals needed - workflow complete
    await prisma.invoice.update({
      where: { id: approval.invoiceId },
      data: {
        status: 'APPROVED',
        currentApproverId: null,
        approvedAt: new Date(),
      },
    });

    return {
      success: true,
      workflowComplete: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process approval decision',
    };
  }
}

/**
 * Escalate an approval that has breached SLA
 */
export async function escalateApproval(
  approvalId: string,
  reason: string,
  escalateToId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.approval.update({
      where: { id: approvalId },
      data: {
        isEscalated: true,
        escalatedAt: new Date(),
        escalatedReason: reason,
        escalatedToId: escalateToId,
        status: ApprovalStatus.ESCALATED,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to escalate approval',
    };
  }
}

/**
 * Check for approvals that have breached SLA and escalate them
 */
export async function checkSLABreaches(): Promise<{
  escalated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let escalated = 0;

  try {
    const breachedApprovals = await prisma.approval.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        slaBreachDate: {
          lte: new Date(),
        },
        isEscalated: false,
      },
      include: {
        approvalChain: true,
      },
    });

    for (const approval of breachedApprovals) {
      try {
        if (approval.approvalChain?.autoEscalation) {
          // Escalate to next level or admin
          await escalateApproval(
            approval.id,
            'SLA breach - automatic escalation',
            approval.approvalChain?.organizationId || '' // Would typically be a manager or admin ID
          );
          escalated++;
        }
      } catch (error) {
        errors.push(`Failed to escalate approval ${approval.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { escalated, errors };
  } catch (error) {
    return {
      escalated,
      errors: [error instanceof Error ? error.message : 'Unknown error checking SLA breaches'],
    };
  }
}

export default {
  determineApprovalChain,
  initializeApprovalWorkflow,
  processApprovalDecision,
  escalateApproval,
  checkSLABreaches,
};
