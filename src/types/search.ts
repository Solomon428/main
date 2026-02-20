/**
 * Advanced Search Types
 * CreditorFlow Enterprise Invoice Management System
 */

import { InvoiceStatus, PriorityLevel } from "./sqlite";

export interface SearchFilters {
  query?: string;
  invoiceDateFrom?: Date;
  invoiceDateTo?: Date;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  createdAtFrom?: Date;
  createdAtTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  status?: InvoiceStatus[];
  priority?: PriorityLevel[];
  supplierId?: string[];
  assignedTo?: string[];
  isOverdue?: boolean;
  isDuplicate?: boolean;
  requiresAttention?: boolean;
  hasSLABreach?: boolean;
  currency?: string[];
  category?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface FacetValue {
  value: string;
  count: number;
  label?: string;
}

export interface Facet {
  field: string;
  label: string;
  values: FacetValue[];
}

export interface SearchResult<T> {
  results: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: Facet[];
  appliedFilters: Partial<SearchFilters>;
  searchTime: number;
}

export interface SearchSuggestion {
  type: "invoice" | "supplier" | "keyword";
  value: string;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface QuickSearchResult {
  suggestions: SearchSuggestion[];
  recentSearches: string[];
  popularSearches: string[];
}

export interface ExportOptions {
  format: "csv" | "xlsx" | "pdf";
  columns: string[];
  includeLineItems: boolean;
  includeApprovals: boolean;
  includeAuditLog: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface ExportResult {
  fileName: string;
  fileSize: number;
  recordCount: number;
  downloadUrl: string;
  expiresAt: Date;
}
