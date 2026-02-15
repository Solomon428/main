'use client';

import React from 'react';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils/formatting';

interface SupplierMetric {
  supplierId: string;
  supplierName: string;
  onTimeDeliveryRate: number;
  approvalRate: number;
  avgApprovalTime: number;
  disputeRate: number;
  qualityScore: number;
  totalSpend: number;
  invoiceVolume: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  riskFactors: string[];
}

interface SupplierScoreCardProps {
  metric: SupplierMetric;
  showDetails?: boolean;
  onViewDetails?: () => void;
}

export function SupplierScoreCard({
  metric,
  showDetails = true,
  onViewDetails,
}: SupplierScoreCardProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'DECLINING':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getGrade = (score: number): { letter: string; color: string } => {
    if (score >= 90)
      return { letter: 'A', color: 'text-green-600 bg-green-100' };
    if (score >= 80) return { letter: 'B', color: 'text-blue-600 bg-blue-100' };
    if (score >= 70)
      return { letter: 'C', color: 'text-yellow-600 bg-yellow-100' };
    if (score >= 60)
      return { letter: 'D', color: 'text-orange-600 bg-orange-100' };
    return { letter: 'F', color: 'text-red-600 bg-red-100' };
  };

  const grade = getGrade(metric.qualityScore);

  return (
    <div className="bg-background border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{metric.supplierName}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                {getTrendIcon(metric.trend)}
                <span>{metric.trend.toLowerCase()}</span>
              </div>
            </div>
          </div>

          {/* Grade badge */}
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center ${grade.color}`}
          >
            <span className="text-2xl font-bold">{grade.letter}</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <MetricItem
          label="On-Time Delivery"
          value={formatPercentage(metric.onTimeDeliveryRate)}
          icon={<Clock className="h-4 w-4" />}
          isGood={metric.onTimeDeliveryRate >= 90}
        />
        <MetricItem
          label="Approval Rate"
          value={formatPercentage(metric.approvalRate)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          isGood={metric.approvalRate >= 95}
        />
        <MetricItem
          label="Avg. Approval Time"
          value={`${metric.avgApprovalTime.toFixed(1)}h`}
          icon={<Clock className="h-4 w-4" />}
          isGood={metric.avgApprovalTime <= 24}
        />
        <MetricItem
          label="Dispute Rate"
          value={formatPercentage(metric.disputeRate)}
          icon={<XCircle className="h-4 w-4" />}
          isGood={metric.disputeRate <= 5}
          invertColors
        />
      </div>

      {/* Quality score bar */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">Quality Score</span>
          <span className="font-medium">{metric.qualityScore}/100</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              metric.qualityScore >= 80
                ? 'bg-green-500'
                : metric.qualityScore >= 60
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${metric.qualityScore}%` }}
          />
        </div>
      </div>

      {/* Spending summary */}
      <div className="px-4 pb-4 flex items-center justify-between text-sm">
        <div>
          <span className="text-muted-foreground">Total Spend: </span>
          <span className="font-semibold">
            {formatCurrency(metric.totalSpend)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Invoices: </span>
          <span className="font-medium">{metric.invoiceVolume}</span>
        </div>
      </div>

      {/* Risk factors */}
      {metric.riskFactors.length > 0 && showDetails && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Risk Factors</span>
            </div>
            <ul className="space-y-1">
              {metric.riskFactors.map((factor, i) => (
                <li key={i} className="text-xs text-yellow-700">
                  • {factor}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* View details button */}
      {onViewDetails && (
        <div className="px-4 pb-4">
          <button
            onClick={onViewDetails}
            className="w-full py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors"
          >
            View Full Analytics →
          </button>
        </div>
      )}
    </div>
  );
}

interface MetricItemProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  isGood: boolean;
  invertColors?: boolean;
}

function MetricItem({
  label,
  value,
  icon,
  isGood,
  invertColors = false,
}: MetricItemProps) {
  const goodColor = invertColors ? 'text-red-600' : 'text-green-600';
  const badColor = invertColors ? 'text-green-600' : 'text-red-600';

  return (
    <div className="flex items-center gap-2">
      <div className={`${isGood ? 'text-green-500' : 'text-muted-foreground'}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-medium ${isGood ? goodColor : badColor}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
