"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

// Local type definition to avoid importing from @prisma/client
interface InvoiceWithSupplier {
  id: string
  invoiceNumber: string
  status: string
  invoiceDate: Date | string
  dueDate: Date | string
  totalAmount: number
  supplier: { name: string } | null
}

interface RecentInvoicesProps {
  invoices: InvoiceWithSupplier[]
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  PAID: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-gray-100 text-gray-500",
}

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Invoices</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/invoices" className="flex items-center">
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No invoices yet</p>
          ) : (
            invoices.slice(0, 5).map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900 truncate">
                      {invoice.invoiceNumber}
                    </p>
                    <Badge
                      variant="secondary"
                      className={statusColors[invoice.status] || "bg-gray-100"}
                    >
                      {invoice.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {invoice.supplier?.name || "Unknown Supplier"} •{" "}
                    {formatDate(invoice.invoiceDate)}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(invoice.totalAmount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Due {formatDate(invoice.dueDate)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
