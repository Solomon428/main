"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import {
  FilePlus,
  CheckCircle,
  UserPlus,
  Settings,
  DollarSign,
  AlertCircle,
  Edit,
  Trash,
} from "lucide-react"

// Local type definition to avoid importing from @prisma/client
interface ActivityWithUser {
  id: string
  action: string
  entityType: string
  entityDescription: string | null
  createdAt: Date | string
  user: { name: string | null; email: string } | null
}

interface ActivityFeedProps {
  activities: ActivityWithUser[]
}

const actionIcons: Record<string, React.ElementType> = {
  CREATE: FilePlus,
  UPDATE: Edit,
  DELETE: Trash,
  APPROVE: CheckCircle,
  REJECT: AlertCircle,
  PAY: DollarSign,
  LOGIN: UserPlus,
  CONFIG_CHANGE: Settings,
}

const actionColors: Record<string, string> = {
  CREATE: "text-green-600 bg-green-50",
  UPDATE: "text-blue-600 bg-blue-50",
  DELETE: "text-red-600 bg-red-50",
  APPROVE: "text-emerald-600 bg-emerald-50",
  REJECT: "text-amber-600 bg-amber-50",
  PAY: "text-purple-600 bg-purple-50",
  LOGIN: "text-gray-600 bg-gray-50",
  CONFIG_CHANGE: "text-slate-600 bg-slate-50",
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {activities.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No recent activity</p>
          ) : (
            activities.map((activity) => {
              const Icon = actionIcons[activity.action] || Edit
              const colorClass = actionColors[activity.action] || "text-gray-600 bg-gray-50"

              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">
                        {activity.user?.name || activity.user?.email || "System"}
                      </span>{" "}
                      {activity.action.toLowerCase().replace(/_/g, " ")}d{" "}
                      {activity.entityType.toLowerCase()}
                      {activity.entityDescription && (
                        <span className="text-gray-500">
                          {" "}
                          - {activity.entityDescription}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
