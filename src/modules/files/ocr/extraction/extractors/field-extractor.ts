import { Decimal } from 'decimal.js';
import { isValid, parse } from 'date-fns';
import { Currency } from '../../../../domain/enums/Currency';
import type { ExtractionConfig, ExtractedLineItem } from '../types';

export function parseDateString(dateStr: string, config: ExtractionConfig): Date | null {
  for (const format of config.dateFormats) {
    try {
      const parsed = parse(dateStr, format, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      // Try next format
    }
  }

  try {
    const parsed = new Date(dateStr);
    if (isValid(parsed)) {
      return parsed;
    }
  } catch {
    // Parse failed
  }

  return null;
}

export function parseAmountString(
  amountStr: string,
  config: ExtractionConfig
): { amount: Decimal | null; currency: Currency | null } {
  try {
    let currency: Currency | null = null;
    let numericStr = amountStr;

    for (const [symbol, curr] of Object.entries(config.currencySymbols)) {
      if (amountStr.includes(symbol)) {
        currency = curr;
        numericStr = numericStr.replace(symbol, '').trim();
        break;
      }
    }

    const match = numericStr.match(/(\d+[\.,]\d{2})/);
    if (!match) {
      return { amount: null, currency };
    }

    const amount = new Decimal(match[1].replace(',', '.'));
    return { amount, currency };
  } catch {
    return { amount: null, currency: null };
  }
}

export function extractSupplierName(text: string): string | undefined {
  const lines = text.split('\n');

  const patterns = [
    /^(?:from|supplier|vendor|billed by)[:\s]+(.+)/i,
    /^([A-Z][A-Za-z\s&\.]+(?:Inc|Ltd|LLC|GmbH|Pty|Ltd\.?|Corp|Corporation|Company)?\.?)$/,
    /^([A-Z][A-Za-z\s]+(?:Address|Street|Road|Ave|Avenue| Blvd|Boulevard)?)$/i
  ];

  for (const line of lines) {
    const trimmed = line.trim();

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length > 3 && name.length < 100 && !name.includes('@') && !name.includes('http')) {
          return name;
        }
      }
    }
  }

  return undefined;
}

export function calculateMissingAmounts(lineItems: ExtractedLineItem[]): ExtractedLineItem[] {
  return lineItems.map(item => {
    const calculatedItem = { ...item };

    if (!calculatedItem.totalAmount || calculatedItem.totalAmount.equals(0)) {
      if (calculatedItem.quantity && calculatedItem.unitPrice) {
        calculatedItem.totalAmount = calculatedItem.quantity.times(calculatedItem.unitPrice);

        if (calculatedItem.discountAmount) {
          calculatedItem.totalAmount = calculatedItem.totalAmount.minus(calculatedItem.discountAmount);
        } else if (calculatedItem.discountRate) {
          const discount = calculatedItem.totalAmount.times(calculatedItem.discountRate.dividedBy(100));
          calculatedItem.totalAmount = calculatedItem.totalAmount.minus(discount);
          calculatedItem.discountAmount = discount;
        }
      }
    }

    if (!calculatedItem.unitPrice || calculatedItem.unitPrice.equals(0)) {
      if (calculatedItem.quantity && calculatedItem.totalAmount) {
        calculatedItem.unitPrice = calculatedItem.totalAmount.dividedBy(calculatedItem.quantity);
      }
    }

    if (!calculatedItem.quantity || calculatedItem.quantity.equals(0)) {
      if (calculatedItem.unitPrice && calculatedItem.totalAmount) {
        calculatedItem.quantity = calculatedItem.totalAmount.dividedBy(calculatedItem.unitPrice);
      }
    }

    if (!calculatedItem.taxAmount && calculatedItem.taxRate) {
      calculatedItem.taxAmount = calculatedItem.totalAmount
        .times(calculatedItem.taxRate.dividedBy(100));
    }

    let completenessScore = 0;
    if (calculatedItem.description) completenessScore += 25;
    if (calculatedItem.quantity && calculatedItem.quantity.gt(0)) completenessScore += 25;
    if (calculatedItem.unitPrice && calculatedItem.unitPrice.gt(0)) completenessScore += 25;
    if (calculatedItem.totalAmount && calculatedItem.totalAmount.gt(0)) completenessScore += 25;

    calculatedItem.confidence = Math.min(100, (calculatedItem.confidence + completenessScore) / 2);

    return calculatedItem;
  });
}
