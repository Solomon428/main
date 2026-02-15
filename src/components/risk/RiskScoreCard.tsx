'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Shield, TrendingUp, TrendingDown } from 'lucide-react';

interface RiskScoreCardProps {
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors?: Array<{
    name: string;
    score: number;
    weight: number;
  }>;
  showDetails?: boolean;
}

export function RiskScoreCard({ 
  score, 
  riskLevel, 
  factors = [],
  showDetails = true 
}: RiskScoreCardProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'bg-green-500 text-green-700';
      case 'MEDIUM':
        return 'bg-yellow-500 text-yellow-700';
      case 'HIGH':
        return 'bg-orange-500 text-orange-700';
      case 'CRITICAL':
        return 'bg-red-500 text-red-700';
      default:
        return 'bg-gray-500 text-gray-700';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'LOW':
        return <Shield className="h-5 w-5 text-green-500" />;
      case 'MEDIUM':
        return <TrendingUp className="h-5 w-5 text-yellow-500" />;
      case 'HIGH':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'CRITICAL':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  const getProgressColor = (score: number) => {
    if (score < 20) return 'bg-green-500';
    if (score < 40) return 'bg-yellow-500';
    if (score < 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Risk Assessment</CardTitle>
        <div className="flex items-center gap-2">
          {getRiskIcon(riskLevel)}
          <Badge 
            variant={riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'destructive' : 'secondary'}
            className={getRiskColor(riskLevel)}
          >
            {riskLevel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{score}/100</span>
              <span className="text-xs text-gray-500">
                {score >= 60 ? 'Investigation Required' : 'Within Normal Range'}
              </span>
            </div>
            <Progress 
              value={score} 
              className="h-2"
            />
          </div>

          {showDetails && factors.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-gray-500">Risk Factors</p>
              {factors.slice(0, 4).map((factor, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{factor.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${getProgressColor(factor.score)}`}
                        style={{ width: `${factor.score}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">
                      {Math.round(factor.score * factor.weight)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {score >= 60 && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span>This invoice requires manual investigation</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default RiskScoreCard;
