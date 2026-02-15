"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface WorkloadStat {
  id: string;
  name: string;
  role: string;
  currentWorkload: number;
  workloadCapacity: number;
}

interface WorkloadChartProps {
  stats: WorkloadStat[];
}

export function WorkloadChart({ stats }: WorkloadChartProps) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Team Workload</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workload data</p>
          ) : (
            stats.map((stat) => {
              const utilization = Math.round(
                (stat.currentWorkload / Number(stat.workloadCapacity)) * 100
              );
              return (
                <div key={stat.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{stat.name}</p>
                      <p className="text-xs text-muted-foreground">{stat.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{utilization}%</p>
                      <p className="text-xs text-muted-foreground">
                        {stat.currentWorkload} / {stat.workloadCapacity}
                      </p>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        utilization >= 90
                          ? "bg-red-500"
                          : utilization >= 70
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      )}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
