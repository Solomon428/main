// ============================================================================
// CreditorFlow - Anomaly Detector
// ============================================================================
// Detects statistical anomalies in invoice data:
// - Amount outliers (using Z-score and IQR methods)
// - Frequency anomalies (unexpected invoice patterns)
// - Supplier behavior changes
// - Time-based anomalies (weekend/holiday invoices)
// ============================================================================

import { prisma } from "@/lib/database/client";

export interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  details: string;
}

export interface SupplierBehaviorMetrics {
  averageInvoiceAmount: number;
  invoiceFrequency: number;
  averageProcessingTime: number;
  amountVariance: number;
}

export class AnomalyDetector {
  private static readonly Z_SCORE_THRESHOLD = 2.5;
  private static readonly IQR_MULTIPLIER = 1.5;

  /**
   * Detect amount outliers for a supplier
   */
  static async detectAmountOutliers(
    supplierId: string,
    currentAmount: number,
  ): Promise<AnomalyResult> {
    // Get historical invoices for this supplier
    const historicalInvoices = await prisma.invoice.findMany({
      where: {
        supplierId,
        status: { not: "CANCELLED" },
      },
      select: {
        totalAmount: true,
      },
    });

    if (historicalInvoices.length < 5) {
      return {
        isAnomaly: false,
        score: 0,
        type: "INSUFFICIENT_DATA",
        severity: "LOW",
        details: "Not enough historical data for anomaly detection",
      };
    }

    const amounts = historicalInvoices.map((inv) => Number(inv.totalAmount));

    // Calculate statistics
    const mean = this.calculateMean(amounts);
    const stdDev = this.calculateStdDev(amounts, mean);
    const zScore = Math.abs((currentAmount - mean) / stdDev);

    // Calculate IQR
    const sortedAmounts = amounts.sort((a, b) => a - b);
    const q1 = this.calculatePercentile(sortedAmounts, 25);
    const q3 = this.calculatePercentile(sortedAmounts, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - this.IQR_MULTIPLIER * iqr;
    const upperBound = q3 + this.IQR_MULTIPLIER * iqr;

    const isIQRAnomaly =
      currentAmount < lowerBound || currentAmount > upperBound;
    const isZScoreAnomaly = zScore > this.Z_SCORE_THRESHOLD;

    if (isZScoreAnomaly || isIQRAnomaly) {
      const severity = zScore > 4 ? "HIGH" : zScore > 3 ? "MEDIUM" : "LOW";
      return {
        isAnomaly: true,
        score: Math.min(zScore / 4, 1),
        type: "AMOUNT_OUTLIER",
        severity,
        details:
          `Amount R${currentAmount.toLocaleString()} is ${zScore.toFixed(2)} standard deviations ` +
          `from mean (R${mean.toLocaleString()}). Expected range: R${lowerBound.toLocaleString()} - R${upperBound.toLocaleString()}`,
      };
    }

    return {
      isAnomaly: false,
      score: zScore / this.Z_SCORE_THRESHOLD,
      type: "AMOUNT_NORMAL",
      severity: "LOW",
      details: `Amount within normal range (Z-score: ${zScore.toFixed(2)})`,
    };
  }

  /**
   * Detect frequency anomalies (too many invoices in short period)
   */
  static async detectFrequencyAnomaly(
    supplierId: string,
    lookbackDays: number = 30,
  ): Promise<AnomalyResult> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    // Count recent invoices
    const recentCount = await prisma.invoice.count({
      where: {
        supplierId,
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Get historical average (excluding recent period)
    const historicalStart = new Date(startDate);
    historicalStart.setDate(historicalStart.getDate() - 90);

    const historicalCount = await prisma.invoice.count({
      where: {
        supplierId,
        createdAt: {
          gte: historicalStart,
          lt: startDate,
        },
      },
    });

    const historicalAverage = historicalCount / 3; // Per 30 days

    if (historicalAverage === 0) {
      return {
        isAnomaly: recentCount > 5,
        score: recentCount > 5 ? 0.7 : 0,
        type: "FREQUENCY_ANOMALY",
        severity: recentCount > 5 ? "MEDIUM" : "LOW",
        details:
          recentCount > 5
            ? `New supplier with ${recentCount} invoices in ${lookbackDays} days`
            : "No historical data for comparison",
      };
    }

    const ratio = recentCount / historicalAverage;

    if (ratio > 3) {
      return {
        isAnomaly: true,
        score: Math.min((ratio - 1) / 3, 1),
        type: "FREQUENCY_ANOMALY",
        severity: ratio > 5 ? "HIGH" : "MEDIUM",
        details:
          `${recentCount} invoices in ${lookbackDays} days ` +
          `(${ratio.toFixed(1)}x historical average of ${historicalAverage.toFixed(1)})`,
      };
    }

    return {
      isAnomaly: false,
      score: ratio / 3,
      type: "FREQUENCY_NORMAL",
      severity: "LOW",
      details: `Invoice frequency normal (${recentCount} in ${lookbackDays} days)`,
    };
  }

  /**
   * Detect time-based anomalies (weekend/holiday invoices)
   */
  static detectTimeAnomalies(invoiceDate: Date): AnomalyResult {
    const day = invoiceDate.getDay();
    const isWeekend = day === 0 || day === 6;

    // Check for common South African holidays (simplified)
    const month = invoiceDate.getMonth();
    const date = invoiceDate.getDate();

    const isHoliday = [
      { month: 0, date: 1 }, // New Year
      { month: 2, date: 21 }, // Human Rights Day
      { month: 3, date: 27 }, // Freedom Day
      { month: 4, date: 1 }, // Workers Day
      { month: 5, date: 16 }, // Youth Day
      { month: 7, date: 9 }, // Women's Day
      { month: 8, date: 24 }, // Heritage Day
      { month: 11, date: 16 }, // Reconciliation Day
      { month: 11, date: 25 }, // Christmas
      { month: 11, date: 26 }, // Day of Goodwill
    ].some((h) => h.month === month && h.date === date);

    if (isHoliday) {
      return {
        isAnomaly: true,
        score: 0.6,
        type: "HOLIDAY_INVOICE",
        severity: "MEDIUM",
        details: "Invoice dated on a public holiday",
      };
    }

    if (isWeekend) {
      return {
        isAnomaly: true,
        score: 0.4,
        type: "WEEKEND_INVOICE",
        severity: "LOW",
        details: "Invoice dated on a weekend",
      };
    }

    return {
      isAnomaly: false,
      score: 0,
      type: "WEEKDAY_INVOICE",
      severity: "LOW",
      details: "Invoice dated on a business day",
    };
  }

  /**
   * Detect supplier behavior changes
   */
  static async detectBehaviorChange(
    supplierId: string,
  ): Promise<AnomalyResult> {
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Get recent invoices (last 3 months)
    const recentInvoices = await prisma.invoice.findMany({
      where: {
        supplierId,
        invoiceDate: {
          gte: threeMonthsAgo,
        },
      },
    });

    // Get older invoices (3-6 months ago)
    const olderInvoices = await prisma.invoice.findMany({
      where: {
        supplierId,
        invoiceDate: {
          gte: sixMonthsAgo,
          lt: threeMonthsAgo,
        },
      },
    });

    if (recentInvoices.length < 3 || olderInvoices.length < 3) {
      return {
        isAnomaly: false,
        score: 0,
        type: "INSUFFICIENT_DATA",
        severity: "LOW",
        details: "Not enough data for behavior analysis",
      };
    }

    const recentAmounts = recentInvoices.map((inv) => Number(inv.totalAmount));
    const olderAmounts = olderInvoices.map((inv) => Number(inv.totalAmount));

    const recentAvg = this.calculateMean(recentAmounts);
    const olderAvg = this.calculateMean(olderAmounts);

    const change = Math.abs(recentAvg - olderAvg) / olderAvg;

    if (change > 0.5) {
      const direction = recentAvg > olderAvg ? "increase" : "decrease";
      return {
        isAnomaly: true,
        score: Math.min(change, 1),
        type: "BEHAVIOR_CHANGE",
        severity: change > 1 ? "HIGH" : "MEDIUM",
        details:
          `Average invoice amount ${direction}d by ${(change * 100).toFixed(1)}% ` +
          `(from R${olderAvg.toLocaleString()} to R${recentAvg.toLocaleString()})`,
      };
    }

    return {
      isAnomaly: false,
      score: change,
      type: "BEHAVIOR_STABLE",
      severity: "LOW",
      details: "Supplier behavior consistent with historical patterns",
    };
  }

  /**
   * Run all anomaly checks
   */
  static async runFullAnalysis(invoiceId: string): Promise<{
    anomalies: AnomalyResult[];
    overallRisk: "LOW" | "MEDIUM" | "HIGH";
    requiresInvestigation: boolean;
  }> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return {
        anomalies: [],
        overallRisk: "LOW",
        requiresInvestigation: false,
      };
    }

    const anomalies: AnomalyResult[] = [];

    // Amount outlier detection
    if (invoice.supplierId) {
      const amountAnomaly = await this.detectAmountOutliers(
        invoice.supplierId,
        Number(invoice.totalAmount),
      );
      if (amountAnomaly.isAnomaly) anomalies.push(amountAnomaly);

      // Frequency anomaly
      const frequencyAnomaly = await this.detectFrequencyAnomaly(
        invoice.supplierId,
      );
      if (frequencyAnomaly.isAnomaly) anomalies.push(frequencyAnomaly);

      // Behavior change
      const behaviorAnomaly = await this.detectBehaviorChange(
        invoice.supplierId,
      );
      if (behaviorAnomaly.isAnomaly) anomalies.push(behaviorAnomaly);
    }

    // Time anomaly
    const timeAnomaly = this.detectTimeAnomalies(invoice.invoiceDate);
    if (timeAnomaly.isAnomaly) anomalies.push(timeAnomaly);

    // Calculate overall risk
    const highSeverityCount = anomalies.filter(
      (a) => a.severity === "HIGH",
    ).length;
    const mediumSeverityCount = anomalies.filter(
      (a) => a.severity === "MEDIUM",
    ).length;

    let overallRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (highSeverityCount > 0 || anomalies.length >= 3) {
      overallRisk = "HIGH";
    } else if (mediumSeverityCount > 0 || anomalies.length >= 2) {
      overallRisk = "MEDIUM";
    }

    return {
      anomalies,
      overallRisk,
      requiresInvestigation: overallRisk === "HIGH" || anomalies.length >= 2,
    };
  }

  // Helper methods
  private static calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private static calculateStdDev(values: number[], mean: number): number {
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private static calculatePercentile(
    sortedValues: number[],
    percentile: number,
  ): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sortedValues.length) return sortedValues[lower];
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }
}

export default AnomalyDetector;
