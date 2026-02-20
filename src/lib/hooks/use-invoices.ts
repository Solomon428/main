"use client";

import { useState, useEffect, useCallback } from "react";
import type { InvoiceWithSupplier } from "@/types";

interface UseInvoicesOptions {
  status?: string;
  supplierId?: string;
  search?: string;
}

export function useInvoices(options: UseInvoicesOptions = {}) {
  const [invoices, setInvoices] = useState<InvoiceWithSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options.status) params.append("status", options.status);
      if (options.supplierId) params.append("supplierId", options.supplierId);
      if (options.search) params.append("search", options.search);

      const res = await fetch(`/api/invoices?${params}`);
      const data = await res.json();

      if (data.success) {
        setInvoices(data.data);
      } else {
        setError(data.error || "Failed to fetch invoices");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [options.status, options.supplierId, options.search]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const createInvoice = async (invoiceData: unknown) => {
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      });
      const data = await res.json();

      if (data.success) {
        setInvoices((prev) => [data.data, ...prev]);
        return { success: true, data: data.data };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "An error occurred",
      };
    }
  };

  return { invoices, loading, error, refetch: fetchInvoices, createInvoice };
}
