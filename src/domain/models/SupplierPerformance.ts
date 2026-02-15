export interface SupplierPerformance {
  id: string;
  supplierId: string;
  period: string;
  onTimeDelivery?: unknown | null; // Decimal
  qualityScore?: unknown | null; // Decimal
  priceCompetitiveness?: unknown | null; // Decimal
  serviceLevel?: unknown | null; // Decimal
  overallScore?: unknown | null; // Decimal
  invoiceCount: number;
  totalAmount: unknown; // Decimal
  avgProcessingDays?: unknown | null; // Decimal
  createdAt: Date;
}
