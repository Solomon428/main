import { v4 as uuidv4 } from "uuid";
import {
  ScreeningSubject,
  ScreeningResult,
  ScreeningStatus,
  RiskLevel,
  SanctionsList,
  SanctionsScreeningConfig,
  ComplianceCheck,
  ComplianceRule,
  ComplianceViolation,
  ComplianceReport,
} from "./types";

export class SanctionsScreeningService {
  private config: SanctionsScreeningConfig;
  private cache: Map<string, { result: ScreeningResult; expiresAt: Date }>;

  constructor(config?: Partial<SanctionsScreeningConfig>) {
    this.config = {
      listsToScreen: config?.listsToScreen || [
        SanctionsList.OFAC_SDN,
        SanctionsList.UN_SC,
        SanctionsList.EU_SANCTIONS,
      ],
      confidenceThreshold: config?.confidenceThreshold || 0.8,
      autoRejectThreshold: config?.autoRejectThreshold || 0.95,
      reviewRequiredThreshold: config?.reviewRequiredThreshold || 0.7,
      cacheExpiryDays: config?.cacheExpiryDays || 7,
    };
    this.cache = new Map();
  }

  async screenSubject(subject: ScreeningSubject): Promise<ScreeningResult> {
    const cacheKey = this.getCacheKey(subject);
    const cached = this.cache.get(cacheKey);
    if (cached && new Date() < cached.expiresAt) {
      return cached.result;
    }

    const listsScreened = this.config.listsToScreen;
    const matches = await this.performScreening(subject, listsScreened);

    const maxScore =
      matches.length > 0 ? Math.max(...matches.map((m) => m.matchScore)) : 0;

    const riskLevel = this.calculateRiskLevel(maxScore);
    const status = this.determineStatus(matches, maxScore);

    const result: ScreeningResult = {
      screeningId: uuidv4(),
      subjectId: subject.id,
      status,
      riskLevel,
      matches,
      listsScreened,
      screeningDate: new Date(),
      expiryDate: new Date(
        Date.now() + this.config.cacheExpiryDays * 24 * 60 * 60 * 1000,
      ),
    };

    this.cache.set(cacheKey, {
      result,
      expiresAt: result.expiryDate,
    });

    return result;
  }

  private async performScreening(
    subject: ScreeningSubject,
    lists: SanctionsList[],
  ): Promise<ScreeningResult["matches"]> {
    const matches: ScreeningResult["matches"] = [];

    for (const list of lists) {
      const searchName = subject.fullName || subject.organizationName || "";
      const matchResult = await this.searchSanctionsList(
        list,
        searchName,
        subject,
      );

      if (matchResult) {
        matches.push(matchResult);
      }
    }

    return matches;
  }

  private async searchSanctionsList(
    list: SanctionsList,
    name: string,
    subject: ScreeningSubject,
  ): Promise<ScreeningResult["matches"][0] | null> {
    return null;
  }

  private calculateRiskLevel(matchScore: number): RiskLevel {
    if (matchScore >= this.config.autoRejectThreshold)
      return RiskLevel.CRITICAL;
    if (matchScore >= 0.85) return RiskLevel.HIGH;
    if (matchScore >= this.config.reviewRequiredThreshold)
      return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private determineStatus(
    matches: ScreeningResult["matches"],
    maxScore: number,
  ): ScreeningStatus {
    if (matches.length === 0) return ScreeningStatus.CLEAR;
    if (maxScore >= this.config.autoRejectThreshold)
      return ScreeningStatus.REJECTED;
    if (maxScore >= this.config.reviewRequiredThreshold)
      return ScreeningStatus.REVIEW_REQUIRED;
    return ScreeningStatus.MATCH_FOUND;
  }

  private getCacheKey(subject: ScreeningSubject): string {
    const name = subject.fullName || subject.organizationName || "";
    return `${subject.entityType}:${name}:${subject.dateOfBirth || ""}`;
  }

  async getScreeningHistory(subjectId: string): Promise<ScreeningResult[]> {
    return [];
  }

  async reviewScreening(
    screeningId: string,
    decision: "approved" | "rejected",
    reviewerId: string,
    notes?: string,
  ): Promise<ScreeningResult> {
    return {
      screeningId,
      subjectId: "",
      status:
        decision === "approved"
          ? ScreeningStatus.CLEAR
          : ScreeningStatus.REJECTED,
      riskLevel: RiskLevel.LOW,
      matches: [],
      listsScreened: [],
      screeningDate: new Date(),
      expiryDate: new Date(),
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNotes: notes,
    };
  }
}

export class ComplianceService {
  private rules: ComplianceRule[];
  private violations: Map<string, ComplianceViolation[]>;

  constructor() {
    this.rules = [];
    this.violations = new Map();
  }

  async runComplianceCheck(
    entityType: string,
    entityId: string,
    checkTypes?: string[],
  ): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];
    const applicableRules = checkTypes
      ? this.rules.filter((r) => checkTypes.includes(r.id))
      : this.rules.filter((r) => r.enabled);

    for (const rule of applicableRules) {
      const result = await this.evaluateRule(rule, entityType, entityId);
      checks.push({
        id: uuidv4(),
        checkType: rule.id,
        status: result.passed
          ? "passed"
          : result.passed === false
            ? "failed"
            : "warning",
        entityType,
        entityId,
        details: result.details,
        checkedAt: new Date(),
      });
    }

    return checks;
  }

  private async evaluateRule(
    rule: ComplianceRule,
    entityType: string,
    entityId: string,
  ): Promise<{ passed: boolean | null; details?: Record<string, unknown> }> {
    return { passed: null };
  }

  async registerViolation(
    violation: Omit<ComplianceViolation, "id" | "detectedAt">,
  ): Promise<ComplianceViolation> {
    const newViolation: ComplianceViolation = {
      ...violation,
      id: uuidv4(),
      detectedAt: new Date(),
    };

    const key = `${violation.entityType}:${violation.entityId}`;
    const existing = this.violations.get(key) || [];
    existing.push(newViolation);
    this.violations.set(key, existing);

    return newViolation;
  }

  async getViolations(
    entityType: string,
    entityId: string,
  ): Promise<ComplianceViolation[]> {
    const key = `${entityType}:${entityId}`;
    return this.violations.get(key) || [];
  }

  async resolveViolation(
    violationId: string,
    resolvedBy: string,
  ): Promise<void> {
    for (const [key, violations] of this.violations.entries()) {
      const idx = violations.findIndex((v) => v.id === violationId);
      if (idx !== -1) {
        violations[idx].resolvedAt = new Date();
        violations[idx].resolvedBy = resolvedBy;
        break;
      }
    }
  }

  async generateComplianceReport(
    reportType: string,
    periodStart: Date,
    periodEnd: Date,
    generatedBy: string,
  ): Promise<ComplianceReport> {
    const allViolations: ComplianceViolation[] = [];
    for (const violations of this.violations.values()) {
      allViolations.push(
        ...violations.filter(
          (v) => v.detectedAt >= periodStart && v.detectedAt <= periodEnd,
        ),
      );
    }

    return {
      id: uuidv4(),
      reportType,
      periodStart,
      periodEnd,
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: allViolations.length,
      warnings: 0,
      violations: allViolations,
      generatedAt: new Date(),
      generatedBy,
    };
  }

  addRule(rule: ComplianceRule): void {
    this.rules.push(rule);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) rule.enabled = true;
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) rule.enabled = false;
  }
}
