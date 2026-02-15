import { Decimal } from 'decimal.js';
import { isAfter } from 'date-fns';
import type { ExtractedInvoiceData, ExtractionConfig } from '../types';
import { validateCurrency } from '../../../../utils/money';
import { validateEmail, validateVAT } from '../../../../utils/validation';
import type { Logger } from '../../../../observability/logger';

export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: Array<{ type: 'error' | 'warning'; message: string; field?: string }>;
}

export async function validateExtractedData(
  extractedData: ExtractedInvoiceData,
  config: ExtractionConfig,
  logger: Logger
): Promise<ValidationResult> {
  try {
    const issues: Array<{ type: 'error' | 'warning'; message: string; field?: string }> = [];
    let score = 100;

    if (extractedData.invoiceNumber) {
      if (extractedData.invoiceNumber.length < 1 || extractedData.invoiceNumber.length > 50) {
        issues.push({
          type: 'warning',
          message: `Invalid invoice number: ${extractedData.invoiceNumber}`,
          field: 'invoiceNumber'
        });
        score -= 10;
      }
    } else {
      issues.push({
        type: 'error',
        message: 'Invoice number is missing',
        field: 'invoiceNumber'
      });
      score -= 20;
    }

    if (extractedData.issueDate) {
      if (!(extractedData.issueDate instanceof Date) || isNaN(extractedData.issueDate.getTime())) {
        issues.push({
          type: 'warning',
          message: 'Invalid issue date',
          field: 'issueDate'
        });
        score -= 5;
      }
    }

    if (extractedData.dueDate) {
      if (!(extractedData.dueDate instanceof Date) || isNaN(extractedData.dueDate.getTime())) {
        issues.push({
          type: 'warning',
          message: 'Invalid due date',
          field: 'dueDate'
        });
        score -= 5;
      } else if (extractedData.issueDate && isAfter(extractedData.issueDate, extractedData.dueDate)) {
        issues.push({
          type: 'warning',
          message: 'Due date is before issue date',
          field: 'dueDate'
        });
        score -= 5;
      }
    }

    if (extractedData.totalAmount) {
      try {
        if (extractedData.totalAmount.lte(0)) {
          issues.push({
            type: 'error',
            message: 'Total amount must be greater than 0',
            field: 'totalAmount'
          });
          score -= 15;
        }
      } catch {
        issues.push({
          type: 'error',
          message: 'Invalid total amount format',
          field: 'totalAmount'
        });
        score -= 15;
      }
    } else {
      issues.push({
        type: 'error',
        message: 'Total amount is missing',
        field: 'totalAmount'
      });
      score -= 20;
    }

    if (extractedData.currency) {
      try {
        validateCurrency(extractedData.currency);
      } catch {
        issues.push({
          type: 'warning',
          message: `Unsupported currency: ${extractedData.currency}`,
          field: 'currency'
        });
        score -= 5;
      }
    }

    if (extractedData.lineItems.length === 0) {
      issues.push({
        type: 'error',
        message: 'No line items found',
        field: 'lineItems'
      });
      score -= 25;
    } else {
      extractedData.lineItems.forEach((item, index) => {
        if (!item.description || item.description.trim().length === 0) {
          issues.push({
            type: 'error',
            message: `Line item ${index + 1}: Description is missing`,
            field: `lineItems[${index}].description`
          });
          score -= 5;
        }

        if (item.quantity.lte(0)) {
          issues.push({
            type: 'error',
            message: `Line item ${index + 1}: Quantity must be greater than 0`,
            field: `lineItems[${index}].quantity`
          });
          score -= 5;
        }

        if (item.unitPrice.lt(0)) {
          issues.push({
            type: 'error',
            message: `Line item ${index + 1}: Unit price cannot be negative`,
            field: `lineItems[${index}].unitPrice`
          });
          score -= 5;
        }
      });
    }

    if (extractedData.supplierVatNumber) {
      const vatValid = validateVAT(extractedData.supplierVatNumber);
      if (!vatValid) {
        issues.push({
          type: 'warning',
          message: 'Supplier VAT number may be invalid',
          field: 'supplierVatNumber'
        });
        score -= 5;
      }
    }

    if (extractedData.supplierEmail) {
      const emailValid = validateEmail(extractedData.supplierEmail);
      if (!emailValid) {
        issues.push({
          type: 'warning',
          message: 'Supplier email may be invalid',
          field: 'supplierEmail'
        });
        score -= 3;
      }
    }

    if (extractedData.lineItems.length > 0) {
      const calculatedTotal = extractedData.lineItems.reduce(
        (sum, item) => sum.plus(item.totalAmount),
        new Decimal(0)
      );

      if (extractedData.totalAmount && !calculatedTotal.equals(extractedData.totalAmount)) {
        const diff = calculatedTotal.minus(extractedData.totalAmount).abs();
        const diffPercentage = diff.dividedBy(extractedData.totalAmount).times(100);

        if (diffPercentage.gt(1)) {
          issues.push({
            type: 'warning',
            message: `Line item total differs from invoice total by ${diffPercentage.toFixed(2)}%`,
            field: 'totalAmount'
          });
          score -= 10;
        }
      }
    }

    score = Math.max(0, Math.min(100, score));

    return {
      isValid: score >= config.confidenceThreshold,
      score,
      issues
    };
  } catch (error) {
    logger.error('Failed to validate extraction', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      isValid: false,
      score: 0,
      issues: [{
        type: 'error',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
}
