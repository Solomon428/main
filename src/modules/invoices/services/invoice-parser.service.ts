export interface ParsedLineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
}

export interface ParsedInvoice {
  invoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  supplierName?: string;
  supplierVat?: string;
  totalAmount?: number;
  currency?: string;
  lineItems?: ParsedLineItem[];
  notes?: string;
}

export class InvoiceParser {
  static parse(text: string): Partial<ParsedInvoice> {
    const data: Partial<ParsedInvoice> = {};
    if (!text) return data;

    const t = text;
    const extract = (r: RegExp) => {
      const m = t.match(r);
      return m && m[1] ? m[1].trim() : undefined;
    };

    data.invoiceNumber = extract(/(?:invoice|inv|invoice number|inv no|invoice no)[:#\-\s]*([A-Za-z0-9\-]+(?:\s*[A-Za-z0-9\-]+)*)/i);

    // Date extraction (try common formats)
    const dateMatch = t.match(/(\b\d{1,2}[\/\-\.\s]\d{1,2}[\/\-\.\s]\d{2,4}\b)/);
    if (dateMatch && dateMatch[1]) {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d.getTime())) data.invoiceDate = d;
    }
    const dueMatch = t.match(/(?:due date|payment due|due)[:\s]*([A-Za-z0-9\-\/\s,]+)\b/i);
    if (dueMatch && dueMatch[1]) {
      const d = new Date(dueMatch[1]);
      if (!isNaN(d.getTime())) data.dueDate = d;
    }

    // Total amount
    const totalMatch = t.match(/(?:total|amount due|amount payable|grand total|total amount)[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (totalMatch && totalMatch[1]) {
      const val = totalMatch[1].replace(/,/g, '');
      data.totalAmount = parseFloat(val);
    }

    // Supplier name heuristics
    const supplierMatch = t.match(/(?:supplier|bill to|vendor)[:\s]*([^\r\n]+)$/im);
    if (supplierMatch && supplierMatch[1]) data.supplierName = supplierMatch[1].trim();

    // Currency (simple guess)
    const currencyMatch = t.match(/currency[:\s]*([A-Z]{3})/i);
    if (currencyMatch && currencyMatch[1]) data.currency = currencyMatch[1];

    // Simple line items extraction (best-effort heuristic)
    const lines = t.split(/\r?\n/);
    const items: ParsedLineItem[] = [];
    for (const line of lines) {
      // Look for lines with at least 3 numeric tokens: desc | qty | price
      const parts = line.trim().split(/\s{2,}/);
      if (parts.length >= 3) {
        const idxQty = parts.length - 2;
        const idxPrice = parts.length - 1;
        const maybeQty = Number(parts[idxQty]);
        const rawPrice = parts[idxPrice] ?? '';
        const maybeUnit = Number(rawPrice.replace(/[^0-9.]/g, ''));
        if (!Number.isNaN(maybeQty) && !Number.isNaN(maybeUnit)) {
          const desc = parts.slice(0, parts.length - 2).join(' ');
          const description = (desc ?? '').trim();
          items.push({ description, quantity: maybeQty, unitPrice: maybeUnit } as ParsedLineItem);
        }
      }
    }
    if (items.length) data.lineItems = items;

    return data;
  }
}
