"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";

interface Supplier {
  id: string;
  name: string;
  invoiceCount: number;
  totalAmount: number;
}

interface TopSuppliersProps {
  suppliers: Supplier[];
}

export function TopSuppliers({ suppliers }: TopSuppliersProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Top Suppliers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No supplier data</p>
          ) : (
            suppliers.map((supplier, index) => (
              <div
                key={supplier.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{supplier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {supplier.invoiceCount} invoices
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatCurrency(supplier.totalAmount)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
