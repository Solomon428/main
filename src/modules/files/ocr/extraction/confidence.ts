import { Decimal } from "decimal.js";
import type { ExtractedInvoiceData, ExtractionConfig } from "./types";
import { CONFIDENCE_WEIGHTS, EXTRACTION_METHOD_MULTIPLIERS } from "./constants";

export interface ConfidenceCalculationInput {
  data: ExtractedInvoiceData;
  validationScore: number;
}

export function calculateOverallConfidence(
  input: ConfidenceCalculationInput,
  config: ExtractionConfig,
): number {
  const { data, validationScore } = input;
  const weights = CONFIDENCE_WEIGHTS;

  let confidence = 0;

  if (data.invoiceNumber) confidence += weights.invoiceNumber * 0.8;
  else confidence += weights.invoiceNumber * 0.2;

  if (data.issueDate && data.dueDate) confidence += weights.dates * 0.9;
  else if (data.issueDate || data.dueDate) confidence += weights.dates * 0.5;
  else confidence += weights.dates * 0.1;

  if (data.totalAmount) confidence += weights.amounts * 0.8;
  else confidence += weights.amounts * 0.2;

  if (data.lineItems.length > 0) {
    const avgLineItemConfidence =
      data.lineItems.reduce((sum, item) => sum + item.confidence, 0) /
      data.lineItems.length;
    confidence += weights.lineItems * (avgLineItemConfidence / 100);
  } else {
    confidence += weights.lineItems * 0.1;
  }

  confidence += weights.validation * (validationScore / 100);

  const multiplier =
    EXTRACTION_METHOD_MULTIPLIERS[data.extractionMethod] ?? 1.0;
  confidence *= multiplier;

  return Math.min(100, Math.max(0, confidence));
}

export function calculateLineItemConfidence(
  description: string,
  quantity: Decimal,
  unitPrice: Decimal,
  hasTotal: boolean,
): number {
  let confidence = 70;

  if (description.length > 5) confidence += 10;
  if (quantity.gt(0)) confidence += 10;
  if (unitPrice.gt(0)) confidence += 10;
  if (hasTotal) confidence += 10;

  return Math.min(100, confidence);
}

export function getConfidenceLevel(
  confidence: number,
): "high" | "medium" | "low" {
  if (confidence >= 80) return "high";
  if (confidence >= 60) return "medium";
  return "low";
}

export function isConfidenceAcceptable(
  confidence: number,
  threshold?: number,
): boolean {
  const minThreshold = threshold ?? 70;
  return confidence >= minThreshold;
}
