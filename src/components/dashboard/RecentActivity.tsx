"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/formatters";

interface Activity {
  id: string;
  action: string;
  entityDescription: string;
  user?: {
    name: string;
    email: string;
  };
  createdAt: Date;
  severity: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
      case "ERROR":
        return "destructive";
      case "WARNING":
        return "warning";
      case "INFO":
        return "info";
      default:
        return "secondary";
    }
  };

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start justify-between space-x-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.entityDescription}
                  </p>
                  {activity.user && (
                    <p className="text-xs text-muted-foreground">
                      by {activity.user.name}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={getSeverityColor(activity.severity)}>
                    {activity.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(activity.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
