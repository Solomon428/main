/**
 * Analytics Types
 * CreditorFlow Enterprise Invoice Management System
 */

export interface SupplierMetric {
  supplierId: string;
  supplierName: string;
  onTimeDeliveryRate: number;
  approvalRate: number;
  avgApprovalTime: number; // in hours
  disputeRate: number;
  qualityScore: number; // 0-100
  totalSpend: number;
  invoiceVolume: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  riskFactors: string[];
  lastUpdated: Date;
}

export interface SpendingPattern {
  period: string; // YYYY-MM format
  totalSpend: number;
  invoiceCount: number;
  avgInvoiceAmount: number;
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

export interface SupplierComparison {
  category: string;
  suppliers: Array<{
    id: string;
    name: string;
    score: number;
    metrics: SupplierMetric;
  }>;
  industryAverage: {
    onTimeDeliveryRate: number;
    approvalRate: number;
    avgApprovalTime: number;
    qualityScore: number;
  };
}

export interface RiskReport {
  highRiskSuppliers: Array<{
    supplier: { id: string; name: string };
    riskLevel: 'HIGH' | 'CRITICAL';
    factors: string[];
    recommendedAction: string;
  }>;
  riskTrends: Array<{
    period: string;
    averageRiskScore: number;
    highRiskCount: number;
  }>;
  mitigationSuggestions: string[];
}

export interface ConsolidationOpportunity {
  category: string;
  currentSupplierCount: number;
  potentialSavings: number;
  recommendedSuppliers: Array<{
    id: string;
    name: string;
    score: number;
    reason: string;
  }>;
}

export interface TrendPoint {
  date: string;
  value: number;
  label?: string;
}

export interface DashboardAnalytics {
  approvalEfficiency: {
    avgTime: number;
    trend: TrendPoint[];
    benchmarkTime: number;
  };
  spendingOverview: {
    thisMonth: number;
    lastMonth: number;
    change: number;
    changePercent: number;
  };
  complianceRate: {
    current: number;
    target: number;
    violations: number;
  };
  slaPerformance: {
    onTime: number;
    breached: number;
    atRisk: number;
  };
}

export interface ReportConfig {
  type: 'approval' | 'spending' | 'compliance' | 'supplier' | 'custom';
  title: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  filters: Record<string, unknown>;
  groupBy?: string[];
  includeCharts: boolean;
  format: 'pdf' | 'xlsx' | 'csv';
}

export interface GeneratedReport {
  id: string;
  config: ReportConfig;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  downloadUrl?: string;
  generatedAt?: Date;
  expiresAt?: Date;
  error?: string;
}
