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
        status: "PENDING",
        approverId: userId,
      } as any,
    });

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "UNDER_REVIEW",
        updaterId: userId,
      } as any,
    });

    await this.audit("SUBMIT", "Approval", approval.id, { invoiceId, notes });

    return approval;
  }

  async processApproval({ approvalId, decision, notes }: ProcessApprovalInput) {
    const orgId = this.requireOrg();
    const userId = this.requireUser();

    const approval = await this.prisma.approval.findFirst({
      where: { id: approvalId },
      include: { invoice: true },
    } as any);

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

    const approvalUpdateData: any = {
      status: newApprovalStatus as any,
      approverId: userId,
    };
    
    if (decision === "APPROVE") {
      approvalUpdateData.approvedAt = new Date();
    } else if (decision === "REJECT") {
      approvalUpdateData.rejectedAt = new Date();
    }
    
    if (notes) {
      approvalUpdateData.decisionNotes = notes;
    }

    const updatedApproval = await this.prisma.approval.update({
      where: { id: approvalId },
      data: approvalUpdateData,
    });

    await this.prisma.invoice.update({
      where: { id: approval.invoiceId },
      data: {
        status: newInvoiceStatus as any,
        updaterId: userId,
      },
    });

    await this.audit("PROCESS", "Approval", approvalId, { decision, notes });

    return updatedApproval;
  }

  async findPendingApprovals(page = 1, limit = 20) {
    const orgId = this.requireOrg();

    const [approvals, total] = await Promise.all([
      this.prisma.approval.findMany({
        where: { status: "PENDING" },
        include: {
          invoice: {
            include: {
              supplier: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.approval.count({
        where: { status: "PENDING" },
      }),
    ]);

    const filteredApprovals = approvals.filter(
      (a) => a.invoice?.organizationId === orgId
    );

    return {
      approvals: filteredApprovals,
      total: filteredApprovals.length,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByInvoice(invoiceId: string) {
    return this.prisma.approval.findMany({
      where: { invoiceId },
      include: {
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getStats() {
    const orgId = this.requireOrg();

    const invoiceIds = await this.prisma.invoice.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });
    const invoiceIdList = invoiceIds.map(i => i.id);

    const [pendingCount, approvedCount, rejectedCount, escalatedCount] =
      await Promise.all([
        this.prisma.approval.count({
          where: { invoiceId: { in: invoiceIdList }, status: "PENDING" },
        }),
        this.prisma.approval.count({
          where: { invoiceId: { in: invoiceIdList }, status: "APPROVED" },
        }),
        this.prisma.approval.count({
          where: { invoiceId: { in: invoiceIdList }, status: "REJECTED" },
        }),
        this.prisma.approval.count({
          where: { invoiceId: { in: invoiceIdList }, status: "ESCALATED" },
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

  /**
   * Get approval history for a user (static method)
   */
  static async getApprovalHistory(userId: string, page = 1, pageSize = 20) {
    const prisma = BaseService.getPrisma();
    
    const [approvals, total] = await Promise.all([
      prisma.approval.findMany({
        where: {
          approverId: userId,
        },
        include: {
          invoice: {
            include: {
              supplier: {
                select: { id: true, name: true },
              },
            },
          },
          approver: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.approval.count({
        where: {
          approverId: userId,
        },
      }),
    ]);

    return { approvals, total };
  }

  /**
   * Submit approval decision (static method)
   */
  static async submitDecision(approvalId: string, decision: string, userId: string, notes?: string) {
    const prisma = BaseService.getPrisma();
    
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
    });

    if (!approval) {
      throw new Error("Approval not found");
    }

    let newStatus: "APPROVED" | "REJECTED" | "ESCALATED";
    const updateData: any = {
      approverId: userId,
    };
    
    switch (decision) {
      case "APPROVE":
        newStatus = "APPROVED";
        updateData.approvedAt = new Date();
        break;
      case "REJECT":
        newStatus = "REJECTED";
        updateData.rejectedAt = new Date();
        break;
      case "ESCALATE":
        newStatus = "ESCALATED";
        updateData.escalatedAt = new Date();
        break;
      default:
        throw new Error("Invalid decision");
    }
    
    updateData.status = newStatus;
    if (notes) {
      updateData.decisionNotes = notes;
    }

    return prisma.approval.update({
      where: { id: approvalId },
      data: updateData,
    });
  }
}
