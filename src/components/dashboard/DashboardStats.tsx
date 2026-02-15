"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "./StatsCard";
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  Timer,
  Shield,
  AlertOctagon,
} from "lucide-react";

interface DashboardStatsData {
  totalInvoices: number;
  pendingInvoices: number;
  approvedInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalSuppliers: number;
  totalAmount: number;
  pendingAmount: number;
}

export default function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard");
      const result = await response.json();

      if (result.success && result.data && result.data.stats) {
        setStats(result.data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Invoices"
        value={stats.totalInvoices.toLocaleString()}
        description="All invoices in system"
        icon={FileText}
      />
      <StatsCard
        title="Pending"
        value={stats.pendingInvoices.toLocaleString()}
        description="Awaiting processing"
        icon={Clock}
        trend={{ value: stats.pendingInvoices > 10 ? 15 : -5, isPositive: stats.pendingInvoices <= 10 }}
      />
      <StatsCard
        title="Overdue"
        value={stats.overdueInvoices.toLocaleString()}
        description="Past due date"
        icon={AlertTriangle}
        trend={{ value: stats.overdueInvoices > 0 ? 100 : 0, isPositive: stats.overdueInvoices === 0 }}
      />
      <StatsCard
        title="Approved"
        value={stats.approvedInvoices.toLocaleString()}
        description="Ready for payment"
        icon={CheckCircle}
      />
      <StatsCard
        title="Paid"
        value={stats.paidInvoices.toLocaleString()}
        description="Completed invoices"
        icon={Shield}
      />
      <StatsCard
        title="Suppliers"
        value={stats.totalSuppliers.toLocaleString()}
        description="Active suppliers"
        icon={FileText}
      />
      <StatsCard
        title="Total Value"
        value={`R ${(stats.totalAmount / 1000).toFixed(1)}k`}
        description="All invoice amounts"
        icon={Timer}
      />
      <StatsCard
        title="Pending Value"
        value={`R ${(stats.pendingAmount / 1000).toFixed(1)}k`}
        description="Awaiting approval"
        icon={AlertOctagon}
      />
    </div>
  );
}
