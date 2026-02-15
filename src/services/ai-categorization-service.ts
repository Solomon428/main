import { prisma } from '@/lib/database/client';
import { Invoice, Supplier, LineItem, Prisma } from '@prisma/client';

interface CategoryPrediction {
  category: string;
  confidence: number;
  alternatives: Array<{ category: string; confidence: number }>;
}

interface GLAccountSuggestion {
  glAccount: string;
  costCenter: string;
  confidence: number;
  reason: string;
}

interface InvoiceInsights {
  category: string;
  department: string;
  projectCode: string | null;
  costCenter: string;
  glAccount: string;
  confidence: number;
  anomalies: string[];
  recommendations: string[];
}

export class AICategorizationService {
  // Category mapping based on supplier patterns
  private static categoryPatterns: Record<string, string[]> = {
    'IT_SOFTWARE': ['software', 'license', 'subscription', 'saas', 'cloud', 'microsoft', 'adobe', 'google'],
    'IT_HARDWARE': ['computer', 'laptop', 'server', 'hardware', 'device', 'printer', 'network'],
    'UTILITIES': ['electricity', 'water', 'power', 'utility', 'energy', 'municipality', 'eskom'],
    'LOGISTICS': ['freight', 'shipping', 'transport', 'courier', 'delivery', 'logistics'],
    'MAINTENANCE': ['repair', 'maintenance', 'service', 'parts', 'labour'],
    'CONSULTANCY': ['consulting', 'consultant', 'advisory', 'professional services', 'legal'],
    'MARKETING': ['advertising', 'marketing', 'promotion', 'media', 'campaign', 'seo'],
    'OFFICE': ['stationery', 'office supplies', 'furniture', 'cleaning'],
    'COMMUNICATIONS': ['telephone', 'internet', 'mobile', 'telecom', 'broadband', 'cellular'],
    'INSURANCE': ['insurance', 'premium', 'policy', 'cover'],
    'RENT': ['rent', 'lease', 'property', 'premises', 'building'],
    'TRAVEL': ['travel', 'accommodation', 'hotel', 'flight', 'car hire', 'meals'],
    'TRAINING': ['training', 'course', 'certification', 'education', 'workshop'],
  };

  // GL Account mapping
  private static glAccountMapping: Record<string, { gl: string; costCenter: string }> = {
    'IT_SOFTWARE': { gl: '6100-001', costCenter: 'IT-001' },
    'IT_HARDWARE': { gl: '6100-002', costCenter: 'IT-001' },
    'UTILITIES': { gl: '6200-001', costCenter: 'OPS-001' },
    'LOGISTICS': { gl: '6300-001', costCenter: 'LOG-001' },
    'MAINTENANCE': { gl: '6400-001', costCenter: 'OPS-001' },
    'CONSULTANCY': { gl: '6500-001', costCenter: 'ADM-001' },
    'MARKETING': { gl: '6600-001', costCenter: 'MKT-001' },
    'OFFICE': { gl: '6700-001', costCenter: 'ADM-001' },
    'COMMUNICATIONS': { gl: '6800-001', costCenter: 'ADM-001' },
    'INSURANCE': { gl: '6900-001', costCenter: 'FIN-001' },
    'RENT': { gl: '7000-001', costCenter: 'OPS-001' },
    'TRAVEL': { gl: '7100-001', costCenter: 'ADM-001' },
    'TRAINING': { gl: '7200-001', costCenter: 'HR-001' },
  };

  /**
   * Predict category based on invoice content
   */
  static async predictCategory(
    invoice: Invoice & { supplier: Supplier; lineItems: LineItem[] }
  ): Promise<CategoryPrediction> {
    const text = this.extractInvoiceText(invoice);
    const predictions: Array<{ category: string; score: number }> = [];

    // Pattern matching
    for (const [category, patterns] of Object.entries(this.categoryPatterns)) {
      let score = 0;
      const textLower = text.toLowerCase();

      for (const pattern of patterns) {
        const matches = (textLower.match(new RegExp(pattern, 'gi')) || []).length;
        score += matches * 0.2;
      }

      // Boost score based on supplier category
      if (invoice.supplier.category === category) {
        score += 0.5;
      }

      // Amount-based heuristics
      const amount = Number(invoice.totalAmount);
      if (category === 'RENT' && amount > 10000) score += 0.3;
      if (category === 'INSURANCE' && amount > 5000 && amount < 50000) score += 0.2;

      if (score > 0) {
        predictions.push({ category, score: Math.min(score, 1) });
      }
    }

    // Sort by score
    predictions.sort((a, b) => b.score - a.score);

    const topPrediction = predictions[0] || { category: 'OTHER', score: 0.5 };

    return {
      category: topPrediction.category,
      confidence: topPrediction.score,
      alternatives: predictions.slice(1, 4).map(p => ({
        category: p.category,
        confidence: p.score,
      })),
    };
  }

  /**
   * Suggest GL account and cost center
   */
  static async suggestGLAccount(
    invoice: Invoice & { supplier: Supplier },
    predictedCategory: string
  ): Promise<GLAccountSuggestion> {
    const mapping = this.glAccountMapping[predictedCategory] || {
      gl: '9999-001',
      costCenter: 'GEN-001',
    };

    // Analyze invoice amount for cost center variation
    const amount = Number(invoice.totalAmount);
    let costCenter = mapping.costCenter;

    // High-value invoices go to management cost centers
    if (amount > 100000) {
      costCenter = costCenter.replace('-001', '-MGMT');
    }

    return {
      glAccount: mapping.gl,
      costCenter,
      confidence: 0.85,
      reason: `Based on ${predictedCategory} category and invoice amount of ${amount}`,
    };
  }

  /**
   * Generate comprehensive insights for an invoice
   */
  static async generateInsights(
    invoice: Invoice & { supplier: Supplier; lineItems: LineItem[] }
  ): Promise<InvoiceInsights> {
    const [categoryPrediction, glSuggestion, anomalies, recommendations] = await Promise.all([
      this.predictCategory(invoice),
      this.suggestGLAccount(invoice, 'OTHER'),
      this.detectAnomalies(invoice),
      this.generateRecommendations(invoice),
    ]);

    // Re-get GL suggestion with correct category
    const finalGlSuggestion = await this.suggestGLAccount(
      invoice,
      categoryPrediction.category
    );

    // Determine department from cost center
    const department = this.deriveDepartment(finalGlSuggestion.costCenter);

    return {
      category: categoryPrediction.category,
      department,
      projectCode: this.suggestProjectCode(invoice),
      costCenter: finalGlSuggestion.costCenter,
      glAccount: finalGlSuggestion.glAccount,
      confidence: categoryPrediction.confidence,
      anomalies,
      recommendations,
    };
  }

  /**
   * Auto-categorize multiple invoices
   */
  static async autoCategorizeInvoices(
    invoiceIds: string[],
    confidenceThreshold: number = 0.7
  ): Promise<{
    processed: number;
    categorized: number;
    failed: number;
    results: Array<{
      invoiceId: string;
      success: boolean;
      category?: string;
      confidence?: number;
      error?: string;
    }>;
  }> {
    const results: Array<{
      invoiceId: string;
      success: boolean;
      category?: string;
      confidence?: number;
      error?: string;
    }> = [];

    for (const invoiceId of invoiceIds) {
      try {
        const invoice = await prisma.invoices.findUnique({
          where: { id: invoiceId },
          include: { supplier: true, lineItems: true },
        });

        if (!invoice) {
          results.push({ invoiceId, success: false, error: 'Invoice not found' });
          continue;
        }

        const prediction = await this.predictCategory(invoice);

        if (prediction.confidence >= confidenceThreshold) {
          // Update line items with suggested GL accounts
          const glSuggestion = await this.suggestGLAccount(invoice, prediction.category);

          await prisma.line_items.updateMany({
            where: { invoiceId },
            data: {
              glAccount: glSuggestion.glAccount,
              costCenter: glSuggestion.costCenter,
              category: prediction.category,
            },
          });

          results.push({
            invoiceId,
            success: true,
            category: prediction.category,
            confidence: prediction.confidence,
          });
        } else {
          results.push({
            invoiceId,
            success: false,
            error: `Confidence ${prediction.confidence.toFixed(2)} below threshold`,
          });
        }
      } catch (error) {
        results.push({
          invoiceId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      processed: invoiceIds.length,
      categorized: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  /**
   * Detect anomalies in invoice
   */
  private static async detectAnomalies(
    invoice: Invoice & { supplier: Supplier }
  ): Promise<string[]> {
    const anomalies: string[] = [];

    // Check for amount anomalies
    const amount = Number(invoice.totalAmount);

    // Get historical average for this supplier
    const historicalInvoices = await prisma.invoices.findMany({
      where: {
        supplierId: invoice.supplierId,
        id: { not: invoice.id },
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
      select: { totalAmount: true },
      take: 10,
    });

    if (historicalInvoices.length > 0) {
      const avgAmount =
        historicalInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0) /
        historicalInvoices.length;

      if (amount > avgAmount * 2) {
        anomalies.push(`Invoice amount (${amount.toFixed(2)}) is more than 2x the supplier average (${avgAmount.toFixed(2)})`);
      }

      if (amount < avgAmount * 0.3) {
        anomalies.push(`Invoice amount (${amount.toFixed(2)}) is significantly lower than supplier average`);
      }
    }

    // Check for duplicate patterns
    const similarInvoices = await prisma.invoices.findMany({
      where: {
        supplierId: invoice.supplierId,
        totalAmount: {
          gte: new Decimal(amount * 0.95),
          lte: new Decimal(amount * 1.05),
        },
        invoiceDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
        id: { not: invoice.id },
      },
      take: 5,
    });

    if (similarInvoices.length > 0) {
      anomalies.push(`Found ${similarInvoices.length} similar invoices in the last 30 days - possible duplicate`);
    }

    // Check for weekend/holiday dates
    const invoiceDate = new Date(invoice.invoiceDate);
    const dayOfWeek = invoiceDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      anomalies.push('Invoice date falls on a weekend');
    }

    return anomalies;
  }

  /**
   * Generate recommendations for invoice processing
   */
  private static async generateRecommendations(
    invoice: Invoice & { supplier: Supplier }
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Check supplier risk level
    if (invoice.supplier.riskLevel === 'HIGH' || invoice.supplier.riskLevel === 'CRITICAL') {
      recommendations.push('High-risk supplier - recommend additional verification');
    }

    // Check payment terms
    if (invoice.supplier.paymentTerms > 30) {
      recommendations.push('Consider negotiating better payment terms with this supplier');
    }

    // Check for early payment discount opportunity
    const daysUntilDue = Math.ceil(
      (new Date(invoice.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDue > 14) {
      recommendations.push('Early payment opportunity - consider paying early for potential discount');
    }

    // Check supplier rating
    if (invoice.supplier.rating && Number(invoice.supplier.rating) < 3) {
      recommendations.push('Low-rated supplier - review service quality and consider alternatives');
    }

    return recommendations;
  }

  /**
   * Extract searchable text from invoice
   */
  private static extractInvoiceText(
    invoice: Invoice & { supplier: Supplier; lineItems: LineItem[] }
  ): string {
    const parts = [
      invoice.supplier.name,
      invoice.supplier.tradingName || '',
      invoice.invoiceNumber,
      invoice.notes || '',
      invoice.ocrText || '',
      ...invoice.lineItems.map(item => item.description),
    ];

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Derive department from cost center
   */
  private static deriveDepartment(costCenter: string): string {
    const deptMap: Record<string, string> = {
      'IT': 'IT',
      'OPS': 'OPERATIONS',
      'LOG': 'OPERATIONS',
      'ADM': 'FINANCE',
      'MKT': 'MARKETING',
      'FIN': 'FINANCE',
      'HR': 'HR',
      'GEN': 'GENERAL',
    };

    const prefix = costCenter.split('-')[0];
    return deptMap[prefix] || 'GENERAL';
  }

  /**
   * Suggest project code based on invoice content
   */
  private static suggestProjectCode(
    invoice: Invoice & { supplier: Supplier; lineItems: LineItem[] }
  ): string | null {
    const text = this.extractInvoiceText(invoice).toLowerCase();

    // Look for project patterns
    const projectPatterns = [
      /proj(?:ect)?[-\s]?(\w+)/i,
      /job[-\s]?(\w+)/i,
      /wo[-\s]?(\w+)/i,
      /ref[-\s]?(\w+)/i,
    ];

    for (const pattern of projectPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].toUpperCase().replace(/\s+/g, '-');
      }
    }

    // Default project codes based on category
    if (text.includes('marketing') || text.includes('campaign')) {
      return 'MKT-2024-GEN';
    }
    if (text.includes('infrastructure') || text.includes('upgrade')) {
      return 'INFRA-2024';
    }

    return null;
  }

  /**
   * Get category statistics
   */
  static async getCategoryStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    categories: Array<{
      category: string;
      count: number;
      totalAmount: number;
      avgAmount: number;
    }>;
    total: number;
  }> {
    const where: Prisma.invoicesWhereInput = {
      status: { notIn: ['CANCELLED', 'REJECTED'] },
    };

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = startDate;
      if (endDate) where.invoiceDate.lte = endDate;
    }

    const lineItems = await prisma.line_items.findMany({
      where: {
        invoice: where,
        category: { not: null },
      },
      include: {
        invoice: {
          select: { totalAmount: true },
        },
      },
    });

    const categoryMap = new Map<
      string,
      { count: number; totalAmount: number }
    >();

    for (const item of lineItems) {
      const category = item.category || 'OTHER';
      const existing = categoryMap.get(category) || { count: 0, totalAmount: 0 };

      existing.count += 1;
      existing.totalAmount += Number(item.invoice.totalAmount);

      categoryMap.set(category, existing);
    }

    const categories = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        count: data.count,
        totalAmount: data.totalAmount,
        avgAmount: data.totalAmount / data.count,
      })
    );

    return {
      categories: categories.sort((a, b) => b.totalAmount - a.totalAmount),
      total: categories.reduce((sum, c) => sum + c.count, 0),
    };
  }
}
