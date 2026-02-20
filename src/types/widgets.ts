/**
 * Dashboard Widgets Types
 * CreditorFlow Enterprise Invoice Management System
 */

export type WidgetType =
  | "stats"
  | "pending"
  | "overdue"
  | "categories"
  | "topSuppliers"
  | "monthlyTrend"
  | "workload"
  | "currencyExposure"
  | "slaStatus"
  | "approvalQueue"
  | "recentActivity";

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  refreshInterval?: number; // seconds
  isVisible: boolean;
  settings?: Record<string, unknown>;
}

export interface StatsWidgetData {
  totalInvoices: number;
  pendingApproval: number;
  approvedThisMonth: number;
  totalValue: number;
  avgProcessingTime: number;
  trends: {
    invoices: number;
    value: number;
    processingTime: number;
  };
}

export interface PendingWidgetData {
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    supplierName: string;
    amount: number;
    dueDate: Date;
    priority: string;
    daysWaiting: number;
  }>;
  total: number;
  urgentCount: number;
}

export interface OverdueWidgetData {
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    supplierName: string;
    amount: number;
    dueDate: Date;
    daysOverdue: number;
  }>;
  total: number;
  totalValue: number;
}

export interface CategoriesWidgetData {
  categories: Array<{
    name: string;
    value: number;
    count: number;
    percentage: number;
    color: string;
  }>;
}

export interface TopSuppliersWidgetData {
  suppliers: Array<{
    id: string;
    name: string;
    totalSpend: number;
    invoiceCount: number;
    avgInvoiceAmount: number;
  }>;
  period: string;
}

export interface MonthlyTrendWidgetData {
  data: Array<{
    month: string;
    invoiceCount: number;
    totalValue: number;
    avgValue: number;
  }>;
}

export interface WorkloadWidgetData {
  approvers: Array<{
    id: string;
    name: string;
    pending: number;
    approved: number;
    rejected: number;
    avgTime: number;
  }>;
}

export interface CurrencyExposureWidgetData {
  exposures: Array<{
    currency: string;
    amount: number;
    zarEquivalent: number;
    percentage: number;
  }>;
  totalExposure: number;
  baseCurrency: string;
}

export interface SLAStatusWidgetData {
  onTime: number;
  atRisk: number;
  breached: number;
  avgTimeToApproval: number;
  slaTarget: number;
}

export interface DashboardLayout {
  userId: string;
  widgets: WidgetConfig[];
  lastModified: Date;
}

export interface WidgetUpdate {
  widgetId: string;
  type: WidgetType;
  data: unknown;
  updatedAt: Date;
}
