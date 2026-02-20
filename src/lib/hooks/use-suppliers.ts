"use client";

import { useState, useEffect, useCallback } from "react";
import type { Supplier } from "@prisma/client";

interface UseSuppliersOptions {
  status?: string;
  search?: string;
}

export function useSuppliers(options: UseSuppliersOptions = {}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options.status) params.append("status", options.status);
      if (options.search) params.append("search", options.search);

      const res = await fetch(`/api/suppliers?${params}`);
      const data = await res.json();

      if (data.success) {
        setSuppliers(data.data);
      } else {
        setError(data.error || "Failed to fetch suppliers");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [options.status, options.search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const createSupplier = async (supplierData: unknown) => {
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierData),
      });
      const data = await res.json();

      if (data.success) {
        setSuppliers((prev) => [data.data, ...prev]);
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

  return { suppliers, loading, error, refetch: fetchSuppliers, createSupplier };
}
