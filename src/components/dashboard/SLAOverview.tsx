"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  Timer,
} from "lucide-react";

interface WorkloadStat {
  id: string;
  name: string;
  role: string;
  currentWorkload: number;
  workloadCapacity: number;
  utilization: number;
}

interface SLAOverviewData {
  overdueInvoices: number;
  criticalSLA: number;
  workloadStats: WorkloadStat[];
  avgApprovalTime: number;
}

export default function SLAOverview() {
  const [data, setData] = useState<SLAOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSLAData();
  }, []);

  const fetchSLAData = async () => {
    try {
      const response = await fetch("/api/dashboard");
      const result = await response.json();

      if (result.success) {
        const workloadStats = result.data.workloadStats?.map((stat: WorkloadStat) => ({
          ...stat,
          utilization: stat.workloadCapacity > 0
            ? (stat.currentWorkload / stat.workloadCapacity) * 100
            : 0,
        })) || [];

        setData({
          overdueInvoices: result.data.overdueInvoices || 0,
          criticalSLA: result.data.criticalSLA || 0,
          workloadStats,
          avgApprovalTime: result.data.avgApprovalTime || 24,
        });
      }
    } catch (error) {
      console.error("Failed to fetch SLA data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return "bg-red-500";
    if (utilization >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getUtilizationStatus = (utilization: number) => {
    if (utilization >= 90) return "Overloaded";
    if (utilization >= 75) return "Busy";
    if (utilization >= 50) return "Optimal";
    return "Underutilized";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SLA Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          SLA Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* SLA Metrics */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">SLA Metrics</h4>
            
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">Critical SLA Breaches</p>
                  <p className="text-xs text-muted-foreground">Requires immediate action</p>
                </div>
              </div>
              <Badge variant={data.criticalSLA > 0 ? "destructive" : "secondary"}>
                {data.criticalSLA}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                  <Timer className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">Overdue Invoices</p>
                  <p className="text-xs text-muted-foreground">Past due date</p>
                </div>
              </div>
              <Badge variant={data.overdueInvoices > 0 ? "warning" : "secondary"}>
                {data.overdueInvoices}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Avg. Approval Time</p>
                  <p className="text-xs text-muted-foreground">Hours to decision</p>
                </div>
              </div>
              <Badge variant="outline">{data.avgApprovalTime}h</Badge>
            </div>
          </div>

          {/* Workload Distribution */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Workload
            </h4>
            
            <div className="space-y-3">
              {data.workloadStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No workload data available
                </p>
              ) : (
                data.workloadStats.slice(0, 5).map((stat) => (
                  <div key={stat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stat.name}</span>
                      <span className="text-muted-foreground">
                        {stat.currentWorkload}/{stat.workloadCapacity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={stat.utilization}
                        className="flex-1"
                      />
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          stat.utilization >= 90
                            ? "text-red-600 border-red-200"
                            : stat.utilization >= 75
                            ? "text-yellow-600 border-yellow-200"
                            : "text-green-600 border-green-200"
                        }`}
                      >
                        {Math.round(stat.utilization)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getUtilizationStatus(stat.utilization)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
