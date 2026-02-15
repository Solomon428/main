'use client';

import React from 'react';
import { Globe, AlertTriangle, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import { CURRENCY_CONFIG, SupportedCurrency } from '@/types/currency';

interface CurrencyExposure {
  currency: SupportedCurrency;
  amount: number;
  zarEquivalent: number;
  percentage: number;
}

interface CurrencyExposureWidgetProps {
  exposures: CurrencyExposure[];
  totalExposure: number;
  baseCurrency: SupportedCurrency;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  isLoading?: boolean;
}

export function CurrencyExposureWidget({
  exposures,
  totalExposure,
  baseCurrency,
  riskLevel = 'LOW',
  isLoading,
}: CurrencyExposureWidgetProps) {
  if (isLoading) {
    return <div className="p-6 bg-muted animate-pulse rounded-lg h-64" />;
  }

  const riskColors = {
    LOW: 'text-green-600 bg-green-100',
    MEDIUM: 'text-yellow-600 bg-yellow-100',
    HIGH: 'text-red-600 bg-red-100',
  };

  const currencyColors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
  ];

  // Filter out base currency and sort by amount
  const foreignExposures = exposures
    .filter((e) => e.currency !== baseCurrency)
    .sort((a, b) => b.zarEquivalent - a.zarEquivalent);

  const totalForeign = foreignExposures.reduce(
    (sum, e) => sum + e.zarEquivalent,
    0
  );
  const foreignPercentage =
    totalExposure > 0 ? (totalForeign / totalExposure) * 100 : 0;

  return (
    <div className="p-6 bg-background border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Currency Exposure</h3>
        </div>
        <div
          className={`px-2 py-1 rounded text-xs font-medium ${riskColors[riskLevel]}`}
        >
          {riskLevel} Risk
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">Total Exposure</p>
          <p className="text-lg font-bold">
            {formatCurrency(totalExposure, baseCurrency)}
          </p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">Foreign Currency</p>
          <p className="text-lg font-bold">{foreignPercentage.toFixed(1)}%</p>
        </div>
      </div>

      {/* Exposure bar */}
      <div className="mb-4">
        <div className="flex h-4 rounded-full overflow-hidden">
          {exposures.slice(0, 6).map((exposure, index) => (
            <div
              key={exposure.currency}
              className={`${currencyColors[index % currencyColors.length]} transition-all duration-300`}
              style={{ width: `${exposure.percentage}%` }}
              title={`${exposure.currency}: ${exposure.percentage.toFixed(1)}%`}
            />
          ))}
        </div>
      </div>

      {/* Currency breakdown */}
      <div className="space-y-2">
        {exposures.slice(0, 5).map((exposure, index) => (
          <div
            key={exposure.currency}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${currencyColors[index % currencyColors.length]}`}
              />
              <span className="text-sm font-medium">{exposure.currency}</span>
              <span className="text-xs text-muted-foreground">
                {CURRENCY_CONFIG[exposure.currency]?.name || exposure.currency}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {formatCurrency(exposure.zarEquivalent, baseCurrency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {exposure.percentage.toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Warning for high foreign exposure */}
      {foreignPercentage > 30 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              High Foreign Exposure
            </p>
            <p className="text-xs text-yellow-700">
              Consider hedging strategies to mitigate currency risk.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
