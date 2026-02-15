import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';

// ==================== DOMAIN TYPES ====================
export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SENT = 'sent',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  DISPUTED = 'disputed',
  VOIDED = 'voided',
  WRITTEN_OFF = 'written_off'
}

export enum PaymentTerm {
  NET_7 = 'net_7',
  NET_15 = 'net_15',
  NET_30 = 'net_30',
  NET_60 = 'net_60',
  DUE_ON_RECEIPT = 'due_on_receipt',
  CUSTOM = 'custom'
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountPercentage?: number;
  metadata?: Record<string, any>;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  companyId: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  currency: string;
  paymentTerm: PaymentTerm;
  customPaymentDays?: number;
  issueDate?: DateTime;
  dueDate?: DateTime;
  sentDate?: DateTime;
  paidDate?: DateTime;
  approvedBy?: string;
  approvedAt?: DateTime;
  voidedReason?: string;
  voidedAt?: DateTime;
  disputeReason?: string;
  disputeFiledAt?: DateTime;
  meta Record<string, any>;
  createdAt: DateTime;
  updatedAt: DateTime;
  version: number; // For optimistic concurrency
}

export interface InvoiceTransitionEvent {
  type: 'status_change' | 'payment_received' | 'dispute_filed' | 'void_requested';
  fromStatus: InvoiceStatus;
  toStatus: InvoiceStatus;
  triggeredBy: string;
  timestamp: DateTime;
  metadata?: Record<string, any>;
}

export interface InvoiceStateTransition {
  from: InvoiceStatus[];
  to: InvoiceStatus;
  allowedRoles: string[];
  requiresApproval?: boolean;
  validation?: (invoice: Invoice, context: any) => boolean | string;
  sideEffects?: (invoice: Invoice, context: any) => Promise<void>;
}

export interface InvoiceServiceConfig {
  invoiceNumberPrefix: string;
  defaultCurrency: string;
  defaultPaymentTerm: PaymentTerm;
  overdueThresholdDays: number;
  enableDisputeWorkflow: boolean;
  taxCalculationStrategy: 'line_item' | 'total';
  enablePartialPayments: boolean;
}

// ==================== CUSTOM ERRORS ====================
export class InvoiceError extends Error {
  constructor(message: string, public readonly code: string) {
    super(`[INVOICE-${code}] ${message}`);
    this.name = 'InvoiceError';
  }
}

export class InvalidTransitionError extends InvoiceError {
  constructor(from: InvoiceStatus, to: InvoiceStatus, role: string) {
    super(`Transition from ${from} to ${to} not allowed for role ${role}`, 'TRANSITION_ERR');
    this.name = 'InvalidTransitionError';
  }
}

export class ValidationError extends InvoiceError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERR');
    this.name = 'ValidationError';
  }
}

export class ConcurrencyError extends InvoiceError {
  constructor(expectedVersion: number, actualVersion: number) {
    super(`Version mismatch: expected ${expectedVersion}, got ${actualVersion}`, 'CONCURRENCY_ERR');
    this.name = 'ConcurrencyError';
  }
}

// ==================== STATE MACHINE DEFINITION ====================
export class InvoiceStateMachine {
  private readonly transitions: Map<InvoiceStatus, InvoiceStateTransition[]>;
  private readonly stateHistory: Map<string, InvoiceTransitionEvent[]>;

  constructor() {
    this.transitions = new Map();
    this.stateHistory = new Map();
    this.initializeTransitions();
  }

  private initializeTransitions(): void {
    // DRAFT transitions
    this.addTransition({
      from: [InvoiceStatus.DRAFT],
      to: InvoiceStatus.PENDING_APPROVAL,
      allowedRoles: ['accountant', 'manager'],
      validation: (invoice) => invoice.lineItems.length > 0 && invoice.totalAmount > 0
    });
    
    this.addTransition({
      from: [InvoiceStatus.DRAFT],
      to: InvoiceStatus.VOIDED,
      allowedRoles: ['accountant', 'manager', 'customer_support'],
      validation: (_inv, ctx) => !!ctx.reason
    });

    // PENDING_APPROVAL transitions
    this.addTransition({
      from: [InvoiceStatus.PENDING_APPROVAL],
      to: InvoiceStatus.APPROVED,
      allowedRoles: ['finance_manager', 'controller'],
      sideEffects: async (invoice, context) => {
        invoice.approvedBy = context.userId;
        invoice.approvedAt = DateTime.now();
      }
    });
    
    this.addTransition({
      from: [InvoiceStatus.PENDING_APPROVAL],
      to: InvoiceStatus.DRAFT,
      allowedRoles: ['accountant', 'manager']
    });

    // APPROVED transitions
    this.addTransition({
      from: [InvoiceStatus.APPROVED],
      to: InvoiceStatus.SENT,
      allowedRoles: ['accountant', 'billing_specialist'],
      sideEffects: async (invoice) => {
        invoice.sentDate = DateTime.now();
        invoice.dueDate = this.calculateDueDate(invoice);
      }
    });

    // SENT transitions
    this.addTransition({
      from: [InvoiceStatus.SENT],
      to: InvoiceStatus.PARTIALLY_PAID,
      allowedRoles: ['system', 'payment_processor'],
      validation: (invoice, ctx) => {
        const amount = ctx.paymentAmount as number;
        return amount > 0 && amount < invoice.totalAmount;
      }
    });
    
    this.addTransition({
      from: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID],
      to: InvoiceStatus.PAID,
      allowedRoles: ['system', 'payment_processor'],
      validation: (invoice, ctx) => {
        const totalReceived = (ctx.totalReceived as number) || 0;
        return totalReceived >= invoice.totalAmount * 0.99; // 1% tolerance
      },
      sideEffects: async (invoice) => {
        invoice.paidDate = DateTime.now();
      }
    });
    
    this.addTransition({
      from: [InvoiceStatus.SENT],
      to: InvoiceStatus.OVERDUE,
      allowedRoles: ['system'],
      validation: (invoice) => {
        return invoice.dueDate ? DateTime.now() > invoice.dueDate : false;
      }
    });

    // DISPUTE transitions
    this.addTransition({
      from: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE],
      to: InvoiceStatus.DISPUTED,
      allowedRoles: ['customer', 'customer_support'],
      validation: (_inv, ctx) => !!ctx.reason && ctx.reason.length >= 10,
      sideEffects: async (invoice, context) => {
        invoice.disputeReason = context.reason;
        invoice.disputeFiledAt = DateTime.now();
      }
    });
    
    this.addTransition({
      from: [InvoiceStatus.DISPUTED],
      to: InvoiceStatus.SENT,
      allowedRoles: ['finance_manager', 'dispute_resolver'],
      validation: (_inv, ctx) => !!ctx.resolutionNotes
    });
    
    this.addTransition({
      from: [InvoiceStatus.DISPUTED],
      to: InvoiceStatus.VOIDED,
      allowedRoles: ['finance_manager', 'controller'],
      validation: (_inv, ctx) => !!ctx.voidReason
    });

    // VOIDED transitions (terminal)
    this.addTransition({
      from: [
        InvoiceStatus.DRAFT, InvoiceStatus.PENDING_APPROVAL, InvoiceStatus.APPROVED,
        InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE,
        InvoiceStatus.DISPUTED
      ],
      to: InvoiceStatus.VOIDED,
      allowedRoles: ['finance_manager', 'controller'],
      validation: (_inv, ctx) => !!ctx.reason && ctx.reason.length >= 5,
      sideEffects: async (invoice, context) => {
        invoice.voidedReason = context.reason;
        invoice.voidedAt = DateTime.now();
      }
    });

    // WRITTEN_OFF transitions
    this.addTransition({
      from: [InvoiceStatus.OVERDUE, InvoiceStatus.DISPUTED],
      to: InvoiceStatus.WRITTEN_OFF,
      allowedRoles: ['controller', 'cfo'],
      validation: (_inv, ctx) => !!ctx.writeOffReason && ctx.approvalTicketId
    });
  }

  private addTransition(transition: InvoiceStateTransition): void {
    for (const fromStatus of transition.from) {
      if (!this.transitions.has(fromStatus)) {
        this.transitions.set(fromStatus, []);
      }
      this.transitions.get(fromStatus)!.push(transition);
    }
  }

  canTransition(
    currentStatus: InvoiceStatus,
    targetStatus: InvoiceStatus,
    role: string,
    invoice: Invoice,
    context: any = {}
  ): { allowed: boolean; reason?: string } {
    const availableTransitions = this.transitions.get(currentStatus) || [];
    
    const matchingTransition = availableTransitions.find(t => 
      t.to === targetStatus && t.allowedRoles.includes(role)
    );
    
    if (!matchingTransition) {
      return { 
        allowed: false, 
        reason: `No transition defined from ${currentStatus} to ${targetStatus} for role ${role}` 
      };
    }
    
    // Run validation if defined
    if (matchingTransition.validation) {
      const validationResult = matchingTransition.validation(invoice, context);
      if (validationResult !== true) {
        return {
          allowed: false,
          reason: typeof validationResult === 'string' 
            ? validationResult 
            : 'Transition validation failed'
        };
      }
    }
    
    return { allowed: true };
  }

  async executeTransition(
    invoice: Invoice,
    targetStatus: InvoiceStatus,
    userId: string,
    role: string,
    context: any = {}
  ): Promise<InvoiceTransitionEvent> {
    const check = this.canTransition(invoice.status, targetStatus, role, invoice, context);
    if (!check.allowed) {
      throw new InvalidTransitionError(invoice.status, targetStatus, role);
    }
    
    const transition = this.transitions.get(invoice.status)!.find(t => t.to === targetStatus)!;
    
    // Execute side effects before state change
    if (transition.sideEffects) {
      await transition.sideEffects(invoice, { ...context, userId, role });
    }
    
    // Record state change
    const event: InvoiceTransitionEvent = {
      type: 'status_change',
      fromStatus: invoice.status,
      toStatus: targetStatus,
      triggeredBy: userId,
      timestamp: DateTime.now(),
      meta context
    };
    
    // Update invoice
    invoice.status = targetStatus;
    invoice.updatedAt = DateTime.now();
    invoice.version += 1;
    
    // Store in history
    if (!this.stateHistory.has(invoice.id)) {
      this.stateHistory.set(invoice.id, []);
    }
    this.stateHistory.get(invoice.id)!.push(event);
    
    return event;
  }

  private calculateDueDate(invoice: Invoice): DateTime {
    const issueDate = invoice.issueDate || DateTime.now();
    
    switch (invoice.paymentTerm) {
      case PaymentTerm.NET_7:
        return issueDate.plus({ days: 7 });
      case PaymentTerm.NET_15:
        return issueDate.plus({ days: 15 });
      case PaymentTerm.NET_30:
        return issueDate.plus({ days: 30 });
      case PaymentTerm.NET_60:
        return issueDate.plus({ days: 60 });
      case PaymentTerm.DUE_ON_RECEIPT:
        return issueDate;
      case PaymentTerm.CUSTOM:
        return issueDate.plus({ days: invoice.customPaymentDays || 30 });
      default:
        return issueDate.plus({ days: 30 });
    }
  }

  getStateHistory(invoiceId: string): InvoiceTransitionEvent[] {
    return this.stateHistory.get(invoiceId) || [];
  }

  getAllowedTransitions(currentStatus: InvoiceStatus, role: string): InvoiceStatus[] {
    const transitions = this.transitions.get(currentStatus) || [];
    return transitions
      .filter(t => t.allowedRoles.includes(role))
      .map(t => t.to);
  }
}

// ==================== INVOICE SERVICE ====================
export class InvoiceService {
  private readonly stateMachine: InvoiceStateMachine;
  
  constructor(
    private readonly config: InvoiceServiceConfig,
    private readonly repositories: {
      invoiceRepo: {
        save: (invoice: Invoice) => Promise<Invoice>;
        findById: (id: string) => Promise<Invoice | null>;
        findByNumber: (number: string) => Promise<Invoice | null>;
      };
      eventRepo?: {
        saveEvent: (eventId: string, event: InvoiceTransitionEvent, invoiceId: string) => Promise<void>;
      };
    },
    private readonly opts: {
      logger?: (level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: any) => void;
      notificationService?: {
        sendInvoiceSent: (invoice: Invoice) => Promise<void>;
        sendOverdueNotice: (invoice: Invoice) => Promise<void>;
      };
      taxCalculator?: (lineItems: InvoiceLineItem[], strategy: string) => number;
    } = {}
  ) {
    this.stateMachine = new InvoiceStateMachine();
    this.validateConfig(config);
  }

  private validateConfig(config: InvoiceServiceConfig): void {
    if (!config.invoiceNumberPrefix || config.invoiceNumberPrefix.length > 10) {
      throw new ValidationError('Invalid invoiceNumberPrefix');
    }
    if (!['USD', 'EUR', 'GBP', 'JPY'].includes(config.defaultCurrency)) {
      throw new ValidationError('Unsupported default currency');
    }
  }

  async createInvoice(
    customerId: string,
    companyId: string,
    lineItems: InvoiceLineItem[],
    options: {
      paymentTerm?: PaymentTerm;
      customPaymentDays?: number;
      metadata?: Record<string, any>;
      userId: string;
      userRole: string;
    }
  ): Promise<Invoice> {
    this.validateLineItems(lineItems);
    
    const subtotal = this.calculateSubtotal(lineItems);
    const taxTotal = this.calculateTaxTotal(lineItems);
    const discountTotal = this.calculateDiscountTotal(lineItems);
    const totalAmount = subtotal + taxTotal - discountTotal;
    
    if (totalAmount <= 0) {
      throw new ValidationError('Invoice total must be greater than zero');
    }
    
    const invoiceNumber = await this.generateInvoiceNumber(companyId);
    
    const invoice: Invoice = {
      id: uuidv4(),
      invoiceNumber,
      customerId,
      companyId,
      status: InvoiceStatus.DRAFT,
      lineItems,
      subtotal,
      taxTotal,
      discountTotal,
      totalAmount,
      currency: this.config.defaultCurrency,
      paymentTerm: options.paymentTerm || this.config.defaultPaymentTerm,
      customPaymentDays: options.customPaymentDays,
      meta options.metadata || {},
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      version: 1
    };
    
    // Initial state transition to DRAFT is implicit
    await this.repositories.invoiceRepo.save(invoice);
    
    this.opts.logger?.('info', 'Invoice created', { invoiceId: invoice.id, customerId });
    
    return invoice;
  }

  private validateLineItems(lineItems: InvoiceLineItem[]): void {
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      throw new ValidationError('At least one line item required');
    }
    
    for (const item of lineItems) {
      if (!item.description || item.description.trim().length < 3) {
        throw new ValidationError('Line item description required (min 3 chars)');
      }
      if (item.quantity <= 0) {
        throw new ValidationError('Line item quantity must be positive');
      }
      if (item.unitPrice <= 0) {
        throw new ValidationError('Line item unit price must be positive');
      }
      if (item.taxRate !== undefined && (item.taxRate < 0 || item.taxRate > 100)) {
        throw new ValidationError('Tax rate must be between 0 and 100');
      }
      if (item.discountPercentage !== undefined && (item.discountPercentage < 0 || item.discountPercentage > 100)) {
        throw new ValidationError('Discount percentage must be between 0 and 100');
      }
    }
  }

  private calculateSubtotal(lineItems: InvoiceLineItem[]): number {
    return parseFloat(lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0).toFixed(2));
  }

  private calculateTaxTotal(lineItems: InvoiceLineItem[]): number {
    if (this.opts.taxCalculator) {
      return parseFloat(this.opts.taxCalculator(lineItems, this.config.taxCalculationStrategy).toFixed(2));
    }
    
    return parseFloat(lineItems.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const discount = item.discountPercentage ? lineTotal * (item.discountPercentage / 100) : 0;
      const taxableAmount = lineTotal - discount;
      const tax = item.taxRate ? taxableAmount * (item.taxRate / 100) : 0;
      return sum + tax;
    }, 0).toFixed(2));
  }

  private calculateDiscountTotal(lineItems: InvoiceLineItem[]): number {
    return parseFloat(lineItems.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const discount = item.discountPercentage ? lineTotal * (item.discountPercentage / 100) : 0;
      return sum + discount;
    }, 0).toFixed(2));
  }

  private async generateInvoiceNumber(companyId: string): Promise<string> {
    // In production: use atomic counter in database to prevent collisions
    const timestamp = DateTime.now().toFormat('yyMMdd');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${this.config.invoiceNumberPrefix}-${timestamp}-${randomSuffix}`;
  }

  async transitionInvoiceStatus(
    invoiceId: string,
    targetStatus: InvoiceStatus,
    userId: string,
    userRole: string,
    context: any = {}
  ): Promise<Invoice> {
    const invoice = await this.repositories.invoiceRepo.findById(invoiceId);
    if (!invoice) {
      throw new InvoiceError(`Invoice ${invoiceId} not found`, 'NOT_FOUND');
    }
    
    // Optimistic concurrency control
    const originalVersion = invoice.version;
    if (context.expectedVersion && context.expectedVersion !== originalVersion) {
      throw new ConcurrencyError(context.expectedVersion, originalVersion);
    }
    
    // Execute state transition
    const event = await this.stateMachine.executeTransition(
      invoice,
      targetStatus,
      userId,
      userRole,
      context
    );
    
    // Persist updated invoice
    const savedInvoice = await this.repositories.invoiceRepo.save(invoice);
    
    // Persist event
    if (this.repositories.eventRepo) {
      await this.repositories.eventRepo.saveEvent(uuidv4(), event, invoiceId);
    }
    
    // Trigger side effects based on new state
    await this.handlePostTransitionEffects(savedInvoice, event);
    
    this.opts.logger?.('info', 'Invoice status transitioned', {
      invoiceId,
      from: event.fromStatus,
      to: event.toStatus,
      userId
    });
    
    return savedInvoice;
  }

  private async handlePostTransitionEffects(invoice: Invoice, event: InvoiceTransitionEvent): Promise<void> {
    switch (invoice.status) {
      case InvoiceStatus.SENT:
        await this.opts.notificationService?.sendInvoiceSent(invoice);
        break;
      
      case InvoiceStatus.OVERDUE:
        await this.opts.notificationService?.sendOverdueNotice(invoice);
        break;
      
      case InvoiceStatus.PAID:
        // Trigger revenue recognition, accounting entries, etc.
        break;
      
      case InvoiceStatus.VOIDED:
        // Trigger credit memo creation if needed
        break;
    }
  }

  async recordPayment(
    invoiceId: string,
    paymentAmount: number,
    paymentMethod: string,
    transactionId: string,
    appliedAt: DateTime = DateTime.now()
  ): Promise<Invoice> {
    const invoice = await this.repositories.invoiceRepo.findById(invoiceId);
    if (!invoice) throw new InvoiceError(`Invoice ${invoiceId} not found`, 'NOT_FOUND');
    
    if (![InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(invoice.status)) {
      throw new InvoiceError('Payment can only be applied to sent/overdue invoices', 'PAYMENT_ERR');
    }
    
    if (paymentAmount <= 0) {
      throw new ValidationError('Payment amount must be positive');
    }
    
    const remainingBalance = invoice.totalAmount - (invoice.metadata.paymentsTotal || 0);
    if (paymentAmount > remainingBalance + 1.0) { // $1 tolerance for rounding
      throw new ValidationError(`Payment amount exceeds remaining balance of ${remainingBalance}`);
    }
    
    // Determine new status
    let newStatus: InvoiceStatus;
    const newTotalPaid = (invoice.metadata.paymentsTotal || 0) + paymentAmount;
    
    if (newTotalPaid >= invoice.totalAmount * 0.99) {
      newStatus = InvoiceStatus.PAID;
    } else {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    }
    
    // Record payment in metadata (in production: use separate payment table)
    if (!invoice.metadata.payments) invoice.metadata.payments = [];
    invoice.metadata.payments.push({
      id: uuidv4(),
      amount: paymentAmount,
      method: paymentMethod,
      transactionId,
      appliedAt: appliedAt.toISO(),
      createdAt: DateTime.now().toISO()
    });
    
    invoice.metadata.paymentsTotal = newTotalPaid;
    
    // Transition state
    return this.transitionInvoiceStatus(
      invoiceId,
      newStatus,
      'system',
      'payment_processor',
      { paymentAmount, transactionId, appliedAt }
    );
  }

  async markOverdue(invoiceId: string): Promise<Invoice | null> {
    const invoice = await this.repositories.invoiceRepo.findById(invoiceId);
    if (!invoice) return null;
    
    if (invoice.status !== InvoiceStatus.SENT && invoice.status !== InvoiceStatus.PARTIALLY_PAID) {
      return invoice; // Only SENT/PARTIALLY_PAID can become overdue
    }
    
    if (!invoice.dueDate || DateTime.now() <= invoice.dueDate.plus({ days: this.config.overdueThresholdDays })) {
      return invoice; // Not yet overdue based on threshold
    }
    
    return this.transitionInvoiceStatus(
      invoiceId,
      InvoiceStatus.OVERDUE,
      'system',
      'system',
      { reason: 'Auto-marked overdue by scheduler' }
    );
  }

  async getInvoiceWithHistory(invoiceId: string): Promise<{
    invoice: Invoice;
    stateTransitions: InvoiceTransitionEvent[];
    payments: any[];
  }> {
    const invoice = await this.repositories.invoiceRepo.findById(invoiceId);
    if (!invoice) throw new InvoiceError(`Invoice ${invoiceId} not found`, 'NOT_FOUND');
    
    const stateTransitions = this.stateMachine.getStateHistory(invoiceId);
    const payments = invoice.metadata.payments || [];
    
    return { invoice, stateTransitions, payments };
  }

  getAllowedTransitionsForUser(invoiceStatus: InvoiceStatus, userRole: string): InvoiceStatus[] {
    return this.stateMachine.getAllowedTransitions(invoiceStatus, userRole);
  }

  calculateAgingBuckets(invoices: Invoice[]): Record<string, number> {
    const now = DateTime.now();
    const buckets = {
      current: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
      paid: 0
    };
    
    for (const invoice of invoices) {
      if (invoice.status === InvoiceStatus.PAID) {
        buckets.paid += invoice.totalAmount;
        continue;
      }
      
      if (!invoice.dueDate) continue;
      
      const daysOverdue = now.diff(invoice.dueDate, 'days').days;
      
      if (daysOverdue <= 0) {
        buckets.current += invoice.totalAmount;
      } else if (daysOverdue <= 30) {
        buckets['1-30'] += invoice.totalAmount;
      } else if (daysOverdue <= 60) {
        buckets['31-60'] += invoice.totalAmount;
      } else if (daysOverdue <= 90) {
        buckets['61-90'] += invoice.totalAmount;
      } else {
        buckets['90+'] += invoice.totalAmount;
      }
    }
    
    return buckets;
  }
}

// ==================== VALIDATION HELPERS ====================
export function validateInvoice(invoice: unknown): asserts invoice is Invoice {
  if (typeof invoice !== 'object' || invoice === null) {
    throw new ValidationError('Invoice must be an object');
  }
  
  const inv = invoice as Invoice;
  
  if (typeof inv.id !== 'string' || !inv.id) {
    throw new ValidationError('Invoice requires valid id');
  }
  
  if (typeof inv.totalAmount !== 'number' || inv.totalAmount <= 0) {
    throw new ValidationError('Invoice requires valid totalAmount > 0');
  }
  
  if (!Object.values(InvoiceStatus).includes(inv.status)) {
    throw new ValidationError(`Invalid status: ${inv.status}`);
  }
}

// ==================== TYPE GUARDS ====================
export function isInvoice(obj: unknown): obj is Invoice {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'invoiceNumber' in obj &&
    'status' in obj &&
    'totalAmount' in obj
  );
}

// ==================== EXAMPLE USAGE ====================
/*
// Mock repositories for demonstration
const mockInvoiceRepo = {
  async save(invoice: Invoice): Promise<Invoice> {
    console.log('Saved invoice:', invoice.id, invoice.status);
    return invoice;
  },
  async findById(id: string): Promise<Invoice | null> {
    return null; // Implement actual lookup
  },
  async findByNumber(num: string): Promise<Invoice | null> {
    return null;
  }
};

const config: InvoiceServiceConfig = {
  invoiceNumberPrefix: 'INV',
  defaultCurrency: 'USD',
  defaultPaymentTerm: PaymentTerm.NET_30,
  overdueThresholdDays: 1,
  enableDisputeWorkflow: true,
  taxCalculationStrategy: 'line_item',
  enablePartialPayments: true
};

const invoiceService = new InvoiceService(config, { invoiceRepo: mockInvoiceRepo });

// Usage:
// const invoice = await invoiceService.createInvoice('cust-123', 'comp-456', [...lineItems], { userId: 'user-1', userRole: 'accountant' });
// await invoiceService.transitionInvoiceStatus(invoice.id, InvoiceStatus.PENDING_APPROVAL, 'user-1', 'accountant');
// await invoiceService.transitionInvoiceStatus(invoice.id, InvoiceStatus.APPROVED, 'mgr-1', 'finance_manager');
// await invoiceService.transitionInvoiceStatus(invoice.id, InvoiceStatus.SENT, 'user-1', 'billing_specialist');
// await invoiceService.recordPayment(invoice.id, 500.00, 'credit_card', 'txn-789');
*/