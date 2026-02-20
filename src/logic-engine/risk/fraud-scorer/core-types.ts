/**
 * CREDITORFLOW EMS - CORE TYPES
 * Version: 4.1.7
 * Core input/output and main types
 */

import {
  RiskLevel,
  FraudSeverityLevel,
  FraudAlertPriority,
  FraudMitigationAction,
  FraudRiskCategory,
  FraudDetectionMethod,
  FraudEscalationPath,
  FraudEscalationLevel,
} from "./enums";

export interface FraudScoringInput {
  totalAmount: number;
  supplierAgeDays?: number;
  invoiceDate?: Date;
  vatAmount?: number;
  subtotal?: number;
  supplierVatNumber?: string;
  supplierCountry?: string;
  supplierIsPep?: boolean;
  supplierId?: string;
  supplierName?: string;
  supplierRiskScore?: number;
  supplierRiskFactors?: FraudRiskFactor[];
}

export interface FraudScoringResult {
  scoringId: string;
  modelVersion: FraudModelVersion;
  inputHash: string;
  overallScore: number;
  normalizedScore: number;
  riskLevel: RiskLevel;
  severityLevel: FraudSeverityLevel;
  requiresAttention: boolean;
  riskFactors: FraudRiskFactor[];
  mitigationActions: FraudMitigationAction[];
  confidenceInterval: FraudConfidenceInterval;
  alertPriority: FraudAlertPriority;
  escalationPath: FraudEscalationPath[];
  investigationRequired: boolean;
  regulatoryReportingRequired: boolean;
  calculationTimestamp: Date;
  scoringDurationMs: number;
  auditTrail: FraudAuditTrail[];
  metadata: FraudScoringMetadata;
}

export interface FraudRiskFactor {
  category: FraudRiskCategory;
  factor: string;
  description: string;
  severity: FraudSeverityLevel;
  scoreImpact: number;
  evidence: string;
  detectionMethod: FraudDetectionMethod;
  confidence: number;
  timestamp: Date;
}

export interface FraudConfidenceInterval {
  lower: number;
  upper: number;
  level: string;
}

export interface FraudModelVersion {
  major: number;
  minor: number;
  patch: number;
  releaseDate: Date;
  trainingDataCutoff: Date;
  features: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  aucRoc: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  calibrationScore: number;
}

export interface FraudScoringMetadata {
  scoringId: string;
  modelVersion: FraudModelVersion;
  inputHash: string;
  scoringStartTime: Date;
  scoringEndTime: Date;
  scoringDurationMs: number;
  inputCharacteristics: {
    totalAmount: number;
    supplierAgeDays?: number;
    invoiceDate?: Date;
    vatAmount?: number;
    subtotal?: number;
    supplierVatNumber?: string;
    supplierCountry?: string;
    supplierIsPep?: boolean;
  };
  contextCharacteristics?: {
    businessUnit?: string;
    department?: string;
    approverRole?: string;
    paymentTerms?: number;
    supplierCategory?: string;
    historicalAmounts?: number[];
    businessUnitRiskAppetite?: "LOW" | "MEDIUM" | "HIGH";
  };
  riskCharacteristics: {
    overallScore: number;
    normalizedScore: number;
    componentScores: Record<string, number>;
    riskFactorCount: number;
    highestRiskFactorScore: number;
    detectionMethodCount: number;
    confidenceScore: number;
    confidenceIntervalLower: number;
    confidenceIntervalUpper: number;
    confidenceLevel: string;
  };
  systemCharacteristics: {
    environment: string;
    region: string;
    instanceId: string;
    version: string;
    buildNumber: string;
    buildDate: Date;
  };
}

export interface FraudAuditTrail {
  auditId: string;
  scoringId: string;
  timestamp: Date;
  eventType: string;
  eventDescription: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
}

export interface FraudScoringContext {
  businessUnit?: string;
  department?: string;
  approverRole?: string;
  paymentTerms?: number;
  supplierCategory?: string;
  historicalAmounts?: number[];
  businessUnitRiskAppetite?: "LOW" | "MEDIUM" | "HIGH";
  transactionContext?: string;
  userRiskProfile?: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  sessionData?: Record<string, any>;
  customAttributes?: Record<string, any>;
}

// SLA Timeline
export interface FraudSLATimeline {
  escalationLevel: FraudEscalationLevel;
  responseTimeHours: number;
  resolutionTimeHours: number;
}

// Custom exception class
export class FraudScoringException extends Error {
  constructor(
    public code: string,
    public message: string,
    public scoringId: string,
    public metadata?: Record<string, any>,
  ) {
    super(message);
    this.name = "FraudScoringException";
  }
}
