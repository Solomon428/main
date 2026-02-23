// Helper to validate and normalize invoice status filters coming from query params
// The actual enum values come from Prisma schema. This helper normalizes input and
// returns an array of status strings suitable for Prisma's `in` operator.
export function parseInvoiceStatusFilter(input: string): string[] {
  if (!input) return [];
  // Split by comma, trim, and normalize to uppercase for consistency
  const tokens = input
    .split(',')
    .map(t => (typeof t === 'string' ? t.trim().toUpperCase() : ''))
    .filter(t => t.length > 0);
  // Optionally, filter to a known set if you want to strictly constrain values.
  // Without exposing Prisma enum here, we return the normalized tokens and rely on
  // Prisma to reject invalid values at query time if needed.
  return tokens;
}
