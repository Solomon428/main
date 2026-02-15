'use client';

import React from 'react';
import { SupplierScoreCard } from '@/components/suppliers/SupplierScoreCard';
import {
  TrendChartWidget,
  BarChartWidget,
} from '@/components/dashboard/widgets/ChartWidget';

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

interface SpendingPattern {
  period: string;
  totalSpend: number;
  invoiceCount: number;
}

interface SupplierAnalyticsPageProps {
  suppliers: SupplierMetric[];
  spendingTrend: SpendingPattern[];
  topSuppliersBySpend: Array<{ label: string; value: number }>;
  isLoading?: boolean;
}

export default function SupplierAnalyticsPage({
  suppliers,
  spendingTrend,
  topSuppliersBySpend,
  isLoading,
}: SupplierAnalyticsPageProps) {
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Separate suppliers by performance
  const highPerformers = suppliers.filter((s) => s.qualityScore >= 80);
  const needsAttention = suppliers.filter((s) => s.qualityScore < 70);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Supplier Analytics</h1>
          <p className="text-muted-foreground">
            Monitor supplier performance and identify optimization opportunities
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          Export Report
        </button>
      </div>

      {/* Overview charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChartWidget
          title="Monthly Spending Trend"
          data={spendingTrend.map((p) => ({
            month: p.period,
            value: p.totalSpend,
          }))}
        />
        <BarChartWidget
          title="Top Suppliers by Spend"
          data={topSuppliersBySpend}
          valuePrefix="R"
        />
      </div>

      {/* Needs attention */}
      {needsAttention.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full" />
            Needs Attention ({needsAttention.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {needsAttention.map((supplier) => (
              <SupplierScoreCard
                key={supplier.supplierId}
                metric={supplier}
                onViewDetails={() => console.log('View', supplier.supplierId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* High performers */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          Top Performers ({highPerformers.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {highPerformers.slice(0, 6).map((supplier) => (
            <SupplierScoreCard
              key={supplier.supplierId}
              metric={supplier}
              showDetails={false}
              onViewDetails={() => console.log('View', supplier.supplierId)}
            />
          ))}
        </div>
      </div>

      {/* All suppliers table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Suppliers</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Supplier
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">
                  Quality
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">
                  On-Time %
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">
                  Approval %
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">
                  Total Spend
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suppliers.map((supplier) => (
                <tr key={supplier.supplierId} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {supplier.supplierName}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        supplier.qualityScore >= 80
                          ? 'bg-green-100 text-green-700'
                          : supplier.qualityScore >= 60
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {supplier.qualityScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {supplier.onTimeDeliveryRate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    {supplier.approvalRate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    R{supplier.totalSpend.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        supplier.trend === 'IMPROVING'
                          ? 'bg-green-100 text-green-700'
                          : supplier.trend === 'DECLINING'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {supplier.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
