/**
 * AI Categorization Types
 * CreditorFlow Enterprise Invoice Management System
 */

export interface CategoryPrediction {
  category: string;
  confidence: number;
  alternatives: Array<{ category: string; confidence: number }>;
}

export interface GLAccountSuggestion {
  glAccount: string;
  costCenter: string;
  confidence: number;
  reason: string;
}

export interface InvoiceInsights {
  category: string;
  department: string;
  projectCode: string | null;
  costCenter: string;
  glAccount: string;
  confidence: number;
  anomalies: string[];
  recommendations: string[];
}

export interface CategorizationResult {
  invoiceId: string;
  success: boolean;
  category?: string;
  confidence?: number;
  error?: string;
}

export interface BulkCategorizationResult {
  processed: number;
  categorized: number;
  failed: number;
  results: CategorizationResult[];
}

export interface CategoryStats {
  categories: Array<{
    category: string;
    count: number;
    totalAmount: number;
    avgAmount: number;
  }>;
  total: number;
}

export type InvoiceCategory =
  | "IT_SOFTWARE"
  | "IT_HARDWARE"
  | "UTILITIES"
  | "LOGISTICS"
  | "MAINTENANCE"
  | "CONSULTANCY"
  | "MARKETING"
  | "OFFICE"
  | "COMMUNICATIONS"
  | "INSURANCE"
  | "RENT"
  | "TRAVEL"
  | "TRAINING"
  | "OTHER";
