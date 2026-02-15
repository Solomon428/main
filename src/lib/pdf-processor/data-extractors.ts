/**
 * PDF Processor Data Extractors
 * Field extraction methods for invoice data
 */

import { generateRandomString } from './utils';

export function extractInvoiceNumber(text: string): string {
  const patterns = [
    /(?:invoice\s*(?:#|number)?|inv\.?|tax\s+invoice)[:\s]*([A-Z0-9\-\/]{6,20})/i,
    /(?:document\s+number|ref\s+no)[:\s]*([A-Z0-9\-\/]{6,20})/i,
    /([A-Z]{2,4}\d{4,10})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return `INV_${Date.now()}`;
}

export function extractInvoiceDate(text: string): Date {
  const patterns = [
    /(?:invoice\s+date|date\s+of\s+issue|issued\s+on)[:\s]*(\d{1,2}\s+[a-z]{3}\s+\d{4})/i,
    /(?:invoice\s+date|date)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const dateStr = match[1].replace(/-/g, '/');
      return new Date(dateStr);
    }
  }
  
  return new Date();
}

export function extractSupplierVAT(text: string): string | undefined {
  const match = text.match(/(?:vat\s*(?:no|number)?|tax\s+no)[:\s]*(4\d{9})/i);
  return match ? match[1].replace(/\s/g, '') : undefined;
}

export function extractTotalAmount(text: string): number {
  const match = text.match(/(?:total\s+amount|amount\s+due|grand\s+total|balance\s+due)[:\s]*R?\s*([\d,]+\.?\d{0,2})/i);
  return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
}

export function extractSubtotalExclVAT(text: string): number | undefined {
  const match = text.match(/(?:subtotal|amount\s+exclusive\s+vat|excl\.?\s+vat)[:\s]*R?\s*([\d,]+\.?\d{0,2})/i);
  return match ? parseFloat(match[1].replace(/,/g, '')) : undefined;
}

export function extractVATAmount(text: string): number | undefined {
  const match = text.match(/(?:vat\s*15%|vat\s+amount|vat)[:\s]*R?\s*([\d,]+\.?\d{0,2})/i);
  return match ? parseFloat(match[1].replace(/,/g, '')) : undefined;
}

export function extractSupplierName(text: string): string {
  const match = text.match(/(?:supplier|vendor|from)[:\s]*([A-Z][a-z\s\.\,\&\-]{5,50})/i);
  return match ? match[1].trim() : 'Unknown Supplier';
}

export function extractDueDate(text: string): Date {
  const match = text.match(/(?:due\s+date|payment\s+due)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
  return match ? new Date(match[1].replace(/-/g, '/')) : new Date(Date.now() + 30 * 86400000);
}

export function extractLineItems(
  tables: any[],
  text: string,
  processingId: string
): Array<{
  lineNumber?: number;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  vatRate?: number;
  vatAmount?: number;
  metadata?: Record<string, any>;
}> {
  return [];
}
