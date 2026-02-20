// ============================================================================
// CreditorFlow - Fraud Detection ML Model
// ============================================================================
// Rule-based fraud scoring system with:
// - Weighted risk factor analysis
// - Historical pattern comparison
// - Supplier risk correlation
// - Behavioral anomaly detection
// ============================================================================

export interface FraudDetectionInput {
  invoiceId: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  invoiceDate: Date;
  supplierRiskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  currency: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  historicalInvoices: Array<{
    amount: number;
    date: Date;
    status: string;
  }>;
  extractionConfidence: number;
}

export interface FraudDetectionOutput {
  fraudScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  requiresInvestigation: boolean;
  riskFactors: Array<{
    name: string;
    score: number;
    weight: number;
    description: string;
  }>;
  explanation: string;
}

export class FraudDetectionModel {
  private readonly INVESTIGATION_THRESHOLD = 60;
  private readonly HIGH_RISK_THRESHOLD = 80;
  private readonly MEDIUM_RISK_THRESHOLD = 40;
  private readonly LOW_RISK_THRESHOLD = 20;

  private readonly RISK_WEIGHTS = {
    SUPPLIER_RISK: 0.25,
    AMOUNT_ANOMALY: 0.2,
    DUPLICATE_PATTERN: 0.2,
    EXTRACTION_CONFIDENCE: 0.15,
    DATE_ANOMALY: 0.1,
    ROUND_NUMBER: 0.05,
    BENFORD_LAW: 0.05,
  };

  /**
   * Analyze invoice for fraud indicators
   */
  async analyze(input: FraudDetectionInput): Promise<FraudDetectionOutput> {
    const riskFactors: FraudDetectionOutput["riskFactors"] = [];
    let totalScore = 0;

    // 1. Supplier Risk Assessment
    const supplierScore = this.assessSupplierRisk(input.supplierRiskLevel);
    riskFactors.push({
      name: "SUPPLIER_RISK",
      score: supplierScore,
      weight: this.RISK_WEIGHTS.SUPPLIER_RISK,
      description: `Supplier has ${input.supplierRiskLevel.toLowerCase()} risk profile`,
    });
    totalScore += supplierScore * this.RISK_WEIGHTS.SUPPLIER_RISK;

    // 2. Amount Anomaly Detection
    const amountScore = this.detectAmountAnomaly(
      input.amount,
      input.historicalInvoices,
    );
    if (amountScore > 0) {
      riskFactors.push({
        name: "AMOUNT_ANOMALY",
        score: amountScore,
        weight: this.RISK_WEIGHTS.AMOUNT_ANOMALY,
        description:
          "Invoice amount deviates significantly from historical patterns",
      });
      totalScore += amountScore * this.RISK_WEIGHTS.AMOUNT_ANOMALY;
    }

    // 3. Duplicate Pattern Detection
    const duplicateScore = this.detectDuplicatePattern(
      input.amount,
      input.invoiceDate,
      input.historicalInvoices,
    );
    if (duplicateScore > 0) {
      riskFactors.push({
        name: "DUPLICATE_PATTERN",
        score: duplicateScore,
        weight: this.RISK_WEIGHTS.DUPLICATE_PATTERN,
        description: "Similar invoice pattern detected in recent history",
      });
      totalScore += duplicateScore * this.RISK_WEIGHTS.DUPLICATE_PATTERN;
    }

    // 4. Extraction Confidence
    const extractionScore = this.assessExtractionConfidence(
      input.extractionConfidence,
    );
    if (extractionScore > 0) {
      riskFactors.push({
        name: "EXTRACTION_CONFIDENCE",
        score: extractionScore,
        weight: this.RISK_WEIGHTS.EXTRACTION_CONFIDENCE,
        description: `Low OCR confidence (${(input.extractionConfidence * 100).toFixed(0)}%) may indicate document manipulation`,
      });
      totalScore += extractionScore * this.RISK_WEIGHTS.EXTRACTION_CONFIDENCE;
    }

    // 5. Date Anomaly
    const dateScore = this.assessDateAnomaly(input.invoiceDate);
    if (dateScore > 0) {
      riskFactors.push({
        name: "DATE_ANOMALY",
        score: dateScore,
        weight: this.RISK_WEIGHTS.DATE_ANOMALY,
        description: "Invoice date shows temporal anomaly",
      });
      totalScore += dateScore * this.RISK_WEIGHTS.DATE_ANOMALY;
    }

    // 6. Round Number Detection
    const roundNumberScore = this.detectRoundNumber(input.amount);
    if (roundNumberScore > 0) {
      riskFactors.push({
        name: "ROUND_NUMBER",
        score: roundNumberScore,
        weight: this.RISK_WEIGHTS.ROUND_NUMBER,
        description: "Suspicious round number amount detected",
      });
      totalScore += roundNumberScore * this.RISK_WEIGHTS.ROUND_NUMBER;
    }

    // 7. Benford's Law Analysis
    const benfordScore = this.analyzeBenfordLaw(
      input.lineItems.map((li) => li.total),
    );
    if (benfordScore > 0) {
      riskFactors.push({
        name: "BENFORD_LAW",
        score: benfordScore,
        weight: this.RISK_WEIGHTS.BENFORD_LAW,
        description: "Digit distribution deviates from expected patterns",
      });
      totalScore += benfordScore * this.RISK_WEIGHTS.BENFORD_LAW;
    }

    const fraudScore = Math.round(totalScore);
    const riskLevel = this.determineRiskLevel(fraudScore);
    const requiresInvestigation = fraudScore >= this.INVESTIGATION_THRESHOLD;

    return {
      fraudScore,
      riskLevel,
      confidence: this.calculateConfidence(riskFactors),
      requiresInvestigation,
      riskFactors,
      explanation: this.generateExplanation(fraudScore, riskFactors),
    };
  }

  private assessSupplierRisk(riskLevel: string): number {
    const scores: Record<string, number> = {
      LOW: 0,
      MEDIUM: 35,
      HIGH: 70,
      CRITICAL: 100,
    };
    return scores[riskLevel] || 35;
  }

  private detectAmountAnomaly(
    amount: number,
    historical: Array<{ amount: number }>,
  ): number {
    if (historical.length < 5) return 0;

    const amounts = historical.map((h) => h.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const max = Math.max(...amounts);

    if (amount > mean * 3) return 100;
    if (amount > mean * 2) return 80;
    if (amount > mean * 1.5) return 50;
    if (amount > max) return 70;

    return 0;
  }

  private detectDuplicatePattern(
    amount: number,
    date: Date,
    historical: Array<{ amount: number; date: Date }>,
  ): number {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const similarInvoices = historical.filter((h) => {
      const amountMatch = Math.abs(h.amount - amount) / amount < 0.05;
      const recent = new Date(h.date) > thirtyDaysAgo;
      return amountMatch && recent;
    });

    if (similarInvoices.length >= 3) return 100;
    if (similarInvoices.length === 2) return 70;
    if (similarInvoices.length === 1) return 30;

    return 0;
  }

  private assessExtractionConfidence(confidence: number): number {
    if (confidence < 0.3) return 100;
    if (confidence < 0.5) return 60;
    if (confidence < 0.7) return 30;
    return 0;
  }

  private assessDateAnomaly(date: Date): number {
    const now = new Date();
    const inputDate = new Date(date);

    // Future date
    if (inputDate > now) return 80;

    // Very old date (> 90 days)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    if (inputDate < ninetyDaysAgo) return 50;

    // Weekend
    const day = inputDate.getDay();
    if (day === 0 || day === 6) return 20;

    return 0;
  }

  private detectRoundNumber(amount: number): number {
    // Check for suspicious round numbers
    if (amount >= 100000 && amount % 100000 === 0) return 60;
    if (amount >= 10000 && amount % 10000 === 0) return 40;
    if (amount >= 1000 && amount % 1000 === 0) return 20;

    // Check for repeated digits
    const amountStr = Math.round(amount).toString();
    const repeatedPattern = /(\d)\1{3,}/;
    if (repeatedPattern.test(amountStr)) return 30;

    return 0;
  }

  private analyzeBenfordLaw(amounts: number[]): number {
    if (amounts.length < 5) return 0;

    const firstDigits = amounts
      .map((a) => parseInt(a.toString()[0]))
      .filter((d) => d > 0);

    if (firstDigits.length < 5) return 0;

    const expected = [
      0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046,
    ];
    const observed = new Array(9).fill(0);

    firstDigits.forEach((d) => observed[d - 1]++);
    const total = firstDigits.length;

    const deviation =
      observed.reduce((sum, count, i) => {
        const freq = count / total;
        return sum + Math.abs(freq - expected[i]);
      }, 0) / 9;

    if (deviation > 0.3) return 80;
    if (deviation > 0.2) return 50;
    if (deviation > 0.15) return 25;

    return 0;
  }

  private determineRiskLevel(score: number): FraudDetectionOutput["riskLevel"] {
    if (score >= this.HIGH_RISK_THRESHOLD) return "CRITICAL";
    if (score >= this.MEDIUM_RISK_THRESHOLD) return "HIGH";
    if (score >= this.LOW_RISK_THRESHOLD) return "MEDIUM";
    return "LOW";
  }

  private calculateConfidence(
    riskFactors: FraudDetectionOutput["riskFactors"],
  ): number {
    if (riskFactors.length === 0) return 0.8;
    return Math.min(0.5 + riskFactors.length * 0.1, 0.95);
  }

  private generateExplanation(
    score: number,
    riskFactors: FraudDetectionOutput["riskFactors"],
  ): string {
    if (score === 0) {
      return "No fraud indicators detected. Invoice appears normal.";
    }

    const topFactors = riskFactors
      .sort((a, b) => b.score * b.weight - a.score * a.weight)
      .slice(0, 3);

    const factorDescriptions = topFactors.map((f) => f.description).join("; ");

    if (score >= this.HIGH_RISK_THRESHOLD) {
      return `CRITICAL: High fraud risk detected (${score}/100). Primary concerns: ${factorDescriptions}`;
    }
    if (score >= this.MEDIUM_RISK_THRESHOLD) {
      return `WARNING: Elevated fraud risk (${score}/100). Review recommended. Factors: ${factorDescriptions}`;
    }
    return `LOW RISK: Minor anomalies detected (${score}/100). ${factorDescriptions}`;
  }
}

export const fraudDetectionModel = new FraudDetectionModel();
export default FraudDetectionModel;
