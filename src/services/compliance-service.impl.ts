import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';
import * as crypto from 'crypto';

// ==================== DOMAIN TYPES ====================
export enum ScreeningStatus {
  PENDING = 'pending',
  CLEAR = 'clear',
  MATCH_FOUND = 'match_found',
  REVIEW_REQUIRED = 'review_required',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum EntityType {
  INDIVIDUAL = 'individual',
  ORGANIZATION = 'organization',
  VESSEL = 'vessel',
  AIRCRAFT = 'aircraft'
}

export enum SanctionsList {
  OFAC_SDN = 'ofac_sdn',
  OFAC_CONSOLIDATED = 'ofac_consolidated',
  UN_SC = 'un_sc',
  EU_SANCTIONS = 'eu_sanctions',
  UK_OFSI = 'uk_ofsi',
  INTERPOL_RED_NOTICE = 'interpol_red_notice',
  PEP = 'pep', // Politically Exposed Persons
  ADVERSE_MEDIA = 'adverse_media'
}

export interface ScreeningSubject {
  id: string;
  entityType: EntityType;
  fullName?: string; // For individuals
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  nationality?: string; // ISO alpha-2
  countryOfResidence?: string;
  organizationName?: string; // For entities
  registrationNumber?: string;
  jurisdiction?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country: string; // ISO alpha-2
  };
  identifiers?: {
    type: 'passport' | 'national_id' | 'tax_id' | 'lei' | 'custom';
    value: string;
    country?: string;
  }[];
  metadata?: Record<string, any>;
}

export interface ScreeningMatch {
  list: SanctionsList;
  matchId: string;
  matchedName: string;
  matchScore: number; // 0.0 - 1.0
  matchDetails: {
    matchedFields: string[];
    aliases?: string[];
    dateOfBirth?: string;
    nationality?: string;
    positions?: string[]; // For PEPs
    sanctionsPrograms?: string[];
    remarks?: string;
  };
  riskLevel: RiskLevel;
  reviewRequired: boolean;
  metadata?: Record<string, any>;
}

export interface ScreeningResult {
  screeningId: string;
  subjectId: string;
  status: ScreeningStatus;
  riskLevel: RiskLevel;
  matches: ScreeningMatch[];
  listsScreened: SanctionsList[];
  screeningDate: DateTime;
  expiryDate: DateTime;
  reviewedBy?: string;
  reviewedAt?: DateTime;
  reviewNotes?: string;
  meta Record<string, any>;
}

export interface ScreeningPolicy {
  id: string;
  name: string;
  listsToScreen: SanctionsList[];
  minimumMatchScore: number; // 0.0 - 1.0
  autoRejectThreshold: number; // Score above which auto-reject
  reviewRequiredThreshold: number; // Score requiring manual review
  refreshIntervalDays: number;
  riskBasedRefresh: {
    [key in RiskLevel]?: number; // Days between refreshes per risk level
  };
  fuzzyMatchingEnabled: boolean;
  phoneticMatchingEnabled: boolean;
  requireAddressVerification: boolean;
  requireDocumentVerification: boolean;
  metadata?: Record<string, any>;
}

export interface ScreeningConfig {
  defaultPolicyId: string;
  screeningProviders: {
    name: string;
    apiKeyEnvVar: string;
    baseUrl: string;
    timeoutMs: number;
    retryAttempts: number;
  }[];
  cacheTtlSeconds: number;
  enableAuditLogging: boolean;
  webhookUrl?: string;
  highRiskThreshold: number;
}

// ==================== CUSTOM ERRORS ====================
export class ComplianceError extends Error {
  constructor(message: string, public readonly code: string) {
    super(`[COMPLIANCE-${code}] ${message}`);
    this.name = 'ComplianceError';
  }
}

export class ScreeningProviderError extends ComplianceError {
  constructor(provider: string, message: string) {
    super(`Provider ${provider}: ${message}`, 'PROVIDER_ERR');
    this.name = 'ScreeningProviderError';
  }
}

export class MatchResolutionError extends ComplianceError {
  constructor(screeningId: string, message: string) {
    super(`Screening ${screeningId}: ${message}`, 'MATCH_RES_ERR');
    this.name = 'MatchResolutionError';
  }
}

// ==================== FUZZY MATCHING ENGINE ====================
export class FuzzyMatcher {
  private readonly phoneticEncodings = new Map<string, string>();
  
  constructor(private readonly config: { usePhonetics: boolean; useLevenshtein: boolean }) {}
  
  matchNames(input: string, candidates: string[]): { candidate: string; score: number }[] {
    const normalizedInput = this.normalize(input);
    const results: { candidate: string; score: number }[] = [];
    
    for (const candidate of candidates) {
      const normalizedCandidate = this.normalize(candidate);
      let score = 0;
      
      // Exact match bonus
      if (normalizedInput === normalizedCandidate) {
        score = 1.0;
      } else {
        // Phonetic matching (Soundex/Metaphone)
        if (this.config.usePhonetics) {
          const inputPhonetic = this.phoneticEncode(normalizedInput);
          const candidatePhonetic = this.phoneticEncode(normalizedCandidate);
          if (inputPhonetic === candidatePhonetic) {
            score = Math.max(score, 0.85);
          }
        }
        
        // Levenshtein distance fallback
        if (this.config.useLevenshtein && score < 0.8) {
          const distance = this.levenshtein(normalizedInput, normalizedCandidate);
          const maxLength = Math.max(normalizedInput.length, normalizedCandidate.length);
          const similarity = maxLength > 0 ? 1 - distance / maxLength : 0;
          score = Math.max(score, similarity * 0.7); // Weight Levenshtein lower than phonetics
        }
      }
      
      if (score >= 0.6) { // Minimum threshold
        results.push({ candidate, score });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }
  
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }
  
  private phoneticEncode(text: string): string {
    // Simplified Soundex implementation
    if (this.phoneticEncodings.has(text)) {
      return this.phoneticEncodings.get(text)!;
    }
    
    const soundex = this.computeSoundex(text);
    this.phoneticEncodings.set(text, soundex);
    return soundex;
  }
  
  private computeSoundex(name: string): string {
    if (!name || name.length === 0) return '';
    
    const normalized = name.toUpperCase().replace(/[^A-Z]/g, '');
    if (normalized.length === 0) return '';
    
    let soundex = normalized[0];
    let previousCode = this.getSoundexCode(normalized[0]);
    let codes = '';
    
    for (let i = 1; i < normalized.length && codes.length < 3; i++) {
      const code = this.getSoundexCode(normalized[i]);
      if (code !== '0' && code !== previousCode) {
        codes += code;
      }
      if (code !== '0') {
        previousCode = code;
      }
    }
    
    return soundex + codes.padEnd(3, '0');
  }
  
  private getSoundexCode(char: string): string {
    const codes: { [key: string]: string } = {
      'BFPV': '1',
      'CGJKQSXZ': '2',
      'DT': '3',
      'L': '4',
      'MN': '5',
      'R': '6'
    };
    
    for (const [letters, code] of Object.entries(codes)) {
      if (letters.includes(char)) return code;
    }
    
    return '0';
  }
  
  private levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix: number[][] = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }
}

// ==================== SCREENING PROVIDER ABSTRACTION ====================
export interface ScreeningProvider {
  name: string;
  screenSubject(subject: ScreeningSubject, lists: SanctionsList[]): Promise<ScreeningMatch[]>;
  getMatchDetails(matchId: string, list: SanctionsList): Promise<ScreeningMatch | null>;
  healthCheck(): Promise<boolean>;
}

export class CompositeScreeningProvider implements ScreeningProvider {
  constructor(
    private readonly providers: ScreeningProvider[],
    private readonly logger?: (level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: any) => void
  ) {}
  
  get name(): string {
    return `composite[${this.providers.map(p => p.name).join(',')}]`;
  }
  
  async screenSubject(subject: ScreeningSubject, lists: SanctionsList[]): Promise<ScreeningMatch[]> {
    const results: ScreeningMatch[] = [];
    const errors: Error[] = [];
    
    // Query providers in parallel with timeout
    await Promise.allSettled(
      this.providers.map(provider => 
        Promise.race([
          provider.screenSubject(subject, lists),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new ScreeningProviderError(provider.name, 'Timeout')), 10000)
          )
        ]).then(matches => {
          results.push(...matches);
          this.logger?.('debug', `Provider ${provider.name} returned ${matches.length} matches`, { subjectId: subject.id });
        }).catch(err => {
          errors.push(err);
          this.logger?.('warn', `Provider ${provider.name} failed`, { subjectId: subject.id, error: err.message });
        })
      )
    );
    
    if (errors.length === this.providers.length) {
      throw new ScreeningProviderError(this.name, `All providers failed: ${errors.map(e => e.message).join('; ')}`);
    }
    
    // Deduplicate matches
    return this.deduplicateMatches(results);
  }
  
  private deduplicateMatches(matches: ScreeningMatch[]): ScreeningMatch[] {
    const unique = new Map<string, ScreeningMatch>();
    
    for (const match of matches) {
      const key = `${match.list}:${match.matchedName.toLowerCase()}:${match.matchScore.toFixed(2)}`;
      
      if (!unique.has(key) || unique.get(key)!.matchScore < match.matchScore) {
        unique.set(key, match);
      }
    }
    
    return Array.from(unique.values());
  }
  
  async getMatchDetails(matchId: string, list: SanctionsList): Promise<ScreeningMatch | null> {
    for (const provider of this.providers) {
      try {
        const details = await provider.getMatchDetails(matchId, list);
        if (details) return details;
      } catch (err) {
        this.logger?.('debug', `Provider ${provider.name} failed to get details`, { matchId, list });
      }
    }
    return null;
  }
  
  async healthCheck(): Promise<boolean> {
    const checks = await Promise.allSettled(this.providers.map(p => p.healthCheck()));
    return checks.some(result => result.status === 'fulfilled' && result.value === true);
  }
}

// ==================== MOCK PROVIDERS FOR DEMONSTRATION ====================
export class MockOFACProvider implements ScreeningProvider {
  name = 'mock_ofac';
  
  async screenSubject(subject: ScreeningSubject, _lists: SanctionsList[]): Promise<ScreeningMatch[]> {
    // Simulate matches based on name patterns
    const matches: ScreeningMatch[] = [];
    
    if (subject.fullName?.toLowerCase().includes('vladimir')) {
      matches.push({
        list: SanctionsList.OFAC_SDN,
        matchId: 'SDN-12345',
        matchedName: 'VLADIMIR ROGOZIN',
        matchScore: 0.92,
        matchDetails: {
          matchedFields: ['fullName'],
          aliases: ['V. ROGOZIN', 'VLADIMIR DMITRIEVICH ROGOZIN'],
          dateOfBirth: '1963-01-01',
          nationality: 'RU',
          sanctionsPrograms: ['UKRAINE-EO13661', 'RUSSIA-EO14024'],
          remarks: 'Deputy Prime Minister of Russia'
        },
        riskLevel: RiskLevel.CRITICAL,
        reviewRequired: true
      });
    }
    
    if (subject.organizationName?.toLowerCase().includes('bank')) {
      matches.push({
        list: SanctionsList.OFAC_CONSOLIDATED,
        matchId: 'CONS-78901',
        matchedName: 'BANK ROSSIYA',
        matchScore: 0.87,
        matchDetails: {
          matchedFields: ['organizationName'],
          sanctionsPrograms: ['UKRAINE-EO13661'],
          remarks: 'Russian financial institution subject to sanctions'
        },
        riskLevel: RiskLevel.HIGH,
        reviewRequired: true
      });
    }
    
    return matches;
  }
  
  async getMatchDetails(matchId: string, _list: SanctionsList): Promise<ScreeningMatch | null> {
    // Return enriched details
    return {
      list: SanctionsList.OFAC_SDN,
      matchId,
      matchedName: 'VLADIMIR ROGOZIN',
      matchScore: 0.92,
      matchDetails: {
        matchedFields: ['fullName'],
        aliases: ['V. ROGOZIN', 'VLADIMIR DMITRIEVICH ROGOZIN', 'VLAD ROGOZIN'],
        dateOfBirth: '1963-01-01',
        nationality: 'RU',
        positions: ['Deputy Prime Minister of Russia', 'Director General of Roscosmos'],
        sanctionsPrograms: ['UKRAINE-EO13661', 'RUSSIA-EO14024'],
        remarks: 'Subject to sanctions pursuant to Executive Orders 13661 and 14024'
      },
      riskLevel: RiskLevel.CRITICAL,
      reviewRequired: true
    };
  }
  
  async healthCheck(): Promise<boolean> {
    return true;
  }
}

export class MockPEPProvider implements ScreeningProvider {
  name = 'mock_pep';
  
  async screenSubject(subject: ScreeningSubject, _lists: SanctionsList[]): Promise<ScreeningMatch[]> {
    const matches: ScreeningMatch[] = [];
    
    if (subject.fullName?.toLowerCase().includes('minister')) {
      matches.push({
        list: SanctionsList.PEP,
        matchId: 'PEP-34567',
        matchedName: 'JOHN SMITH',
        matchScore: 0.89,
        matchDetails: {
          matchedFields: ['fullName'],
          positions: ['Minister of Finance', 'Member of Parliament'],
          nationality: 'GB',
          remarks: 'Foreign PEP - UK government official'
        },
        riskLevel: RiskLevel.MEDIUM,
        reviewRequired: true
      });
    }
    
    return matches;
  }
  
  async getMatchDetails(_matchId: string, _list: SanctionsList): Promise<ScreeningMatch | null> {
    return null;
  }
  
  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// ==================== COMPLIANCE SERVICE ====================
export class ComplianceService {
  private readonly fuzzyMatcher: FuzzyMatcher;
  private readonly screeningProvider: ScreeningProvider;
  
  constructor(
    private readonly config: ScreeningConfig,
    private readonly repositories: {
      screeningRepo: {
        save: (result: ScreeningResult) => Promise<ScreeningResult>;
        findBySubjectId: (subjectId: string, activeOnly?: boolean) => Promise<ScreeningResult | null>;
        findExpired: (before: DateTime) => Promise<ScreeningResult[]>;
      };
      policyRepo: {
        findById: (id: string) => Promise<ScreeningPolicy | null>;
        findDefault: () => Promise<ScreeningPolicy>;
      };
      auditRepo?: {
        logEvent: (eventId: string, subjectId: string, eventType: string,  any) => Promise<void>;
      };
    },
    providers?: ScreeningProvider[],
    private readonly opts: {
      logger?: (level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: any) => void;
      webhookService?: {
        notifyHighRiskMatch: (screening: ScreeningResult, subject: ScreeningSubject) => Promise<void>;
      };
      documentVerificationService?: {
        verifyIdentityDocument: (subjectId: string, documentType: string, documentNumber: string) => Promise<boolean>;
      };
    } = {}
  ) {
    this.fuzzyMatcher = new FuzzyMatcher({
      usePhonetics: true,
      useLevenshtein: true
    });
    
    this.screeningProvider = providers && providers.length > 0
      ? new CompositeScreeningProvider(providers, opts.logger)
      : new CompositeScreeningProvider([
          new MockOFACProvider(),
          new MockPEPProvider()
        ], opts.logger);
  }
  
  async screenSubject(
    subject: ScreeningSubject,
    policyId?: string,
    overrideLists?: SanctionsList[]
  ): Promise<ScreeningResult> {
    // Validate subject
    this.validateSubject(subject);
    
    // Get policy
    const policy = policyId 
      ? await this.repositories.policyRepo.findById(policyId)
      : await this.repositories.policyRepo.findDefault();
    
    if (!policy) {
      throw new ComplianceError('No screening policy available', 'NO_POLICY');
    }
    
    // Determine lists to screen
    const lists = overrideLists || policy.listsToScreen;
    
    // Check for recent valid screening (cache)
    const cached = await this.repositories.screeningRepo.findBySubjectId(subject.id, true);
    if (cached && this.isScreeningStillValid(cached, policy)) {
      this.opts.logger?.('debug', 'Using cached screening result', { subjectId: subject.id, screeningId: cached.screeningId });
      return cached;
    }
    
    // Perform screening
    const rawMatches = await this.screeningProvider.screenSubject(subject, lists);
    
    // Score and filter matches
    const scoredMatches = this.scoreMatches(rawMatches, policy);
    const filteredMatches = this.filterMatches(scoredMatches, policy);
    
    // Determine risk level and status
    const { riskLevel, status } = this.assessRisk(filteredMatches, policy);
    
    // Create result
    const screening: ScreeningResult = {
      screeningId: uuidv4(),
      subjectId: subject.id,
      status,
      riskLevel,
      matches: filteredMatches,
      listsScreened: lists,
      screeningDate: DateTime.now(),
      expiryDate: this.calculateExpiryDate(policy, riskLevel),
      meta {
        policyId: policy.id,
        policyName: policy.name,
        provider: this.screeningProvider.name,
        matchCount: filteredMatches.length,
        rawMatchCount: rawMatches.length,
        subjectHash: this.hashSubject(subject)
      }
    };
    
    // Persist
    const saved = await this.repositories.screeningRepo.save(screening);
    
    // Trigger high-risk alerts
    if (riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.HIGH) {
      await this.opts.webhookService?.notifyHighRiskMatch(saved, subject);
    }
    
    // Log audit event
    await this.logAuditEvent(subject.id, 'screening_completed', {
      screeningId: saved.screeningId,
      riskLevel,
      matchCount: filteredMatches.length,
      status
    });
    
    this.opts.logger?.('info', 'Screening completed', {
      subjectId: subject.id,
      screeningId: saved.screeningId,
      riskLevel,
      matchCount: filteredMatches.length,
      status
    });
    
    return saved;
  }
  
  private validateSubject(subject: ScreeningSubject): void {
    if (!subject.id || subject.id.trim().length < 3) {
      throw new ComplianceError('Subject requires valid ID', 'INVALID_SUBJECT');
    }
    
    if (!subject.entityType) {
      throw new ComplianceError('Subject requires entityType', 'INVALID_SUBJECT');
    }
    
    if (subject.entityType === EntityType.INDIVIDUAL && !subject.fullName && !subject.firstName) {
      throw new ComplianceError('Individual subjects require name information', 'INVALID_SUBJECT');
    }
    
    if (subject.entityType === EntityType.ORGANIZATION && !subject.organizationName) {
      throw new ComplianceError('Organization subjects require organizationName', 'INVALID_SUBJECT');
    }
  }
  
  private isScreeningStillValid(screening: ScreeningResult, policy: ScreeningPolicy): boolean {
    if (screening.status === ScreeningStatus.REJECTED) return false;
    if (DateTime.now() > screening.expiryDate) return false;
    
    // Risk-based refresh check
    const riskRefreshDays = policy.riskBasedRefresh?.[screening.riskLevel];
    if (riskRefreshDays) {
      const refreshThreshold = screening.screeningDate.plus({ days: riskRefreshDays });
      return DateTime.now() < refreshThreshold;
    }
    
    return true;
  }
  
  private scoreMatches(matches: ScreeningMatch[], policy: ScreeningPolicy): ScreeningMatch[] {
    return matches.map(match => {
      // Apply policy adjustments to match score
      let adjustedScore = match.matchScore;
      
      // Boost score for exact identifier matches
      if (match.matchDetails.matchedFields.includes('identifiers')) {
        adjustedScore = Math.min(1.0, adjustedScore + 0.15);
      }
      
      // Boost for date of birth match
      if (match.matchDetails.dateOfBirth) {
        adjustedScore = Math.min(1.0, adjustedScore + 0.1);
      }
      
      // Adjust risk level based on score thresholds
      if (adjustedScore >= policy.autoRejectThreshold) {
        match.riskLevel = RiskLevel.CRITICAL;
        match.reviewRequired = true;
      } else if (adjustedScore >= policy.reviewRequiredThreshold) {
        match.riskLevel = match.riskLevel === RiskLevel.LOW ? RiskLevel.MEDIUM : match.riskLevel;
        match.reviewRequired = true;
      }
      
      return { ...match, matchScore: adjustedScore };
    });
  }
  
  private filterMatches(matches: ScreeningMatch[], policy: ScreeningPolicy): ScreeningMatch[] {
    return matches.filter(match => match.matchScore >= policy.minimumMatchScore);
  }
  
  private assessRisk(matches: ScreeningMatch[], policy: ScreeningPolicy): { riskLevel: RiskLevel; status: ScreeningStatus } {
    if (matches.length === 0) {
      return { riskLevel: RiskLevel.LOW, status: ScreeningStatus.CLEAR };
    }
    
    // Find highest risk match
    const maxRisk = matches.reduce((max, match) => 
      this.riskLevelValue(match.riskLevel) > this.riskLevelValue(max) ? match.riskLevel : max,
      RiskLevel.LOW
    );
    
    // Determine status based on matches and policy
    let status: ScreeningStatus;
    
    const criticalMatches = matches.filter(m => 
      m.riskLevel === RiskLevel.CRITICAL || m.matchScore >= policy.autoRejectThreshold
    );
    
    if (criticalMatches.length > 0) {
      status = ScreeningStatus.REJECTED;
    } else if (matches.some(m => m.reviewRequired)) {
      status = ScreeningStatus.REVIEW_REQUIRED;
    } else {
      status = ScreeningStatus.MATCH_FOUND;
    }
    
    return { riskLevel: maxRisk, status };
  }
  
  private riskLevelValue(level: RiskLevel): number {
    switch (level) {
      case RiskLevel.CRITICAL: return 4;
      case RiskLevel.HIGH: return 3;
      case RiskLevel.MEDIUM: return 2;
      case RiskLevel.LOW: return 1;
      default: return 0;
    }
  }
  
  private calculateExpiryDate(policy: ScreeningPolicy, riskLevel: RiskLevel): DateTime {
    const days = policy.riskBasedRefresh?.[riskLevel] || policy.refreshIntervalDays;
    return DateTime.now().plus({ days });
  }
  
  private hashSubject(subject: ScreeningSubject): string {
    const data = JSON.stringify({
      entityType: subject.entityType,
      fullName: subject.fullName,
      organizationName: subject.organizationName,
      dateOfBirth: subject.dateOfBirth,
      nationality: subject.nationality,
      identifiers: subject.identifiers?.map(i => ({ type: i.type, value: i.value }))
    });
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }
  
  async resolveMatch(
    screeningId: string,
    matchId: string,
    decision: 'accept_match' | 'reject_match' | 'request_more_info',
    reviewerId: string,
    comments?: string
  ): Promise<ScreeningResult> {
    const screening = await this.repositories.screeningRepo.findBySubjectId(screeningId, false);
    if (!screening) {
      throw new ComplianceError(`Screening ${screeningId} not found`, 'NOT_FOUND');
    }
    
    if (![ScreeningStatus.MATCH_FOUND, ScreeningStatus.REVIEW_REQUIRED].includes(screening.status)) {
      throw new MatchResolutionError(screeningId, 'Screening not in reviewable state');
    }
    
    const match = screening.matches.find(m => m.matchId === matchId);
    if (!match) {
      throw new MatchResolutionError(screeningId, `Match ${matchId} not found`);
    }
    
    // Update match metadata with resolution
    match.metadata = {
      ...match.metadata,
      resolution: {
        decision,
        reviewerId,
        comments,
        resolvedAt: DateTime.now().toISO()
      }
    };
    
    // Update screening status based on resolution
    if (decision === 'accept_match') {
      screening.status = ScreeningStatus.REJECTED;
    } else if (decision === 'reject_match') {
      // Remove match from list
      screening.matches = screening.matches.filter(m => m.matchId !== matchId);
      
      // Reassess risk without this match
      if (screening.matches.length === 0) {
        screening.status = ScreeningStatus.CLEAR;
        screening.riskLevel = RiskLevel.LOW;
      }
    }
    
    screening.reviewedBy = reviewerId;
    screening.reviewedAt = DateTime.now();
    screening.reviewNotes = comments;
    screening.updatedAt = DateTime.now();
    
    const saved = await this.repositories.screeningRepo.save(screening);
    
    await this.logAuditEvent(screening.subjectId, 'match_resolved', {
      screeningId,
      matchId,
      decision,
      reviewerId
    });
    
    return saved;
  }
  
  async refreshScreenings(batchSize: number = 50): Promise<number> {
    const expired = await this.repositories.screeningRepo.findExpired(DateTime.now());
    const toRefresh = expired.slice(0, batchSize);
    
    for (const screening of toRefresh) {
      // Retrieve subject (in production: from customer/entity service)
      const subject: ScreeningSubject = {
        id: screening.subjectId,
        entityType: EntityType.INDIVIDUAL, // Placeholder - would fetch actual subject
        fullName: 'John Doe', // Placeholder
        nationality: 'US'
      };
      
      try {
        await this.screenSubject(subject, screening.metadata.policyId);
      } catch (err) {
        this.opts.logger?.('error', 'Failed to refresh screening', {
          screeningId: screening.screeningId,
          subjectId: screening.subjectId,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    
    return toRefresh.length;
  }
  
  async getScreeningReport(subjectId: string): Promise<{
    currentScreening: ScreeningResult | null;
    history: ScreeningResult[];
    riskTrend: 'increasing' | 'stable' | 'decreasing';
  }> {
    // In production: query history from repository
    const current = await this.repositories.screeningRepo.findBySubjectId(subjectId, true);
    const history: ScreeningResult[] = current ? [current] : [];
    
    // Simple trend calculation
    let riskTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (history.length >= 2) {
      const latestRisk = this.riskLevelValue(history[0].riskLevel);
      const previousRisk = this.riskLevelValue(history[1].riskLevel);
      
      if (latestRisk > previousRisk) riskTrend = 'increasing';
      else if (latestRisk < previousRisk) riskTrend = 'decreasing';
    }
    
    return { currentScreening: current, history, riskTrend };
  }
  
  private async logAuditEvent(subjectId: string, eventType: string,  any): Promise<void> {
    if (this.config.enableAuditLogging && this.repositories.auditRepo) {
      await this.repositories.auditRepo.logEvent(
        uuidv4(),
        subjectId,
        eventType,
        {
          ...data,
          timestamp: DateTime.now().toISO()
        }
      );
    }
  }
  
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
    const providerHealthy = await this.screeningProvider.healthCheck();
    
    if (!providerHealthy) {
      return { status: 'degraded', details: { provider: 'unhealthy' } };
    }
    
    return { status: 'healthy', details: { provider: 'healthy' } };
  }
}

// ==================== VALIDATION HELPERS ====================
export function validateScreeningSubject(subject: unknown): asserts subject is ScreeningSubject {
  if (typeof subject !== 'object' || subject === null) {
    throw new ComplianceError('Subject must be an object', 'VALIDATION_ERR');
  }
  
  const s = subject as ScreeningSubject;
  
  if (typeof s.id !== 'string' || !s.id) {
    throw new ComplianceError('Subject requires valid id', 'VALIDATION_ERR');
  }
  
  if (!Object.values(EntityType).includes(s.entityType)) {
    throw new ComplianceError(`Invalid entityType: ${s.entityType}`, 'VALIDATION_ERR');
  }
}

// ==================== EXAMPLE USAGE ====================
/*
const mockScreeningRepo = {
  async save(result: ScreeningResult): Promise<ScreeningResult> {
    console.log('Saved screening:', result.screeningId, result.riskLevel);
    return result;
  },
  async findBySubjectId(_id: string): Promise<ScreeningResult | null> {
    return null;
  },
  async findExpired(_before: DateTime): Promise<ScreeningResult[]> {
    return [];
  }
};

const mockPolicyRepo = {
  async findById(_id: string): Promise<ScreeningPolicy | null> {
    return null;
  },
  async findDefault(): Promise<ScreeningPolicy> {
    return {
      id: 'default-policy',
      name: 'Standard Screening Policy',
      listsToScreen: [
        SanctionsList.OFAC_SDN,
        SanctionsList.OFAC_CONSOLIDATED,
        SanctionsList.PEP
      ],
      minimumMatchScore: 0.65,
      autoRejectThreshold: 0.9,
      reviewRequiredThreshold: 0.75,
      refreshIntervalDays: 90,
      riskBasedRefresh: {
        [RiskLevel.CRITICAL]: 7,
        [RiskLevel.HIGH]: 30,
        [RiskLevel.MEDIUM]: 90,
        [RiskLevel.LOW]: 365
      },
      fuzzyMatchingEnabled: true,
      phoneticMatchingEnabled: true,
      requireAddressVerification: false,
      requireDocumentVerification: false
    };
  }
};

const config: ScreeningConfig = {
  defaultPolicyId: 'default-policy',
  screeningProviders: [],
  cacheTtlSeconds: 3600,
  enableAuditLogging: true
};

const complianceService = new ComplianceService(
  config,
  {
    screeningRepo: mockScreeningRepo,
    policyRepo: mockPolicyRepo
  },
  [new MockOFACProvider(), new MockPEPProvider()]
);

// Usage:
// const subject: ScreeningSubject = {
//   id: 'cust-123',
//   entityType: EntityType.INDIVIDUAL,
//   fullName: 'Vladimir Rogozin',
//   dateOfBirth: '1963-01-01',
//   nationality: 'RU'
// };
// const result = await complianceService.screenSubject(subject);
// console.log('Screening result:', result.status, result.riskLevel);
*/
