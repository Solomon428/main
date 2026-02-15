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
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface Approval {
  id: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    supplierName: string;
    totalAmount: number;
    currency: string;
    status: string;
    dueDate: string;
    priority: string;
  };
  sequenceNumber: number;
  totalStages: number;
  status: string;
  assignedDate: string;
  slaHours: number;
  isWithinSLA: boolean;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchApprovals() {
      try {
        const response = await fetch(`/api/approvals/pending`);
        const result = await response.json();

        if (result.success) {
          setApprovals(result.data.approvals);
        } else {
          setError(result.error || "Failed to fetch approvals");
        }
      } catch (err) {
        setError("Failed to fetch approvals");
      } finally {
        setLoading(false);
      }
    }

    fetchApprovals();
  }, []);

  const handleApprove = async (approvalId: string) => {
    try {
      const response = await fetch(`/api/approvals/${approvalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "APPROVE",
          comments: "Approved from approvals page",
        }),
      });

      const result = await response.json();
      if (result.success) {
        setApprovals(approvals.filter((a) => a.id !== approvalId));
      }
    } catch (err) {
      console.error("Failed to approve:", err);
    }
  };

  const handleReject = async (approvalId: string) => {
    try {
      const response = await fetch(`/api/approvals/${approvalId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "REJECT",
          comments: "Rejected from approvals page",
        }),
      });

      const result = await response.json();
      if (result.success) {
        setApprovals(approvals.filter((a) => a.id !== approvalId));
      }
    } catch (err) {
      console.error("Failed to reject:", err);
    }
  };

  const getSLAColor = (isWithinSLA: boolean) => {
    return isWithinSLA ? "text-green-600" : "text-red-600";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL": return "destructive";
      case "HIGH": return "warning";
      case "MEDIUM": return "default";
      default: return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Pending Approvals</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approvals Requiring Your Action</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No pending approvals
                  </TableCell>
                </TableRow>
              ) : (
                approvals.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell className="font-medium">
                      {approval.invoice?.invoiceNumber || "N/A"}
                    </TableCell>
                    <TableCell>{approval.invoice?.supplierName || "Unknown"}</TableCell>
                    <TableCell>
                      {formatCurrency(
                        approval.invoice?.totalAmount || 0,
                        approval.invoice?.currency || "ZAR"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(approval.invoice?.priority || "MEDIUM")}>
                        {approval.invoice?.priority || "MEDIUM"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {approval.sequenceNumber} of {approval.totalStages}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${getSLAColor(approval.isWithinSLA)}`}>
                        <Clock className="h-4 w-4" />
                        {approval.slaHours}h
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(approval.assignedDate)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => handleApprove(approval.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleReject(approval.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
