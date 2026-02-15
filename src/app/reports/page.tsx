"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { BarChart3, FileText, TrendingUp, Shield } from "lucide-react";

interface ReportData {
  approvalEfficiency: {
    approvers: Array<{
      id: string;
      name: string;
      role: string;
      total: number;
      approved: number;
      rejected: number;
      approvalRate: number;
      slaBreachRate: number;
    }>;
    summary: {
      totalApprovals: number;
      avgApprovalRate: number;
      avgSlaBreachRate: number;
    };
  };
  compliance: {
    vatCompliance: {
      compliant: number;
      nonCompliant: number;
      rate: number;
    };
    sanctionViolations: number;
    duplicateRate: number;
    totalProcessed: number;
  };
  trends: Array<{
    month: string;
    invoices: number;
    approved: number;
    rejected: number;
    totalAmount: number;
  }>;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        const [approvalRes, complianceRes, trendsRes] = await Promise.all([
          fetch("/api/reports/approval-efficiency"),
          fetch("/api/reports/compliance"),
          fetch("/api/reports/trends?months=6")
        ]);

        const [approvalData, complianceData, trendsData] = await Promise.all([
          approvalRes.json(),
          complianceRes.json(),
          trendsRes.json()
        ]);

        if (approvalData.success && complianceData.success && trendsData.success) {
          setData({
            approvalEfficiency: approvalData.data,
            compliance: complianceData.data,
            trends: trendsData.data
          });
        } else {
          setError("Failed to fetch report data");
        }
      } catch (err) {
        setError("Failed to fetch reports");
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">{error || "Failed to load reports"}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline">
            <BarChart3 className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Approvals"
          value={(data?.approvalEfficiency?.summary?.totalApprovals ?? 0).toLocaleString()}
          icon={TrendingUp}
        />
        <StatsCard
          title="Avg Approval Rate"
          value={`${(data?.approvalEfficiency?.summary?.avgApprovalRate ?? 0).toFixed(1)}%`}
          icon={TrendingUp}
        />
        <StatsCard
          title="VAT Compliance"
          value={`${(data?.compliance?.vatCompliance?.rate ?? 0).toFixed(1)}%`}
          icon={Shield}
        />
        <StatsCard
          title="Duplicate Rate"
          value={`${(data?.compliance?.duplicateRate ?? 0).toFixed(1)}%`}
          icon={BarChart3}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Approval Efficiency by Approver</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.approvalEfficiency.approvers?.map((approver) => (
                <div key={approver.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{approver.name}</p>
                    <p className="text-xs text-muted-foreground">{approver.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{(approver?.approvalRate ?? 0).toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">
                      {approver.approved}/{approver.total} approved
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">VAT Compliant</span>
                <span className="text-sm font-medium">
                  {(data?.compliance?.vatCompliance?.compliant ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">VAT Non-Compliant</span>
                <span className="text-sm font-medium">
                  {(data?.compliance?.vatCompliance?.nonCompliant ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Sanction Violations</span>
                <span className="text-sm font-medium text-red-600">
                  {(data?.compliance?.sanctionViolations ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Processed</span>
                <span className="text-sm font-medium">
                  {(data?.compliance?.totalProcessed ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.trends?.map((trend) => (
              <div key={trend.month} className="flex items-center justify-between">
                <span className="text-sm font-medium">{trend.month}</span>
                <div className="flex gap-8">
                  <div className="text-right">
                    <p className="text-sm">{trend.invoices} invoices</p>
                    <p className="text-xs text-muted-foreground">
                      {trend.approved} approved, {trend.rejected} rejected
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      R{(trend?.totalAmount ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
