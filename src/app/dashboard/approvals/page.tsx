"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { formatCurrency, formatDate, getApprovalStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Approval {
  id: string;
  status: string;
  notes: string | null;
  createdAt: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    supplier: {
      name: string;
    };
  };
  submittedBy: {
    firstName: string;
    lastName: string;
  };
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  async function fetchPendingApprovals() {
    try {
      const res = await fetch("/api/approvals?status=PENDING");
      const data = await res.json();
      if (data.success) {
        setApprovals(data.data);
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(approvalId: string, decision: "APPROVE" | "REJECT") {
    setProcessing(approvalId);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, decision }),
      });
      const data = await res.json();
      if (data.success) {
        setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
      }
    } catch (error) {
      console.error("Error processing approval:", error);
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve invoices awaiting your decision
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Icons.spinner className="h-8 w-8 animate-spin" />
            </div>
          ) : approvals.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Icons.checkCircle className="mx-auto h-12 w-12 mb-4 text-green-500" />
              <p className="text-lg font-medium">No pending approvals</p>
              <p className="text-sm">All invoices have been processed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between border rounded-lg p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {approval.invoice.invoiceNumber}
                      </span>
                      <span className="text-gray-400">|</span>
                      <span>{approval.invoice.supplier.name}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Amount: {formatCurrency(Number(approval.invoice.totalAmount))}
                    </p>
                    <p className="text-xs text-gray-400">
                      Submitted by {approval.submittedBy?.firstName}{" "}
                      {approval.submittedBy?.lastName} on{" "}
                      {formatDate(approval.createdAt)}
                    </p>
                    {approval.notes && (
                      <p className="text-sm text-gray-600 italic">
                        Note: {approval.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDecision(approval.id, "REJECT")}
                      disabled={processing === approval.id}
                      className="text-red-600 hover:bg-red-50"
                    >
                      {processing === approval.id ? (
                        <Icons.spinner className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icons.xCircle className="h-4 w-4 mr-1" />
                      )}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDecision(approval.id, "APPROVE")}
                      disabled={processing === approval.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processing === approval.id ? (
                        <Icons.spinner className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icons.check className="h-4 w-4 mr-1" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
