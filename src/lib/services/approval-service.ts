import { BaseService } from "./base-service";

export interface SubmitForApprovalInput {
  invoiceId: string;
  notes?: string;
}

export interface ProcessApprovalInput {
  approvalId: string;
  decision: "APPROVE" | "REJECT" | "ESCALATE";
  notes?: string;
}

export class ApprovalService extends BaseService {
  async submitForApproval({ invoiceId, notes }: SubmitForApprovalInput) {
    const orgId = this.requireOrg();
    const userId = this.requireUser();

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      include: { supplier: true },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (!["PENDING", "REJECTED"].includes(invoice.status)) {
      throw new Error(
        `Invoice cannot be submitted for approval. Current status: ${invoice.status}`,
      );
    }

    const approval = await this.prisma.approval.create({
      data: {
        invoiceId,
        organizationId: orgId,
        status: "PENDING",
        submittedById: userId,
        notes,
      },
    });

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "UNDER_REVIEW",
        updatedById: userId,
      },
    });

    await this.audit("SUBMIT", "Approval", approval.id, { invoiceId, notes });

    return approval;
  }

  async processApproval({ approvalId, decision, notes }: ProcessApprovalInput) {
    const orgId = this.requireOrg();
    const userId = this.requireUser();

    const approval = await this.prisma.approval.findFirst({
      where: { id: approvalId, organizationId: orgId },
      include: { invoice: true },
    });

    if (!approval) {
      throw new Error("Approval not found");
    }

    if (approval.status !== "PENDING") {
      throw new Error(
        `Approval has already been ${approval.status.toLowerCase()}`,
      );
    }

    let newApprovalStatus: string;
    let newInvoiceStatus: string;

    switch (decision) {
      case "APPROVE":
        newApprovalStatus = "APPROVED";
        newInvoiceStatus = "APPROVED";
        break;
      case "REJECT":
        newApprovalStatus = "REJECTED";
        newInvoiceStatus = "REJECTED";
        break;
      case "ESCALATE":
        newApprovalStatus = "ESCALATED";
        newInvoiceStatus = "UNDER_REVIEW";
        break;
      default:
        throw new Error("Invalid decision");
    }

    const updatedApproval = await this.prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: newApprovalStatus,
        approverId: userId,
        decisionDate: new Date(),
        notes: notes || approval.notes,
      },
    });

    await this.prisma.invoice.update({
      where: { id: approval.invoiceId },
      data: {
        status: newInvoiceStatus,
        updatedById: userId,
      },
    });

    await this.audit("PROCESS", "Approval", approvalId, { decision, notes });

    return updatedApproval;
  }

  async findPendingApprovals(page = 1, limit = 20) {
    const orgId = this.requireOrg();

    const [approvals, total] = await Promise.all([
      this.prisma.approval.findMany({
        where: { organizationId: orgId, status: "PENDING" },
        include: {
          invoice: {
            include: {
              supplier: {
                select: { id: true, name: true },
              },
            },
          },
          submittedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.approval.count({
        where: { organizationId: orgId, status: "PENDING" },
      }),
    ]);

    return {
      approvals,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByInvoice(invoiceId: string) {
    const orgId = this.requireOrg();

    return this.prisma.approval.findMany({
      where: { invoiceId, organizationId: orgId },
      include: {
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
        submittedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getStats() {
    const orgId = this.requireOrg();

    const [pendingCount, approvedCount, rejectedCount, escalatedCount] =
      await Promise.all([
        this.prisma.approval.count({
          where: { organizationId: orgId, status: "PENDING" },
        }),
        this.prisma.approval.count({
          where: { organizationId: orgId, status: "APPROVED" },
        }),
        this.prisma.approval.count({
          where: { organizationId: orgId, status: "REJECTED" },
        }),
        this.prisma.approval.count({
          where: { organizationId: orgId, status: "ESCALATED" },
        }),
      ]);

    return {
      pendingCount,
      approvedCount,
      rejectedCount,
      escalatedCount,
      totalCount: pendingCount + approvedCount + rejectedCount + escalatedCount,
    };
  }
}
