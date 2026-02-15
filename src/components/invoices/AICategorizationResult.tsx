'use client';

import React from 'react';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Building2,
} from 'lucide-react';

interface AICategorizationResultProps {
  category: string;
  confidence: number;
  alternatives: Array<{ category: string; confidence: number }>;
  department: string;
  costCenter: string;
  glAccount: string;
  projectCode: string | null;
  anomalies: string[];
  recommendations: string[];
  onAccept: () => void;
  onOverride: (category: string) => void;
}

export function AICategorizationResult({
  category,
  confidence,
  alternatives,
  department,
  costCenter,
  glAccount,
  projectCode,
  anomalies,
  recommendations,
  onAccept,
  onOverride,
}: AICategorizationResultProps) {
  const confidencePercent = Math.round(confidence * 100);
  const confidenceColor =
    confidence >= 0.8
      ? 'text-green-600'
      : confidence >= 0.6
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">AI Categorization</h3>
            <p className="text-sm text-white/80">Powered by pattern analysis</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Main prediction */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Predicted Category</p>
            <p className="text-lg font-semibold">
              {category.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Confidence</p>
            <p className={`text-lg font-semibold ${confidenceColor}`}>
              {confidencePercent}%
            </p>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="space-y-1">
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                confidence >= 0.8
                  ? 'bg-green-500'
                  : confidence >= 0.6
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Alternative Categories</p>
            <div className="flex flex-wrap gap-2">
              {alternatives.map((alt) => (
                <button
                  key={alt.category}
                  onClick={() => onOverride(alt.category)}
                  className="px-3 py-1 text-sm border rounded-full hover:bg-muted transition-colors"
                >
                  {alt.category.replace(/_/g, ' ')} (
                  {Math.round(alt.confidence * 100)}%)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GL Account Info */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">GL Account</p>
            <p className="font-mono text-sm">{glAccount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cost Center</p>
            <p className="font-mono text-sm">{costCenter}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Department</p>
            <p className="text-sm">{department}</p>
          </div>
          {projectCode && (
            <div>
              <p className="text-xs text-muted-foreground">Project Code</p>
              <p className="font-mono text-sm">{projectCode}</p>
            </div>
          )}
        </div>

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm font-medium text-yellow-800">
                Anomalies Detected
              </p>
            </div>
            <ul className="space-y-1">
              {anomalies.map((anomaly, index) => (
                <li
                  key={index}
                  className="text-sm text-yellow-700 flex items-start gap-2"
                >
                  <span>•</span>
                  <span>{anomaly}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">
                Recommendations
              </p>
            </div>
            <ul className="space-y-1">
              {recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="text-sm text-blue-700 flex items-start gap-2"
                >
                  <span>•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            Accept Categorization
          </button>
        </div>
      </div>
    </div>
  );
}
