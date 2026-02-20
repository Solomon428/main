/**
 * CREDITORFLOW EMS - FRAUD DETECTION CONSTANTS
 * Version: 4.1.7
 * Constants, thresholds, and configuration values
 */

import {
  RiskLevel,
  FraudSeverityLevel,
  FraudAlertPriority,
  FraudMitigationAction,
  FraudRiskCategory,
  FraudInvestigationStatus,
  FraudCaseStatus,
  FraudEvidenceType,
  FraudEvidenceSource,
  FraudCaseResolution,
  FraudLossEstimate,
  FraudRecoveryStatus,
  FraudRegulatoryImpact,
  FraudNotificationRecipient,
  FraudNotificationChannel,
  FraudEscalationPath,
  FraudEscalationLevel,
} from "./enums";
import type {
  FraudSLATimeline,
  FraudConfidenceInterval,
  FraudModelVersion,
} from "./core-types";

// Risk threshold levels
export const RISK_THRESHOLDS = {
  NO_RISK: 0,
  VERY_LOW: 10,
  LOW: 25,
  LOW_MEDIUM: 40,
  MEDIUM: 55,
  MEDIUM_HIGH: 70,
  HIGH: 80,
  VERY_HIGH: 90,
  CRITICAL: 95,
  SEVERE: 98,
  BLACKLISTED: 100,
} as const;

// Risk weights for different scoring dimensions
export const RISK_WEIGHTS = {
  AMOUNT_RISK: 0.25,
  SUPPLIER_AGE_RISK: 0.15,
  SUPPLIER_RISK_PROFILE: 0.12,
  PAYMENT_PATTERN_RISK: 0.1,
  TEMPORAL_ANOMALY_RISK: 0.08,
  GEOGRAPHIC_RISK: 0.07,
  BEHAVIORAL_RISK: 0.08,
  NETWORK_RISK: 0.07,
  VAT_COMPLIANCE_RISK: 0.05,
  REGULATORY_RISK: 0.03,
} as const;

// South African compliance rules
export const SA_COMPLIANCE_RULES = {
  HIGH_VALUE_THRESHOLD: 50000, // R50,000 SARS threshold for enhanced scrutiny
  SUPPLIER_PROBATION_DAYS: 90, // 90-day probation period for new suppliers per SARS guidelines
  VAT_ROUNDING_TOLERANCE: 0.5, // R0.50 tolerance for VAT calculations per SARS
  ROUND_AMOUNT_THRESHOLD: 0.95, // 95% confidence for round amount detection
  WEEKEND_SUBMISSION_PENALTY: 10, // Points deducted for weekend submissions
  FUTURE_DATE_PENALTY: 25, // Points deducted for future-dated invoices
  VAT_NUMBER_VALIDATION: true, // Enforce 10-digit VAT number starting with 4
  PEP_SCREENING_REQUIRED: true, // Politically Exposed Persons screening required
  SANCTION_SCREENING_REQUIRED: true, // Sanctions list screening required
  FICA_COMPLIANCE_REQUIRED: true, // Financial Intelligence Centre Act compliance
} as const;

// Model version information
export const MODEL_VERSION: FraudModelVersion = {
  major: 4,
  minor: 1,
  patch: 7,
  releaseDate: new Date("2024-01-18"),
  trainingDataCutoff: new Date("2023-12-31"),
  features: 127,
  accuracy: 0.947,
  precision: 0.923,
  recall: 0.891,
  f1Score: 0.906,
  aucRoc: 0.968,
  falsePositiveRate: 0.032,
  falseNegativeRate: 0.109,
  calibrationScore: 0.982,
};

// Confidence intervals by risk level
export const CONFIDENCE_INTERVALS: Record<RiskLevel, FraudConfidenceInterval> =
  {
    [RiskLevel.NO_RISK]: { lower: 0.95, upper: 1.0, level: "VERY_HIGH" },
    [RiskLevel.VERY_LOW]: { lower: 0.9, upper: 0.95, level: "HIGH" },
    [RiskLevel.LOW]: { lower: 0.85, upper: 0.9, level: "MEDIUM_HIGH" },
    [RiskLevel.LOW_MEDIUM]: { lower: 0.8, upper: 0.85, level: "MEDIUM" },
    [RiskLevel.MEDIUM]: { lower: 0.7, upper: 0.8, level: "MEDIUM_LOW" },
    [RiskLevel.MEDIUM_HIGH]: { lower: 0.6, upper: 0.7, level: "LOW" },
    [RiskLevel.HIGH]: { lower: 0.45, upper: 0.6, level: "VERY_LOW" },
    [RiskLevel.VERY_HIGH]: { lower: 0.3, upper: 0.45, level: "MINIMAL" },
    [RiskLevel.CRITICAL]: { lower: 0.15, upper: 0.3, level: "NONE" },
    [RiskLevel.SEVERE]: { lower: 0.05, upper: 0.15, level: "NONE" },
    [RiskLevel.BLACKLISTED]: { lower: 0.0, upper: 0.05, level: "NONE" },
  };

// Risk categories
export const RISK_CATEGORIES: FraudRiskCategory[] = [
  FraudRiskCategory.AMOUNT_ANOMALY,
  FraudRiskCategory.SUPPLIER_RISK,
  FraudRiskCategory.PAYMENT_PATTERN,
  FraudRiskCategory.TEMPORAL_ANOMALY,
  FraudRiskCategory.GEOGRAPHIC_RISK,
  FraudRiskCategory.BEHAVIORAL_ANOMALY,
  FraudRiskCategory.NETWORK_RISK,
  FraudRiskCategory.VAT_NON_COMPLIANCE,
  FraudRiskCategory.REGULATORY_VIOLATION,
  FraudRiskCategory.DOCUMENT_FRAUD,
  FraudRiskCategory.IDENTITY_FRAUD,
  FraudRiskCategory.SUPPLIER_IMPERSONATION,
  FraudRiskCategory.INVOICE_DUPLICATION,
  FraudRiskCategory.PRICE_INFLATION,
  FraudRiskCategory.GHOST_SUPPLIER,
  FraudRiskCategory.MONEY_LAUNDERING,
  FraudRiskCategory.BRIBERY_CORRUPTION,
  FraudRiskCategory.TERRORIST_FINANCING,
];

// Severity levels by risk category
export const SEVERITY_LEVELS: Record<FraudRiskCategory, FraudSeverityLevel> = {
  [FraudRiskCategory.AMOUNT_ANOMALY]: FraudSeverityLevel.MEDIUM,
  [FraudRiskCategory.SUPPLIER_RISK]: FraudSeverityLevel.HIGH,
  [FraudRiskCategory.PAYMENT_PATTERN]: FraudSeverityLevel.MEDIUM,
  [FraudRiskCategory.TEMPORAL_ANOMALY]: FraudSeverityLevel.LOW,
  [FraudRiskCategory.GEOGRAPHIC_RISK]: FraudSeverityLevel.HIGH,
  [FraudRiskCategory.BEHAVIORAL_ANOMALY]: FraudSeverityLevel.MEDIUM,
  [FraudRiskCategory.NETWORK_RISK]: FraudSeverityLevel.CRITICAL,
  [FraudRiskCategory.VAT_NON_COMPLIANCE]: FraudSeverityLevel.HIGH,
  [FraudRiskCategory.REGULATORY_VIOLATION]: FraudSeverityLevel.CRITICAL,
  [FraudRiskCategory.DOCUMENT_FRAUD]: FraudSeverityLevel.CRITICAL,
  [FraudRiskCategory.IDENTITY_FRAUD]: FraudSeverityLevel.SEVERE,
  [FraudRiskCategory.SUPPLIER_IMPERSONATION]: FraudSeverityLevel.SEVERE,
  [FraudRiskCategory.INVOICE_DUPLICATION]: FraudSeverityLevel.HIGH,
  [FraudRiskCategory.PRICE_INFLATION]: FraudSeverityLevel.MEDIUM,
  [FraudRiskCategory.GHOST_SUPPLIER]: FraudSeverityLevel.CRITICAL,
  [FraudRiskCategory.MONEY_LAUNDERING]: FraudSeverityLevel.SEVERE,
  [FraudRiskCategory.BRIBERY_CORRUPTION]: FraudSeverityLevel.SEVERE,
  [FraudRiskCategory.TERRORIST_FINANCING]: FraudSeverityLevel.BLACKLISTED,
  [FraudRiskCategory.SYSTEM_ERROR]: FraudSeverityLevel.SEVERE,
};

// Alert priorities by severity level
export const ALERT_PRIORITIES: Record<FraudSeverityLevel, FraudAlertPriority> =
  {
    [FraudSeverityLevel.LOW]: FraudAlertPriority.LOW,
    [FraudSeverityLevel.MEDIUM]: FraudAlertPriority.MEDIUM,
    [FraudSeverityLevel.HIGH]: FraudAlertPriority.HIGH,
    [FraudSeverityLevel.CRITICAL]: FraudAlertPriority.CRITICAL,
    [FraudSeverityLevel.SEVERE]: FraudAlertPriority.IMMEDIATE,
    [FraudSeverityLevel.BLACKLISTED]: FraudAlertPriority.IMMEDIATE,
  };

// Mitigation actions by risk category
export const MITIGATION_ACTIONS: Record<
  FraudRiskCategory,
  FraudMitigationAction[]
> = {
  [FraudRiskCategory.AMOUNT_ANOMALY]: [
    FraudMitigationAction.ENHANCED_SCRUTINY,
    FraudMitigationAction.MANUAL_REVIEW,
    FraudMitigationAction.APPROVAL_ESCALATION,
  ],
  [FraudRiskCategory.SUPPLIER_RISK]: [
    FraudMitigationAction.SUPPLIER_VERIFICATION,
    FraudMitigationAction.SITE_VISIT,
    FraudMitigationAction.REFERENCE_CHECK,
    FraudMitigationAction.BLACKLIST_CHECK,
  ],
  [FraudRiskCategory.PAYMENT_PATTERN]: [
    FraudMitigationAction.PATTERN_ANALYSIS,
    FraudMitigationAction.HISTORICAL_REVIEW,
    FraudMitigationAction.PAYMENT_TERMS_VERIFICATION,
  ],
  [FraudRiskCategory.TEMPORAL_ANOMALY]: [
    FraudMitigationAction.TIMESTAMP_VALIDATION,
    FraudMitigationAction.SUBMISSION_PATTERN_ANALYSIS,
  ],
  [FraudRiskCategory.GEOGRAPHIC_RISK]: [
    FraudMitigationAction.JURISDICTION_SCREENING,
    FraudMitigationAction.SANCTIONS_CHECK,
    FraudMitigationAction.PEP_SCREENING,
  ],
  [FraudRiskCategory.BEHAVIORAL_ANOMALY]: [
    FraudMitigationAction.BEHAVIORAL_PROFILING,
    FraudMitigationAction.ANOMALY_DETECTION,
    FraudMitigationAction.PATTERN_RECOGNITION,
  ],
  [FraudRiskCategory.NETWORK_RISK]: [
    FraudMitigationAction.NETWORK_ANALYSIS,
    FraudMitigationAction.ENTITY_RESOLUTION,
    FraudMitigationAction.RELATIONSHIP_MAPPING,
  ],
  [FraudRiskCategory.VAT_NON_COMPLIANCE]: [
    FraudMitigationAction.VAT_VALIDATION,
    FraudMitigationAction.TAX_NUMBER_VERIFICATION,
    FraudMitigationAction.SARS_COMPLIANCE_CHECK,
  ],
  [FraudRiskCategory.REGULATORY_VIOLATION]: [
    FraudMitigationAction.REGULATORY_SCREENING,
    FraudMitigationAction.COMPLIANCE_CHECK,
    FraudMitigationAction.LEGAL_REVIEW,
  ],
  [FraudRiskCategory.DOCUMENT_FRAUD]: [
    FraudMitigationAction.DOCUMENT_AUTHENTICATION,
    FraudMitigationAction.FORENSIC_ANALYSIS,
    FraudMitigationAction.SIGNATURE_VERIFICATION,
  ],
  [FraudRiskCategory.IDENTITY_FRAUD]: [
    FraudMitigationAction.IDENTITY_VERIFICATION,
    FraudMitigationAction.KYC_CHECK,
    FraudMitigationAction.BIOMETRIC_VERIFICATION,
  ],
  [FraudRiskCategory.SUPPLIER_IMPERSONATION]: [
    FraudMitigationAction.SUPPLIER_AUTHENTICATION,
    FraudMitigationAction.CONTACT_VERIFICATION,
    FraudMitigationAction.AUTHORIZATION_CHECK,
  ],
  [FraudRiskCategory.INVOICE_DUPLICATION]: [
    FraudMitigationAction.DUPLICATE_DETECTION,
    FraudMitigationAction.FUZZY_MATCHING,
    FraudMitigationAction.HISTORICAL_SEARCH,
  ],
  [FraudRiskCategory.PRICE_INFLATION]: [
    FraudMitigationAction.PRICE_BENCHMARKING,
    FraudMitigationAction.MARKET_ANALYSIS,
    FraudMitigationAction.COST_VERIFICATION,
  ],
  [FraudRiskCategory.GHOST_SUPPLIER]: [
    FraudMitigationAction.SUPPLIER_VERIFICATION,
    FraudMitigationAction.PHYSICAL_ADDRESS_VERIFICATION,
    FraudMitigationAction.BANK_ACCOUNT_VERIFICATION,
  ],
  [FraudRiskCategory.MONEY_LAUNDERING]: [
    FraudMitigationAction.AML_SCREENING,
    FraudMitigationAction.TRANSACTION_MONITORING,
    FraudMitigationAction.SUSPICIOUS_ACTIVITY_REPORTING,
  ],
  [FraudRiskCategory.BRIBERY_CORRUPTION]: [
    FraudMitigationAction.ANTI_CORRUPTION_SCREENING,
    FraudMitigationAction.ETHICS_CHECK,
    FraudMitigationAction.COMPLIANCE_VERIFICATION,
  ],
  [FraudRiskCategory.TERRORIST_FINANCING]: [
    FraudMitigationAction.CTF_SCREENING,
    FraudMitigationAction.SANCTIONS_LIST_CHECK,
    FraudMitigationAction.IMMEDIATE_ESCALATION,
  ],
  [FraudRiskCategory.SYSTEM_ERROR]: [
    FraudMitigationAction.IMMEDIATE_ESCALATION,
    FraudMitigationAction.MANUAL_REVIEW,
  ],
};

// Investigation statuses
export const INVESTIGATION_STATUSES: FraudInvestigationStatus[] = [
  FraudInvestigationStatus.NOT_STARTED,
  FraudInvestigationStatus.IN_PROGRESS,
  FraudInvestigationStatus.PENDING_EVIDENCE,
  FraudInvestigationStatus.PENDING_ANALYSIS,
  FraudInvestigationStatus.PENDING_REVIEW,
  FraudInvestigationStatus.PENDING_APPROVAL,
  FraudInvestigationStatus.COMPLETED,
  FraudInvestigationStatus.ESCALATED,
  FraudInvestigationStatus.CLOSED,
  FraudInvestigationStatus.REOPENED,
];

// Case statuses
export const CASE_STATUSES: FraudCaseStatus[] = [
  FraudCaseStatus.REPORTED,
  FraudCaseStatus.UNDER_INVESTIGATION,
  FraudCaseStatus.SUSPECTED,
  FraudCaseStatus.CONFIRMED,
  FraudCaseStatus.DISMISSED,
  FraudCaseStatus.RESOLVED,
  FraudCaseStatus.CLOSED,
  FraudCaseStatus.ESCALATED_TO_REGULATOR,
  FraudCaseStatus.ESCALATED_TO_LAW_ENFORCEMENT,
  FraudCaseStatus.LITIGATION_PENDING,
  FraudCaseStatus.LITIGATION_IN_PROGRESS,
  FraudCaseStatus.LITIGATION_RESOLVED,
  FraudCaseStatus.SETTLEMENT_NEGOTIATION,
  FraudCaseStatus.SETTLEMENT_COMPLETED,
];

// Evidence types
export const EVIDENCE_TYPES: FraudEvidenceType[] = [
  FraudEvidenceType.DOCUMENTARY,
  FraudEvidenceType.TESTIMONIAL,
  FraudEvidenceType.CIRCUMSTANTIAL,
  FraudEvidenceType.DIGITAL,
  FraudEvidenceType.FORENSIC,
  FraudEvidenceType.EXPERT_OPINION,
  FraudEvidenceType.REGULATORY_FILING,
  FraudEvidenceType.INSURANCE_CLAIM,
  FraudEvidenceType.LEGAL_OPINION,
  FraudEvidenceType.WITNESS_STATEMENT,
];

// Evidence sources
export const EVIDENCE_SOURCES: FraudEvidenceSource[] = [
  FraudEvidenceSource.INTERNAL_SYSTEM,
  FraudEvidenceSource.EXTERNAL_SYSTEM,
  FraudEvidenceSource.THIRD_PARTY,
  FraudEvidenceSource.REGULATORY_BODY,
  FraudEvidenceSource.LAW_ENFORCEMENT,
  FraudEvidenceSource.COURT,
  FraudEvidenceSource.AUDITOR,
  FraudEvidenceSource.INVESTIGATOR,
  FraudEvidenceSource.WHISTLEBLOWER,
  FraudEvidenceSource.PUBLIC_RECORD,
];

// Case resolutions
export const CASE_RESOLUTIONS: FraudCaseResolution[] = [
  FraudCaseResolution.NO_FRAUD_DETECTED,
  FraudCaseResolution.MINOR_IRREGULARITY,
  FraudCaseResolution.MATERIAL_IRREGULARITY,
  FraudCaseResolution.FRAUD_CONFIRMED,
  FraudCaseResolution.FRAUD_SUSPECTED,
  FraudCaseResolution.INSUFFICIENT_EVIDENCE,
  FraudCaseResolution.CASE_DISMISSED,
  FraudCaseResolution.SETTLEMENT_REACHED,
  FraudCaseResolution.RECOVERY_COMPLETED,
  FraudCaseResolution.LITIGATION_LOST,
  FraudCaseResolution.LITIGATION_WON,
  FraudCaseResolution.REGULATORY_ACTION_TAKEN,
  FraudCaseResolution.CRIMINAL_PROSECUTION,
  FraudCaseResolution.CIVIL_PROSECUTION,
];

// Loss estimates
export const LOSS_ESTIMATES: FraudLossEstimate[] = [
  FraudLossEstimate.NO_LOSS,
  FraudLossEstimate.MINOR_LOSS,
  FraudLossEstimate.MODERATE_LOSS,
  FraudLossEstimate.SIGNIFICANT_LOSS,
  FraudLossEstimate.MAJOR_LOSS,
  FraudLossEstimate.CATASTROPHIC_LOSS,
];

// Recovery statuses
export const RECOVERY_STATUSES: FraudRecoveryStatus[] = [
  FraudRecoveryStatus.NOT_INITIATED,
  FraudRecoveryStatus.IN_PROGRESS,
  FraudRecoveryStatus.PARTIAL_RECOVERY,
  FraudRecoveryStatus.FULL_RECOVERY,
  FraudRecoveryStatus.RECOVERY_FAILED,
  FraudRecoveryStatus.RECOVERY_ABANDONED,
  FraudRecoveryStatus.RECOVERY_PENDING_LITIGATION,
  FraudRecoveryStatus.RECOVERY_PENDING_SETTLEMENT,
];

// Regulatory impacts
export const REGULATORY_IMPACTS: FraudRegulatoryImpact[] = [
  FraudRegulatoryImpact.NO_IMPACT,
  FraudRegulatoryImpact.MINOR_IMPACT,
  FraudRegulatoryImpact.MODERATE_IMPACT,
  FraudRegulatoryImpact.SIGNIFICANT_IMPACT,
  FraudRegulatoryImpact.MAJOR_IMPACT,
  FraudRegulatoryImpact.REGULATORY_ACTION,
  FraudRegulatoryImpact.LICENSE_REVOCATION,
  FraudRegulatoryImpact.CRIMINAL_PROSECUTION,
  FraudRegulatoryImpact.CIVIL_PENALTIES,
  FraudRegulatoryImpact.REPUTATIONAL_DAMAGE,
];

// Notification recipients
export const NOTIFICATION_RECIPIENTS: FraudNotificationRecipient[] = [
  FraudNotificationRecipient.FRAUD_MANAGER,
  FraudNotificationRecipient.COMPLIANCE_OFFICER,
  FraudNotificationRecipient.RISK_MANAGER,
  FraudNotificationRecipient.CHIEF_FINANCIAL_OFFICER,
  FraudNotificationRecipient.CHIEF_EXECUTIVE_OFFICER,
  FraudNotificationRecipient.BOARD_OF_DIRECTORS,
  FraudNotificationRecipient.AUDIT_COMMITTEE,
  FraudNotificationRecipient.REGULATORY_BODY,
  FraudNotificationRecipient.LAW_ENFORCEMENT,
  FraudNotificationRecipient.INSURANCE_PROVIDER,
];

// Notification channels
export const NOTIFICATION_CHANNELS: FraudNotificationChannel[] = [
  FraudNotificationChannel.EMAIL,
  FraudNotificationChannel.SMS,
  FraudNotificationChannel.PUSH_NOTIFICATION,
  FraudNotificationChannel.PHONE_CALL,
  FraudNotificationChannel.SECURE_PORTAL,
  FraudNotificationChannel.IN_PERSON,
  FraudNotificationChannel.COURIER,
  FraudNotificationChannel.REGULATORY_FILING,
];

// Escalation paths
export const ESCALATION_PATHS: FraudEscalationPath[] = [
  FraudEscalationPath.FRAUD_ANALYST,
  FraudEscalationPath.FRAUD_MANAGER,
  FraudEscalationPath.COMPLIANCE_OFFICER,
  FraudEscalationPath.RISK_MANAGER,
  FraudEscalationPath.CHIEF_FINANCIAL_OFFICER,
  FraudEscalationPath.CHIEF_EXECUTIVE_OFFICER,
  FraudEscalationPath.BOARD_OF_DIRECTORS,
  FraudEscalationPath.AUDIT_COMMITTEE,
  FraudEscalationPath.REGULATORY_BODY,
  FraudEscalationPath.LAW_ENFORCEMENT,
];

// Escalation levels
export const ESCALATION_LEVELS: FraudEscalationLevel[] = [
  FraudEscalationLevel.LEVEL_1,
  FraudEscalationLevel.LEVEL_2,
  FraudEscalationLevel.LEVEL_3,
  FraudEscalationLevel.LEVEL_4,
  FraudEscalationLevel.LEVEL_5,
  FraudEscalationLevel.CRITICAL,
  FraudEscalationLevel.IMMEDIATE,
];

// SLA timelines
export const SLA_TIMELINES: FraudSLATimeline[] = [
  {
    escalationLevel: FraudEscalationLevel.LEVEL_1,
    responseTimeHours: 24,
    resolutionTimeHours: 168,
  },
  {
    escalationLevel: FraudEscalationLevel.LEVEL_2,
    responseTimeHours: 12,
    resolutionTimeHours: 72,
  },
  {
    escalationLevel: FraudEscalationLevel.LEVEL_3,
    responseTimeHours: 4,
    resolutionTimeHours: 24,
  },
  {
    escalationLevel: FraudEscalationLevel.LEVEL_4,
    responseTimeHours: 2,
    resolutionTimeHours: 12,
  },
  {
    escalationLevel: FraudEscalationLevel.LEVEL_5,
    responseTimeHours: 1,
    resolutionTimeHours: 6,
  },
  {
    escalationLevel: FraudEscalationLevel.CRITICAL,
    responseTimeHours: 0.5,
    resolutionTimeHours: 2,
  },
  {
    escalationLevel: FraudEscalationLevel.IMMEDIATE,
    responseTimeHours: 0.25,
    resolutionTimeHours: 1,
  },
];
