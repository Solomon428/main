'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Shield, RefreshCw, FileWarning, TrendingUp } from 'lucide-react';

interface RiskStats {
  highRiskInvoices: number;
  mediumRiskInvoices: number;
  criticalRiskSuppliers: number;
  fraudAlerts: number;
  totalInvoicesAnalyzed: number;
  averageFraudScore: number;
}

export default function RiskPage() {
  const [stats, setStats] = useState<RiskStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/risk?type=overview');
      const result = await response.json();
      if (result.success) {
        setStats(result.data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch risk data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Risk Monitor</h2>
          <p className="text-muted-foreground">
            Monitor fraud detection, risk assessments, and compliance alerts
          </p>
        </div>
        <Button variant="outline" onClick={fetchRiskData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Invoices</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.highRiskInvoices || 0}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fraud Alerts</CardTitle>
            <FileWarning className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.fraudAlerts || 0}</div>
            <p className="text-xs text-muted-foreground">Suspicious patterns detected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Fraud Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageFraudScore?.toFixed(1) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Out of 100 (lower is better)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices Analyzed</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalInvoicesAnalyzed || 0}</div>
            <p className="text-xs text-muted-foreground">Total processed with AI</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Critical Risk</span>
                <Badge variant="destructive">High</Badge>
              </div>
              <Progress value={stats?.highRiskInvoices ? (stats.highRiskInvoices / (stats.totalInvoicesAnalyzed || 1)) * 100 : 0} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Medium Risk</span>
                <Badge variant="default">Medium</Badge>
              </div>
              <Progress value={stats?.mediumRiskInvoices ? (stats.mediumRiskInvoices / (stats.totalInvoicesAnalyzed || 1)) * 100 : 0} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Low Risk</span>
                <Badge variant="outline">Low</Badge>
              </div>
              <Progress value={80} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fraud Detection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">AI Fraud Detection</p>
                  <p className="text-sm text-muted-foreground">Real-time analysis</p>
                </div>
                <Badge>Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Pattern Recognition</p>
                  <p className="text-sm text-muted-foreground">Anomaly detection</p>
                </div>
                <Badge>Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Supplier Verification</p>
                  <p className="text-sm text-muted-foreground">VAT & blacklist check</p>
                </div>
                <Badge>Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
