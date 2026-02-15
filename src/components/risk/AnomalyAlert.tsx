'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface Anomaly {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  details: string;
  score: number;
}

interface AnomalyAlertProps {
  anomalies: Anomaly[];
  maxDisplay?: number;
}

export function AnomalyAlert({ anomalies, maxDisplay = 5 }: AnomalyAlertProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'MEDIUM':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'LOW':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <Badge variant="destructive">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Medium</Badge>;
      case 'LOW':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const getAnomalyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'AMOUNT_OUTLIER': 'Amount Outlier',
      'FREQUENCY_ANOMALY': 'Frequency Anomaly',
      'TIME_ANOMALY': 'Time Anomaly',
      'WEEKEND_INVOICE': 'Weekend Invoice',
      'HOLIDAY_INVOICE': 'Holiday Invoice',
      'BEHAVIOR_CHANGE': 'Behavior Change',
      'DUPLICATE_PATTERN': 'Duplicate Pattern',
      'VAT_ANOMALY': 'VAT Anomaly',
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Anomaly Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <Shield className="h-10 w-10 mx-auto mb-2 text-green-500" />
            <p className="text-sm">No anomalies detected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Anomaly Detection ({anomalies.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {anomalies.slice(0, maxDisplay).map((anomaly, index) => (
            <div 
              key={index}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
            >
              {getSeverityIcon(anomaly.severity)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {getAnomalyTypeLabel(anomaly.type)}
                  </span>
                  {getSeverityBadge(anomaly.severity)}
                </div>
                <p className="text-xs text-gray-600">{anomaly.details}</p>
              </div>
            </div>
          ))}
          {anomalies.length > maxDisplay && (
            <p className="text-xs text-center text-gray-500">
              +{anomalies.length - maxDisplay} more anomalies
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Import Shield icon for the empty state
import { Shield } from 'lucide-react';

export default AnomalyAlert;
