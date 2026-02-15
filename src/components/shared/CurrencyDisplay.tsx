'use client';

import React from 'react';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';

interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  showCode?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CurrencyDisplay({
  amount,
  currency = 'ZAR',
  showCode = false,
  className = '',
  size = 'md',
}: CurrencyDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
  };

  const formatted = formatCurrency(amount, currency as never);

  return (
    <span className={`${sizeClasses[size]} ${className}`}>
      {formatted}
      {showCode && currency !== 'ZAR' && (
        <span className="ml-1 text-xs text-muted-foreground">({currency})</span>
      )}
    </span>
  );
}

interface DateDisplayProps {
  date: Date | string;
  showTime?: boolean;
  relative?: boolean;
  className?: string;
}

export function DateDisplay({
  date,
  showTime = false,
  relative = false,
  className = '',
}: DateDisplayProps) {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (relative) {
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return <span className={className}>Today</span>;
    } else if (diffDays === 1) {
      return <span className={className}>Yesterday</span>;
    } else if (diffDays < 7) {
      return <span className={className}>{diffDays} days ago</span>;
    }
  }

  return (
    <span className={className}>
      {formatDate(
        d,
        showTime ? { hour: '2-digit', minute: '2-digit' } : undefined
      )}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'outline';
  className?: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  APPROVED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
  CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300',
  PAID: 'bg-blue-100 text-blue-800 border-blue-300',
  OVERDUE: 'bg-red-100 text-red-800 border-red-300',
  DRAFT: 'bg-gray-100 text-gray-600 border-gray-300',
};

export function StatusBadge({
  status,
  variant = 'default',
  className = '',
}: StatusBadgeProps) {
  const colorClass =
    statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-300';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass} ${className}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  NORMAL: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
  CRITICAL: 'bg-red-200 text-red-800',
};

export function PriorityBadge({
  priority,
  className = '',
}: PriorityBadgeProps) {
  const colorClass = priorityColors[priority] || 'bg-gray-100 text-gray-600';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass} ${className}`}
    >
      {priority}
    </span>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'yellow' | 'red';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  color = 'blue',
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground mt-1">
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
