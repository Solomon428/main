"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddSupplierDialog } from "@/components/AddSupplierDialog";
import { Building2, Plus, Search, RefreshCw } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  tradingName: string | null;
  vatNumber: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  category: string | null;
  rating: number | null;
  isPreferred: boolean;
  isBlacklisted: boolean;
  riskLevel: string;
  _count: { invoices: number };
}

interface SuppliersResponse {
  suppliers: Supplier[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function SuppliersPage() {
  const [data, setData] = useState<SuppliersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/suppliers?page=${page}&pageSize=20`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to fetch suppliers");
      }
    } catch (err) {
      setError("Failed to fetch suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [page]);

  const getStatusColor = (status: string, isBlacklisted: boolean) => {
    if (isBlacklisted) return "destructive";
    switch (status) {
      case "ACTIVE": return "success";
      case "PENDING_VERIFICATION": return "warning";
      case "SUSPENDED":
      case "BLACKLISTED": return "destructive";
      default: return "secondary";
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "LOW": return "success";
      case "MEDIUM": return "warning";
      case "HIGH":
      case "CRITICAL": return "destructive";
      default: return "secondary";
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Suppliers</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchSuppliers} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Suppliers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>VAT Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Invoices</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No suppliers found
                  </TableCell>
                </TableRow>
              ) : (
                data?.suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{supplier.name}</div>
                          {supplier.tradingName && (
                            <div className="text-xs text-muted-foreground">{supplier.tradingName}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{supplier.vatNumber || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(supplier.status, supplier.isBlacklisted)}>
                        {supplier.isBlacklisted ? "BLACKLISTED" : supplier.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRiskColor(supplier.riskLevel)}>
                        {supplier.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>{supplier.category || "N/A"}</TableCell>
                    <TableCell>{supplier._count?.invoices || 0}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * data.pageSize + 1} to{" "}
                {Math.min(page * data.pageSize, data.total)} of {data.total} suppliers
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPage(page - 1)} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="outline" onClick={() => setPage(page + 1)} disabled={page === data.totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AddSupplierDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => {
          fetchSuppliers();
        }}
      />
    </div>
  );
}
