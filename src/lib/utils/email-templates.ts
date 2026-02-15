// Local type definitions to avoid importing from @prisma/client
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  supplier?: {
    name: string;
  } | null;
  supplierName?: string | null;
  invoiceDate: Date | string;
  dueDate: Date | string;
  totalAmount: number;
  priority?: string;
  isUrgent?: boolean;
}

interface UserData {
  name: string;
  email: string;
}

interface ApprovalData {
  id: string;
  status: string;
  level: number;
  comments?: string | null;
  createdAt: Date | string;
  completedAt?: Date | string | null;
}

export class EmailTemplates {
  private static formatCurrency(amount: number): string {
    return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private static formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private static getBaseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px 20px; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 10px 0; }
    .info-box { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .warning-box { background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .critical-box { background-color: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .details-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .details-table th, .details-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
    .details-table th { background-color: #f5f5f5; font-weight: 600; }
    .amount { font-size: 24px; font-weight: 600; color: #667eea; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CreditorFlow</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated message from CreditorFlow Invoice Management System.</p>
      <p>© ${new Date().getFullYear()} Intelli Finance (Makwedini AI Group). All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  static approvalRequired(
    invoice: InvoiceData,
    approver: UserData,
    approval: ApprovalData
  ): EmailTemplate {
    const isUrgent = invoice.priority === 'CRITICAL' || invoice.priority === 'HIGH' || invoice.isUrgent;
    const subject = `Approval Required: Invoice ${invoice.invoiceNumber} - ${this.formatCurrency(Number(invoice.totalAmount))}`;

    const html = this.getBaseTemplate(`
      <h2>Approval Required</h2>
      <p>Hello ${approver.name},</p>
      <p>You have a new invoice requiring your approval:</p>
      
      <div class="info-box">
        <p class="amount">${this.formatCurrency(Number(invoice.totalAmount))}</p>
        <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Supplier:</strong> ${invoice.supplier?.name || invoice.supplierName || 'Unknown Supplier'}</p>
        <p><strong>Invoice Date:</strong> ${this.formatDate(invoice.invoiceDate)}</p>
        <p><strong>Due Date:</strong> ${this.formatDate(invoice.dueDate)}</p>
      </div>

      <p style="text-align: center;">
        <a href="${process.env.NEXTAUTH_URL}/invoices/${invoice.id}" class="button">View Invoice</a>
      </p>

      ${isUrgent ? '<div class="critical-box"><strong>⚠️ URGENT:</strong> This invoice is marked as urgent and requires immediate attention.</div>' : ''}
    `);

    const text = `
Approval Required - CreditorFlow

Hello ${approver.name},

You have a new invoice requiring your approval:

Invoice: ${invoice.invoiceNumber}
Amount: ${this.formatCurrency(Number(invoice.totalAmount))}
Supplier: ${invoice.supplier?.name || invoice.supplierName || 'Unknown Supplier'}
Invoice Date: ${this.formatDate(invoice.invoiceDate)}
Due Date: ${this.formatDate(invoice.dueDate)}

View Invoice: ${process.env.NEXTAUTH_URL}/invoices/${invoice.id}

${isUrgent ? '⚠️ URGENT: This invoice requires immediate attention.' : ''}
    `.trim();

    return { subject, html, text };
  }

  static invoiceApproved(
    invoice: InvoiceData,
    user: UserData,
    approver: UserData
  ): EmailTemplate {
    const subject = `Invoice Approved: ${invoice.invoiceNumber}`;

    const html = this.getBaseTemplate(`
      <h2>Invoice Approved</h2>
      <p>Hello ${user.name},</p>
      <p>Good news! Invoice <strong>${invoice.invoiceNumber}</strong> has been approved and is ready for payment.</p>
      
      <div class="info-box">
        <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Supplier:</strong> ${invoice.supplier?.name || invoice.supplierName || 'Unknown Supplier'}</p>
        <p><strong>Amount:</strong> ${this.formatCurrency(Number(invoice.totalAmount))}</p>
        <p><strong>Approved By:</strong> ${approver.name}</p>
        <p><strong>Approved Date:</strong> ${this.formatDate(new Date())}</p>
      </div>

      <p style="text-align: center;">
        <a href="${process.env.NEXTAUTH_URL}/invoices/${invoice.id}" class="button">View Invoice</a>
      </p>
    `);

    const text = `
Invoice Approved - CreditorFlow

Hello ${user.name},

Invoice ${invoice.invoiceNumber} has been approved and is ready for payment.

Invoice: ${invoice.invoiceNumber}
Supplier: ${invoice.supplier?.name || invoice.supplierName || 'Unknown Supplier'}
Amount: ${this.formatCurrency(Number(invoice.totalAmount))}
Approved By: ${approver.name}
Approved Date: ${this.formatDate(new Date())}

View Invoice: ${process.env.NEXTAUTH_URL}/invoices/${invoice.id}
    `.trim();

    return { subject, html, text };
  }

  static invoiceRejected(
    invoice: InvoiceData,
    user: UserData,
    approver: UserData,
    reason?: string
  ): EmailTemplate {
    const subject = `Invoice Rejected: ${invoice.invoiceNumber}`;

    const html = this.getBaseTemplate(`
      <h2>Invoice Rejected</h2>
      <p>Hello ${user.name},</p>
      <p>Invoice <strong>${invoice.invoiceNumber}</strong> has been rejected.</p>
      
      <div class="warning-box">
        <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Supplier:</strong> ${invoice.supplier?.name || invoice.supplierName || 'Unknown Supplier'}</p>
        <p><strong>Amount:</strong> ${this.formatCurrency(Number(invoice.totalAmount))}</p>
        <p><strong>Rejected By:</strong> ${approver.name}</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>

      <p style="text-align: center;">
        <a href="${process.env.NEXTAUTH_URL}/invoices/${invoice.id}" class="button">View Invoice</a>
      </p>
    `);

    const text = `
Invoice Rejected - CreditorFlow

Hello ${user.name},

Invoice ${invoice.invoiceNumber} has been rejected.

Invoice: ${invoice.invoiceNumber}
Supplier: ${invoice.supplier?.name || invoice.supplierName || 'Unknown Supplier'}
Amount: ${this.formatCurrency(Number(invoice.totalAmount))}
Rejected By: ${approver.name}
${reason ? `Reason: ${reason}` : ''}

View Invoice: ${process.env.NEXTAUTH_URL}/invoices/${invoice.id}
    `.trim();

    return { subject, html, text };
  }

  static slaBreach(
    invoice: InvoiceData,
    manager: UserData
  ): EmailTemplate {
    const subject = `🚨 SLA Breach Alert: Invoice ${invoice.invoiceNumber}`;

    const html = this.getBaseTemplate(`
      <h2>SLA Breach Alert</h2>
      <div class="critical-box">
        <h3>⚠️ Critical Alert</h3>
        <p>Invoice <strong>${invoice.invoiceNumber}</strong> has breached its SLA and requires immediate attention.</p>
      </div>
      
      <table class="details-table">
        <tr><th>Invoice Number</th><td>${invoice.invoiceNumber}</td></tr>
        <tr><th>Supplier</th><td>${invoice.supplier?.name || invoice.supplierName || 'Unknown Supplier'}</td></tr>
        <tr><th>Amount</th><td>${this.formatCurrency(Number(invoice.totalAmount))}</td></tr>
        <tr><th>Due Date</th><td>${this.formatDate(invoice.dueDate)}</td></tr>
      </table>

      <p style="text-align: center;">
        <a href="${process.env.NEXTAUTH_URL}/invoices/${invoice.id}" class="button">Take Action</a>
      </p>
    `);

    const text = `
🚨 SLA BREACH ALERT - CreditorFlow

Invoice ${invoice.invoiceNumber} has breached its SLA and requires immediate attention.

Invoice: ${invoice.invoiceNumber}
Supplier: ${invoice.supplier?.name || invoice.supplierName || 'Unknown Supplier'}
Amount: ${this.formatCurrency(Number(invoice.totalAmount))}
Due Date: ${this.formatDate(invoice.dueDate)}

Take Action: ${process.env.NEXTAUTH_URL}/invoices/${invoice.id}
    `.trim();

    return { subject, html, text };
  }

  static fraudAlert(
    invoice: InvoiceData,
    user: UserData,
    fraudScore: number
  ): EmailTemplate {
    const subject = `🚨 Fraud Alert: Invoice ${invoice.invoiceNumber} (Score: ${fraudScore})`;

    const html = this.getBaseTemplate(`
      <h2>Fraud Alert</h2>
      <div class="critical-box">
        <h3>⚠️ High Fraud Score Detected</h3>
        <p>A potentially fraudulent invoice has been detected and requires immediate review.</p>
      </div>
      
      <table class="details-table">
        <tr><th>Invoice Number</th><td>${invoice.invoiceNumber}</td></tr>
        <tr><th>Supplier</th><td>${invoice.supplier?.name || invoice.supplierName || 'Unknown Supplier'}</td></tr>
        <tr><th>Amount</th><td>${this.formatCurrency(Number(invoice.totalAmount))}</td></tr>
        <tr><th>Fraud Score</th><td style="color: #f44336; font-weight: bold;">${fraudScore}/100</td></tr>
      </table>

      <p style="text-align: center;">
        <a href="${process.env.NEXTAUTH_URL}/invoices/${invoice.id}" class="button">Review Invoice</a>
      </p>
    `);

    const text = `
🚨 FRAUD ALERT - CreditorFlow

A potentially fraudulent invoice has been detected and requires immediate review.

Invoice: ${invoice.invoiceNumber}
Supplier: ${invoice.supplier?.name || invoice.supplierName || 'Unknown Supplier'}
Amount: ${this.formatCurrency(Number(invoice.totalAmount))}
Fraud Score: ${fraudScore}/100

Review Invoice: ${process.env.NEXTAUTH_URL}/invoices/${invoice.id}
    `.trim();

    return { subject, html, text };
  }

  static paymentReminder(
    invoice: InvoiceData,
    user: UserData,
    daysOverdue: number
  ): EmailTemplate {
    const isOverdue = daysOverdue > 0;
    const subject = isOverdue 
      ? `🚨 Payment Overdue: Invoice ${invoice.invoiceNumber} (${daysOverdue} days)`
      : `⏰ Payment Due Soon: Invoice ${invoice.invoiceNumber}`;

    const html = this.getBaseTemplate(`
      <h2>${isOverdue ? 'Payment Overdue' : 'Payment Due Soon'}</h2>
      ${isOverdue 
        ? `<div class="critical-box"><h3>⚠️ Payment is ${daysOverdue} days overdue</h3></div>`
        : `<div class="warning-box"><h3>⏰ Payment is due soon</h3></div>`
      }
      
      <div class="info-box">
        <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Supplier:</strong> ${invoice.supplier?.name || invoice.supplierName || 'Unknown Supplier'}</p>
        <p><strong>Amount:</strong> ${this.formatCurrency(Number(invoice.totalAmount))}</p>
        <p><strong>Due Date:</strong> ${this.formatDate(invoice.dueDate)}</p>
        ${isOverdue ? `<p><strong>Days Overdue:</strong> ${daysOverdue}</p>` : ''}
      </div>

      <p style="text-align: center;">
        <a href="${process.env.NEXTAUTH_URL}/invoices/${invoice.id}" class="button">View Invoice</a>
      </p>
    `);

    const text = `
${isOverdue ? '🚨 PAYMENT OVERDUE' : '⏰ PAYMENT DUE SOON'} - CreditorFlow

Invoice: ${invoice.invoiceNumber}
Supplier: ${invoice.supplier?.name || invoice.supplierName || 'Unknown Supplier'}
Amount: ${this.formatCurrency(Number(invoice.totalAmount))}
Due Date: ${this.formatDate(invoice.dueDate)}
${isOverdue ? `Days Overdue: ${daysOverdue}` : ''}

View Invoice: ${process.env.NEXTAUTH_URL}/invoices/${invoice.id}
    `.trim();

    return { subject, html, text };
  }
}

export default EmailTemplates;
