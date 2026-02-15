'use client';

import React from 'react';
import {
  DollarSign,
  FileText,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface StatsWidgetData {
  totalInvoices: number;
  pendingApproval: number;
  approvedThisMonth: number;
  totalValue: number;
  avgProcessingTime: number;
  trends: {
    invoices: number;
    value: number;
    processingTime: number;
  };
}

interface StatsWidgetProps {
  data: StatsWidgetData;
  isLoading?: boolean;
}

export function StatsWidget({ data, isLoading }: StatsWidgetProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 bg-muted animate-pulse rounded-lg h-24" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Invoices',
      value: data.totalInvoices.toLocaleString(),
      icon: FileText,
      trend: data.trends.invoices,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Pending Approval',
      value: data.pendingApproval.toLocaleString(),
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
    },
    {
      label: 'Total Value',
      value: formatCurrency(data.totalValue),
      icon: DollarSign,
      trend: data.trends.value,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      label: 'Avg. Processing',
      value: `${data.avgProcessingTime.toFixed(1)}h`,
      icon: TrendingUp,
      trend: -data.trends.processingTime, // Negative is good for processing time
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-4 bg-background border rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            {stat.trend !== undefined && (
              <div
                className={`flex items-center text-xs font-medium ${
                  stat.trend >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.trend >= 0 ? '↑' : '↓'} {Math.abs(stat.trend)}%
              </div>
            )}
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface SLAStatusWidgetData {
  onTime: number;
  atRisk: number;
  breached: number;
  avgTimeToApproval: number;
  slaTarget: number;
}

interface SLAStatusWidgetProps {
  data: SLAStatusWidgetData;
  isLoading?: boolean;
}

export function SLAStatusWidget({ data, isLoading }: SLAStatusWidgetProps) {
  if (isLoading) {
    return <div className="p-6 bg-muted animate-pulse rounded-lg h-40" />;
  }

  const total = data.onTime + data.atRisk + data.breached;
  const onTimePercent = total > 0 ? (data.onTime / total) * 100 : 0;

  return (
    <div className="p-6 bg-background border rounded-lg">
      <h3 className="font-semibold mb-4">SLA Performance</h3>

      {/* Progress ring visualization */}
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${onTimePercent * 2.51} 251`}
              className="text-green-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold">
              {onTimePercent.toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">On Time</span>
            </div>
            <span className="font-medium">{data.onTime}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">At Risk</span>
            </div>
            <span className="font-medium">{data.atRisk}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm">Breached</span>
            </div>
            <span className="font-medium">{data.breached}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
        Avg. approval time:{' '}
        <span className="font-medium text-foreground">
          {data.avgTimeToApproval.toFixed(1)}h
        </span>
        <span className="ml-2">(Target: {data.slaTarget}h)</span>
      </div>
    </div>
  );
}
