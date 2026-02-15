"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils/formatters";
import { Clock, CheckCircle, Eye } from "lucide-react";

interface ApprovalItem {
  id: string;
  invoiceId: string;
  invoice?: {
    invoiceNumber: string;
    supplierName: string;
    totalAmount: number;
  };
  assignedDate: string;
  isWithinSLA: boolean;
  slaHours: number;
}

export default function ApprovalQueue() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      // Get user info from cookie or localStorage
      const userStr = localStorage.getItem('user');
      let userId = '';
      
      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user.id;
      }
      
      if (!userId) {
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/approvals/pending?userId=${userId}`);
      const result = await response.json();

      if (result.success) {
        setApprovals(result.data.approvals || []);
      }
    } catch (error) {
      console.error("Failed to fetch pending approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSLAColor = (isWithinSLA: boolean, hoursRemaining: number) => {
    if (!isWithinSLA) return "destructive";
    if (hoursRemaining < 12) return "warning";
    return "success";
  };

  const getSLAText = (isWithinSLA: boolean, hoursRemaining: number) => {
    if (!isWithinSLA) return "BREACHED";
    if (hoursRemaining < 1) return "< 1h left";
    return `${Math.floor(hoursRemaining)}h left`;
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pending Approvals</CardTitle>
        <Badge variant="secondary">{approvals.length} items</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {approvals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="mx-auto h-8 w-8 mb-2 text-green-500" />
              <p>No pending approvals</p>
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            approvals.slice(0, 5).map((approval) => (
              <div
                key={approval.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{getInitials(approval.invoice?.supplierName || "Unknown")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{approval.invoice?.invoiceNumber || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{approval.invoice?.supplierName || "Unknown Supplier"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(approval.invoice?.totalAmount || 0, "ZAR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={getSLAColor(approval.isWithinSLA, approval.slaHours)}
                    className="text-xs"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {getSLAText(approval.isWithinSLA, approval.slaHours)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.location.href = `/approvals?id=${approval.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
          {approvals.length > 5 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = "/approvals"}
            >
              View {approvals.length - 5} more approvals
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
