import { Decimal } from 'decimal.js';
import type { ExtractionConfig, ExtractedInvoiceData, ExtractedLineItem } from '../types';
import { parseDateString, parseAmountString, extractSupplierName } from './field-extractor';
import type { Logger } from '../../../../observability/logger';

export async function extractWithRegexInternal(
  text: string,
  config: ExtractionConfig,
  logger: Logger
): Promise<ExtractedInvoiceData> {
  const extracted: ExtractedInvoiceData = {
    lineItems: [],
    confidence: 0,
    extractionMethod: 'regex',
    metadata: {},
    warnings: [],
    errors: []
  };

  let matchScore = 0;
  let totalMatches = 0;

  for (const pattern of config.regexPatterns.invoiceNumber) {
    const match = text.match(pattern);
    if (match && match[1]) {
      extracted.invoiceNumber = match[1].trim();
      matchScore += 15;
      totalMatches++;
      break;
    }
  }

  for (const pattern of config.regexPatterns.date) {
    const matches = text.matchAll(new RegExp(pattern, 'gi'));
    for (const match of matches) {
      if (match[1]) {
        const dateStr = match[1].trim();
        const parsedDate = parseDateString(dateStr, config);
        if (parsedDate) {
          const context = match[0].toLowerCase();
          if (context.includes('due') || context.includes('payment')) {
            extracted.dueDate = parsedDate;
          } else {
            extracted.issueDate = extracted.issueDate || parsedDate;
          }
          matchScore += 10;
          totalMatches++;
        }
      }
    }
  }

  for (const pattern of config.regexPatterns.amount) {
    const matches = text.matchAll(new RegExp(pattern, 'gi'));
    for (const match of matches) {
      if (match[1]) {
        const amountStr = match[1].trim();
        const { amount, currency } = parseAmountString(amountStr, config);

        if (amount) {
          const context = match[0].toLowerCase();
          if (context.includes('total') || context.includes('balance') || context.includes('grand')) {
            extracted.totalAmount = extracted.totalAmount || amount;
            if (!extracted.currency && currency) {
              extracted.currency = currency;
            }
          } else if (context.includes('sub') || context.includes('sub-total')) {
            extracted.subtotalAmount = extracted.subtotalAmount || amount;
          } else if (context.includes('tax') || context.includes('vat') || context.includes('gst')) {
            extracted.taxAmount = extracted.taxAmount || amount;
          }
          matchScore += 10;
          totalMatches++;
        }
      }
    }
  }

  for (const pattern of config.regexPatterns.vatNumber) {
    const match = text.match(pattern);
    if (match && match[1]) {
      extracted.supplierVatNumber = match[1].trim();
      matchScore += 10;
      totalMatches++;
      break;
    }
  }

  for (const pattern of config.regexPatterns.email) {
    const match = text.match(pattern);
    if (match && match[0]) {
      extracted.supplierEmail = match[0].trim();
      matchScore += 5;
      totalMatches++;
      break;
    }
  }

  for (const pattern of config.regexPatterns.phone) {
    const match = text.match(pattern);
    if (match && match[0]) {
      extracted.supplierPhone = match[0].trim();
      matchScore += 5;
      totalMatches++;
      break;
    }
  }

  extracted.lineItems = extractLineItems(text, config, logger);
  extracted.supplierName = extractSupplierName(text);

  const maxPossibleScore = 100;
  extracted.confidence = totalMatches > 0 ? (matchScore / maxPossibleScore) * 100 : 0;

  extracted.metadata = {
    regexMatches: totalMatches,
    matchScore,
    lineItemsExtracted: extracted.lineItems.length,
    extractionTimestamp: new Date().toISOString()
  };

  return extracted;
}

export function extractLineItems(text: string, config: ExtractionConfig, logger: Logger): ExtractedLineItem[] {
  const lineItems: ExtractedLineItem[] = [];
  const lines = text.split('\n');

  let lineNumber = 1;
  let inLineItemsSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.toLowerCase().includes('description') &&
        (line.toLowerCase().includes('quantity') || line.toLowerCase().includes('amount'))) {
      inLineItemsSection = true;
      continue;
    }

    if (inLineItemsSection) {
      for (const pattern of config.regexPatterns.lineItem) {
        const match = line.match(pattern);
        if (match) {
          try {
            const lineItem = parseLineItemMatch(match, lineNumber, line, config);
            if (lineItem) {
              lineItems.push(lineItem);
              lineNumber++;
            }
          } catch {
            // Skip this line if parsing fails
          }
          break;
        }
      }

      if (line.toLowerCase().includes('total') || line.toLowerCase().includes('subtotal') ||
          line.toLowerCase().includes('balance') || line === '') {
        let nextLineHasItem = false;
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim();
          for (const pattern of config.regexPatterns.lineItem) {
            if (nextLine.match(pattern)) {
              nextLineHasItem = true;
              break;
            }
          }
          if (nextLineHasItem) break;
        }
        if (!nextLineHasItem) {
          inLineItemsSection = false;
        }
      }
    }
  }

  if (lineItems.length === 0) {
    lineItems.push(...extractLineItemsHeuristic(text));
  }

  return lineItems;
}

function parseLineItemMatch(
  match: RegExpMatchArray,
  lineNumber: number,
  originalText: string,
  config: ExtractionConfig
): ExtractedLineItem | null {
  try {
    let description = '';
    let quantity = new Decimal(1);
    let unitPrice = new Decimal(0);
    let totalAmount = new Decimal(0);

    if (match.length >= 6) {
      quantity = new Decimal(match[3].replace(',', '.'));
      description = match[2].trim();
      unitPrice = new Decimal(match[4].replace(',', '.'));
      totalAmount = new Decimal(match[5].replace(',', '.'));
    } else if (match.length >= 5) {
      description = match[1].trim();
      quantity = new Decimal(match[2]);
      unitPrice = new Decimal(match[3].replace(',', '.'));
      totalAmount = new Decimal(match[4].replace(',', '.'));
    } else if (match.length >= 4) {
      description = match[2].trim();
      unitPrice = new Decimal(match[3].replace(',', '.'));
      totalAmount = new Decimal(match[4].replace(',', '.'));
      if (!unitPrice.equals(0)) {
        quantity = totalAmount.dividedBy(unitPrice);
      }
    } else {
      return null;
    }

    let confidence = 70;
    if (description.length > 5) confidence += 10;
    if (quantity.gt(0)) confidence += 10;
    if (unitPrice.gt(0)) confidence += 10;

    const taxRate = config.defaultTaxRate;
    const taxAmount = totalAmount.minus(totalAmount.dividedBy(taxRate.plus(1)));

    return {
      lineNumber,
      description,
      quantity,
      unitPrice,
      totalAmount,
      taxRate,
      taxAmount,
      confidence: Math.min(100, confidence),
      extractedText: originalText
    };
  } catch {
    return null;
  }
}

function extractLineItemsHeuristic(text: string): ExtractedLineItem[] {
  const lineItems: ExtractedLineItem[] = [];
  const lines = text.split('\n');

  let lineNumber = 1;
  let collectingDescription = false;
  let currentDescription: string[] = [];
  let lastAmount: Decimal | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const amountMatch = line.match(/(\d+[\.,]\d{2})/);
    if (amountMatch) {
      const amount = new Decimal(amountMatch[1].replace(',', '.'));

      if (collectingDescription && currentDescription.length > 0 && lastAmount) {
        const description = currentDescription.join(' ').trim();

        const words = description.split(' ');
        let quantity = new Decimal(1);
        let unitPrice = amount;

        if (words.length > 1 && !isNaN(parseFloat(words[0]))) {
          quantity = new Decimal(words[0]);
          unitPrice = amount.dividedBy(quantity);
        }

        const lineItem: ExtractedLineItem = {
          lineNumber,
          description: words.slice(1).join(' ') || description,
          quantity,
          unitPrice,
          totalAmount: amount,
          confidence: 60,
          extractedText: line
        };

        lineItems.push(lineItem);
        lineNumber++;

        collectingDescription = false;
        currentDescription = [];
        lastAmount = null;
      } else {
        collectingDescription = true;
        lastAmount = amount;
      }
    } else if (collectingDescription && line.length > 3) {
      currentDescription.push(line);
    }
  }

  return lineItems;
}
