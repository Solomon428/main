import { z } from 'zod';
import { Decimal } from 'decimal.js';
import type { ExtractedInvoiceData, ExtractedLineItem, ExtractionConfig } from './types';

export function createValidationSchemas() {
  return {
    invoiceNumber: z.string().min(1).max(50),
    date: z.date(),
    amount: z.string().regex(/^\d+[\.,]\d{2}$/),
    vatNumber: z.string().min(5).max(20),
    email: z.string().email(),
    phone: z.string().min(8).max(20)
  };
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractSection(text: string, startMarker: string, endMarker?: string): string | null {
  const startIndex = text.toLowerCase().indexOf(startMarker.toLowerCase());
  if (startIndex === -1) return null;

  let endIndex = text.length;
  if (endMarker) {
    const foundEnd = text.toLowerCase().indexOf(endMarker.toLowerCase(), startIndex + startMarker.length);
    if (foundEnd !== -1) {
      endIndex = foundEnd;
    }
  }

  return text.substring(startIndex, endIndex).trim();
}

export function findLinesContaining(text: string, keywords: string[]): string[] {
  const lines = text.split('\n');
  const lowerKeywords = keywords.map(k => k.toLowerCase());

  return lines.filter(line => {
    const lowerLine = line.toLowerCase();
    return lowerKeywords.some(keyword => lowerLine.includes(keyword));
  });
}

export function extractValueAfterLabel(text: string, labels: string[]): string | null {
  const lines = text.split('\n');

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    for (const label of labels) {
      const lowerLabel = label.toLowerCase();
      if (lowerLine.includes(lowerLabel)) {
        const index = lowerLine.indexOf(lowerLabel);
        const afterLabel = line.substring(index + label.length).trim();
        const cleaned = afterLabel.replace(/^[:\s]+/, '');
        if (cleaned.length > 0) {
          return cleaned;
        }
      }
    }
  }

  return null;
}

export function extractAmountsFromText(text: string): Array<{ value: string; context: string }> {
  const results: Array<{ value: string; context: string }> = [];
  const amountPattern = /(\d+[\.,]\d{2})/g;
  const lines = text.split('\n');

  for (const line of lines) {
    const matches = line.matchAll(amountPattern);
    for (const match of matches) {
      results.push({
        value: match[1],
        context: line.trim()
      });
    }
  }

  return results;
}

export function extractDatesFromText(text: string): Array<{ value: string; context: string }> {
  const results: Array<{ value: string; context: string }> = [];
  const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g;
  const lines = text.split('\n');

  for (const line of lines) {
    const matches = line.matchAll(datePattern);
    for (const match of matches) {
      results.push({
        value: match[1],
        context: line.trim()
      });
    }
  }

  return results;
}

export function mergeLineItems(items: ExtractedLineItem[]): ExtractedLineItem[] {
  const merged = new Map<string, ExtractedLineItem>();

  for (const item of items) {
    const key = `${item.description.toLowerCase().trim()}_${item.unitPrice.toString()}`;

    if (merged.has(key)) {
      const existing = merged.get(key)!;
      existing.quantity = existing.quantity.plus(item.quantity);
      existing.totalAmount = existing.totalAmount.plus(item.totalAmount);
      existing.confidence = Math.max(existing.confidence, item.confidence);
    } else {
      merged.set(key, { ...item });
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.lineNumber - b.lineNumber);
}

export function sanitizeExtractedText(text: string): string {
  return text
    .replace(/[^\x20-\x7E\n\r\t]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseNumber(value: string, config: ExtractionConfig): Decimal | null {
  try {
    const normalized = value.replace(/,/g, '.');
    const num = new Decimal(normalized);
    return num.isNaN() ? null : num;
  } catch {
    return null;
  }
}
