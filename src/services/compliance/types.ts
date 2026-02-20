export enum ScreeningStatus {
  PENDING = "pending",
  CLEAR = "clear",
  MATCH_FOUND = "match_found",
  REVIEW_REQUIRED = "review_required",
  REJECTED = "rejected",
  EXPIRED = "expired",
}

export enum RiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum EntityType {
  INDIVIDUAL = "individual",
  ORGANIZATION = "organization",
  VESSEL = "vessel",
  AIRCRAFT = "aircraft",
}

export enum SanctionsList {
  OFAC_SDN = "ofac_sdn",
  OFAC_CONSOLIDATED = "ofac_consolidated",
  UN_SC = "un_sc",
  EU_SANCTIONS = "eu_sanctions",
  UK_OFSI = "uk_ofsi",
  INTERPOL_RED_NOTICE = "interpol_red_notice",
  PEP = "pep",
  ADVERSE_MEDIA = "adverse_media",
}

export interface ScreeningSubject {
  id: string;
  entityType: EntityType;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  countryOfResidence?: string;
  organizationName?: string;
  registrationNumber?: string;
  jurisdiction?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  identifiers?: {
    type: "passport" | "national_id" | "tax_id" | "lei" | "custom";
    value: string;
    country?: string;
  }[];
  metadata?: Record<string, unknown>;
}

export interface ScreeningMatch {
  list: SanctionsList;
  matchId: string;
  matchedName: string;
  matchScore: number;
  matchDetails: {
    matchedFields: string[];
    aliases?: string[];
    dateOfBirth?: string;
    nationality?: string;
    positions?: string[];
    sanctionsPrograms?: string[];
    remarks?: string;
  };
  riskLevel: RiskLevel;
  reviewRequired: boolean;
  metadata?: Record<string, unknown>;
}

export interface ScreeningResult {
  screeningId: string;
  subjectId: string;
  status: ScreeningStatus;
  riskLevel: RiskLevel;
  matches: ScreeningMatch[];
  listsScreened: SanctionsList[];
  screeningDate: Date;
  expiryDate: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  metadata?: Record<string, unknown>;
}

export interface ComplianceCheck {
  id: string;
  checkType: string;
  status: "passed" | "failed" | "warning" | "pending";
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  checkedAt: Date;
  expiresAt?: Date;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
  conditions: Record<string, unknown>;
}

export interface ComplianceViolation {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  description: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface SanctionsScreeningConfig {
  listsToScreen: SanctionsList[];
  confidenceThreshold: number;
  autoRejectThreshold: number;
  reviewRequiredThreshold: number;
  cacheExpiryDays: number;
}

export interface ComplianceReport {
  id: string;
  reportType: string;
  periodStart: Date;
  periodEnd: Date;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warnings: number;
  violations: ComplianceViolation[];
  generatedAt: Date;
  generatedBy: string;
}
