// ============================================================================
// CreditorFlow - Anomaly Detection ML Model
// ============================================================================
// Statistical anomaly detection using:
// - Z-score analysis for amount outliers
// - IQR (Interquartile Range) method
// - Time-series frequency analysis
// - Benford's Law for digit distribution
// ============================================================================

export interface AnomalyDetectionInput {
  invoiceId: string;
  supplierId: string;
  amount: number;
  invoiceDate: Date;
  historicalAmounts: number[];
  historicalDates: Date[];
  lineItemAmounts: number[];
}

export interface AnomalyDetectionOutput {
  isAnomaly: boolean;
  confidence: number;
  anomalyType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  details: {
    zScore?: number;
    iqrOutlier?: boolean;
    benfordDeviation?: number;
    frequencySpike?: boolean;
    timeAnomaly?: boolean;
  };
  explanation: string;
}

export class AnomalyDetectionModel {
  private readonly Z_SCORE_THRESHOLD = 2.5;
  private readonly IQR_MULTIPLIER = 1.5;
  private readonly BENFORD_EXPECTED = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

  /**
   * Detect anomalies in invoice data
   */
  async detect(input: AnomalyDetectionInput): Promise<AnomalyDetectionOutput> {
    const results: Partial<AnomalyDetectionOutput['details']> = {};
    let isAnomaly = false;
    let anomalyType = '';
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    const explanations: string[] = [];

    // 1. Z-score analysis
    if (input.historicalAmounts.length >= 5) {
      const zScore = this.calculateZScore(input.amount, input.historicalAmounts);
      results.zScore = zScore;
      
      if (Math.abs(zScore) > this.Z_SCORE_THRESHOLD) {
        isAnomaly = true;
        anomalyType = 'AMOUNT_OUTLIER';
        severity = Math.abs(zScore) > 4 ? 'HIGH' : 'MEDIUM';
        explanations.push(`Amount is ${Math.abs(zScore).toFixed(2)} standard deviations from average`);
      }
    }

    // 2. IQR analysis
    if (input.historicalAmounts.length >= 5) {
      const isIqrOutlier = this.isIQROutlier(input.amount, input.historicalAmounts);
      results.iqrOutlier = isIqrOutlier;
      
      if (isIqrOutlier && !isAnomaly) {
        isAnomaly = true;
        anomalyType = 'AMOUNT_OUTLIER';
        severity = 'MEDIUM';
        explanations.push('Amount falls outside the interquartile range');
      }
    }

    // 3. Frequency analysis
    if (input.historicalDates.length >= 10) {
      const frequencySpike = this.detectFrequencySpike(input.historicalDates);
      results.frequencySpike = frequencySpike;
      
      if (frequencySpike) {
        isAnomaly = true;
        anomalyType = anomalyType || 'FREQUENCY_ANOMALY';
        severity = severity === 'HIGH' ? 'HIGH' : 'MEDIUM';
        explanations.push('Unusual frequency of invoices detected');
      }
    }

    // 4. Time-based anomalies
    const timeAnomaly = this.detectTimeAnomaly(input.invoiceDate);
    results.timeAnomaly = timeAnomaly;
    
    if (timeAnomaly) {
      isAnomaly = true;
      anomalyType = anomalyType || 'TIME_ANOMALY';
      explanations.push('Invoice dated on weekend or holiday');
    }

    // 5. Benford's Law analysis
    if (input.lineItemAmounts.length >= 5) {
      const benfordDeviation = this.calculateBenfordDeviation(input.lineItemAmounts);
      results.benfordDeviation = benfordDeviation;
      
      if (benfordDeviation > 0.3) {
        isAnomaly = true;
        anomalyType = anomalyType || 'DIGIT_ANOMALY';
        severity = benfordDeviation > 0.4 ? 'HIGH' : 'MEDIUM';
        explanations.push('Digit distribution deviates significantly from Benford\'s Law');
      }
    }

    const confidence = this.calculateOverallConfidence(results);

    return {
      isAnomaly,
      confidence,
      anomalyType: anomalyType || 'NONE',
      severity,
      details: results as AnomalyDetectionOutput['details'],
      explanation: explanations.join('; ') || 'No anomalies detected',
    };
  }

  private calculateZScore(value: number, historical: number[]): number {
    const mean = historical.reduce((a, b) => a + b, 0) / historical.length;
    const variance = historical.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / historical.length;
    const stdDev = Math.sqrt(variance);
    return stdDev === 0 ? 0 : (value - mean) / stdDev;
  }

  private isIQROutlier(value: number, historical: number[]): boolean {
    const sorted = [...historical].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - this.IQR_MULTIPLIER * iqr;
    const upperBound = q3 + this.IQR_MULTIPLIER * iqr;
    return value < lowerBound || value > upperBound;
  }

  private detectFrequencySpike(historicalDates: Date[]): boolean {
    // Check if there are unusually many invoices in recent 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    
    const recentCount = historicalDates.filter(d => d > thirtyDaysAgo).length;
    const olderCount = historicalDates.filter(d => d <= thirtyDaysAgo && d > sixtyDaysAgo).length;
    
    if (olderCount === 0) return recentCount > 5;
    return recentCount > olderCount * 2;
  }

  private detectTimeAnomaly(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Weekend
  }

  private calculateBenfordDeviation(amounts: number[]): number {
    const firstDigits = amounts
      .map(a => parseInt(a.toString()[0]))
      .filter(d => d > 0);
    
    if (firstDigits.length < 5) return 0;

    const observed = new Array(9).fill(0);
    firstDigits.forEach(d => observed[d - 1]++);
    
    const total = firstDigits.length;
    const observedFreq = observed.map(c => c / total);
    
    const deviation = observedFreq.reduce((sum, freq, i) => {
      return sum + Math.abs(freq - this.BENFORD_EXPECTED[i]);
    }, 0);

    return deviation / 9;
  }

  private calculateOverallConfidence(details: Partial<AnomalyDetectionOutput['details']>): number {
    let confidence = 0.5;
    
    if (details.zScore !== undefined) {
      confidence += Math.min(Math.abs(details.zScore) * 0.1, 0.2);
    }
    if (details.iqrOutlier) {
      confidence += 0.15;
    }
    if (details.frequencySpike) {
      confidence += 0.1;
    }
    if (details.timeAnomaly) {
      confidence += 0.05;
    }
    if (details.benfordDeviation !== undefined) {
      confidence += Math.min(details.benfordDeviation * 0.2, 0.2);
    }

    return Math.min(confidence, 1.0);
  }
}

export const anomalyDetectionModel = new AnomalyDetectionModel();
export default AnomalyDetectionModel;
