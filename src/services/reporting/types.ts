export enum ReportFormat {
  CSV = "csv",
  EXCEL = "excel",
  PDF = "pdf",
  JSON = "json",
  HTML = "html",
  XML = "xml",
}

export enum ReportType {
  FINANCIAL_SUMMARY = "financial_summary",
  TRANSACTION_HISTORY = "transaction_history",
  COMPLIANCE_AUDIT = "compliance_audit",
  CUSTOMER_ACTIVITY = "customer_activity",
  RISK_EXPOSURE = "risk_exposure",
  SLA_PERFORMANCE = "sla_performance",
  CUSTOM = "custom",
}

export enum ReportStatus {
  PENDING = "pending",
  GENERATING = "generating",
  COMPLETED = "completed",
  FAILED = "failed",
  EXPIRED = "expired",
}

export interface ReportDefinition {
  id: string;
  name: string;
  type: ReportType;
  description?: string;
  parametersSchema: {
    type: "object";
    properties: Record<
      string,
      {
        type: "string" | "number" | "boolean" | "date" | "array";
        format?: "date" | "date-time" | "email" | "uri";
        enum?: string[];
        minimum?: number;
        maximum?: number;
        items?: { type: string };
        required?: boolean;
        description?: string;
      }
    >;
    required?: string[];
  };
  queryTemplate: string;
  schedule?: {
    frequency: "daily" | "weekly" | "monthly" | "quarterly" | "on_demand";
    dayOfWeek?: number;
    dayOfMonth?: number;
    hour: number;
    minute: number;
    timezone: string;
  };
  retentionDays: number;
  accessControl: {
    roles: string[];
    users?: string[];
    departments?: string[];
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportExecution {
  id: string;
  definitionId: string;
  format: ReportFormat;
  parameters: Record<string, unknown>;
  status: ReportStatus;
  initiatedBy: string;
  initiatedAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  outputSizeBytes?: number;
  outputUrl?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ReportDataRow {
  [key: string]: string | number | boolean | Date | null | undefined;
}

export interface ReportData {
  columns: { key: string; label: string; type?: string; format?: string }[];
  rows: ReportDataRow[];
  metadata: {
    totalRows: number;
    reportDate: Date;
    generatedBy: string;
    parameters: Record<string, unknown>;
  };
}

export interface ReportOptions {
  format: ReportFormat;
  orientation?: "portrait" | "landscape";
  margins?: { top: number; bottom: number; left: number; right: number };
  headers?: boolean;
  dateFormat?: string;
  currencySymbol?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface FilterOptions {
  dateRange?: DateRange;
  searchTerm?: string;
  filters?: Record<string, unknown>;
}

export interface ReportQueryOptions extends PaginationOptions, FilterOptions {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ReportSummary {
  totalReports: number;
  completedReports: number;
  failedReports: number;
  pendingReports: number;
  averageGenerationTimeMs: number;
}
