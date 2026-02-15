'use client';

import React from 'react';
import { FileText, Building2, ArrowRight } from 'lucide-react';
import {
  CurrencyDisplay,
  StatusBadge,
  DateDisplay,
} from '@/components/shared/CurrencyDisplay';

interface SearchResult {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  totalAmount: number;
  currency: string;
  status: string;
  priority: string;
  invoiceDate: string;
  dueDate: string;
}

interface Facet {
  field: string;
  label: string;
  values: Array<{ value: string; count: number; label?: string }>;
}

interface SearchResultsProps {
  results: SearchResult[];
  facets: Facet[];
  total: number;
  page: number;
  totalPages: number;
  isLoading?: boolean;
  onSelectInvoice: (id: string) => void;
  onPageChange: (page: number) => void;
  onFacetSelect: (field: string, value: string) => void;
}

export function SearchResults({
  results,
  facets,
  total,
  page,
  totalPages,
  isLoading,
  onSelectInvoice,
  onPageChange,
  onFacetSelect,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No results found</h3>
        <p className="mt-2 text-muted-foreground">
          Try adjusting your search or filter criteria
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Facets sidebar */}
      {facets.length > 0 && (
        <div className="w-64 shrink-0 space-y-6">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Filter by
          </h3>
          {facets.map((facet) => (
            <div key={facet.field}>
              <h4 className="font-medium mb-2">{facet.label}</h4>
              <ul className="space-y-1">
                {facet.values.slice(0, 5).map((value) => (
                  <li key={value.value}>
                    <button
                      onClick={() => onFacetSelect(facet.field, value.value)}
                      className="flex items-center justify-between w-full px-2 py-1 text-sm rounded hover:bg-muted transition-colors"
                    >
                      <span>{value.label || value.value}</span>
                      <span className="text-xs text-muted-foreground">
                        ({value.count})
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Results list */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {results.length} of {total} results
          </p>
        </div>

        <div className="space-y-3">
          {results.map((result) => (
            <div
              key={result.id}
              onClick={() => onSelectInvoice(result.id)}
              className="p-4 border rounded-lg hover:border-primary hover:shadow-sm transition-all cursor-pointer bg-background"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">{result.invoiceNumber}</h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span>{result.supplierName}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <CurrencyDisplay
                    amount={result.totalAmount}
                    currency={result.currency as never}
                    size="lg"
                  />
                  <div className="mt-1">
                    <StatusBadge status={result.status} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-muted-foreground">
                <div className="flex gap-4">
                  <span>
                    Invoice: <DateDisplay date={result.invoiceDate} />
                  </span>
                  <span>
                    Due: <DateDisplay date={result.dueDate} />
                  </span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 rounded border disabled:opacity-50 hover:bg-muted transition-colors"
            >
              Previous
            </button>

            <span className="px-4 py-1 text-sm">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border disabled:opacity-50 hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
