'use client';

import React from 'react';
import { PieChart, BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface ChartData {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

interface PieChartWidgetProps {
  title: string;
  data: ChartData[];
  isLoading?: boolean;
}

export function PieChartWidget({
  title,
  data,
  isLoading,
}: PieChartWidgetProps) {
  if (isLoading) {
    return <div className="p-6 bg-muted animate-pulse rounded-lg h-64" />;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
    '#f97316',
  ];

  // Calculate percentages and assign colors
  const chartData = data.map((item, index) => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0,
    color: item.color || colors[index % colors.length],
  }));

  // Create conic gradient for pie chart
  let gradientStops = '';
  let currentAngle = 0;

  chartData.forEach((item) => {
    const startAngle = currentAngle;
    const endAngle = currentAngle + (item.percentage / 100) * 360;
    gradientStops += `${item.color} ${startAngle}deg ${endAngle}deg, `;
    currentAngle = endAngle;
  });

  gradientStops = gradientStops.slice(0, -2); // Remove trailing comma

  return (
    <div className="p-6 bg-background border rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">{title}</h3>
      </div>

      <div className="flex items-center gap-6">
        {/* Pie chart */}
        <div
          className="w-32 h-32 rounded-full shrink-0"
          style={{
            background: `conic-gradient(${gradientStops})`,
          }}
        />

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {chartData.slice(0, 5).map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm truncate max-w-[120px]">
                  {item.name}
                </span>
              </div>
              <span className="text-sm font-medium">
                {item.percentage?.toFixed(1)}%
              </span>
            </div>
          ))}
          {chartData.length > 5 && (
            <p className="text-xs text-muted-foreground">
              +{chartData.length - 5} more
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface BarChartWidgetProps {
  title: string;
  data: Array<{
    label: string;
    value: number;
    secondary?: number;
  }>;
  valuePrefix?: string;
  showSecondary?: boolean;
  isLoading?: boolean;
}

export function BarChartWidget({
  title,
  data,
  valuePrefix = '',
  showSecondary = false,
  isLoading,
}: BarChartWidgetProps) {
  if (isLoading) {
    return <div className="p-6 bg-muted animate-pulse rounded-lg h-64" />;
  }

  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="p-6 bg-background border rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">{title}</h3>
      </div>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm truncate max-w-[150px]">
                {item.label}
              </span>
              <span className="text-sm font-medium">
                {valuePrefix}
                {item.value.toLocaleString()}
              </span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
              {showSecondary && item.secondary && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary/30 rounded-full"
                  style={{ width: `${(item.secondary / maxValue) * 100}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TrendChartWidgetProps {
  title: string;
  data: Array<{
    month: string;
    value: number;
    previousValue?: number;
  }>;
  valueFormatter?: (value: number) => string;
  isLoading?: boolean;
}

export function TrendChartWidget({
  title,
  data,
  valueFormatter = (v) => v.toLocaleString(),
  isLoading,
}: TrendChartWidgetProps) {
  if (isLoading) {
    return <div className="p-6 bg-muted animate-pulse rounded-lg h-64" />;
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  // Calculate path for line chart
  const width = 100;
  const height = 60;
  const padding = 5;

  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y =
      height -
      padding -
      ((item.value - minValue) / range) * (height - 2 * padding);
    return { x, y, value: item.value, month: item.month };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Calculate trend
  const firstValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const trend =
    firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  return (
    <div className="p-6 bg-background border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div
          className={`flex items-center text-sm font-medium ${
            trend >= 0 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
        </div>
      </div>

      {/* Simple line chart */}
      <div className="relative h-32">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={padding}
              y1={padding + ratio * (height - 2 * padding)}
              x2={width - padding}
              y2={padding + ratio * (height - 2 * padding)}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={0.5}
            />
          ))}

          {/* Area fill */}
          <path
            d={`${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
            fill="currentColor"
            fillOpacity={0.1}
            className="text-primary"
          />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-primary"
          />

          {/* Points */}
          {points.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={3}
              fill="currentColor"
              className="text-primary"
            />
          ))}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        {data.slice(0, 6).map((item) => (
          <span key={item.month}>{item.month}</span>
        ))}
      </div>
    </div>
  );
}
