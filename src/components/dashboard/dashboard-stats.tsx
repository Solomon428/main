"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface DashboardStatsProps {
  totalPayables: number
  overdueAmount: number
  pendingApproval: number
  paidThisMonth: number
}

export function DashboardStats({
  totalPayables,
  overdueAmount,
  pendingApproval,
  paidThisMonth,
}: DashboardStatsProps) {
  const stats = [
    {
      title: "Total Payables",
      value: totalPayables,
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: "+12%",
      trendUp: true,
    },
    {
      title: "Overdue Amount",
      value: overdueAmount,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      trend: "-5%",
      trendUp: false,
      alert: Number(overdueAmount) > 0,
    },
    {
      title: "Pending Approval",
      value: pendingApproval,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      suffix: " invoices",
    },
    {
      title: "Paid This Month",
      value: paidThisMonth,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: "+8%",
      trendUp: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className={stat.alert ? "border-red-300" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <div className={`p-2 ${stat.bgColor} rounded-lg`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {typeof stat.value === "number" && stat.suffix
                ? `${stat.value}${stat.suffix}`
                : formatCurrency(stat.value)}
            </div>
            {stat.trend && (
              <div className="flex items-center mt-1">
                {stat.trendUp ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span
                  className={`text-xs ${
                    stat.trendUp ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {stat.trend} from last month
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
