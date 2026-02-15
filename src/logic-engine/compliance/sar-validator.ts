// ============================================================================
// CreditorFlow - SAR Validator (Sanctions & PEP)
// ============================================================================
// Validates invoices against sanctions lists and PEP (Politically Exposed Persons)
// - Sanctions list checking (country-based)
// - High-value transaction flagging (>R100,000)
// - PEP keyword matching for supplier names
// - Risk level assessment (LOW/MEDIUM/HIGH)
// ============================================================================

import { prisma } from '@/lib/database/client';
import { EntityType, LogSeverity } from '@/types';
import { auditLogger } from '@/lib/utils/audit-logger';

export interface SanctionsValidationResult {
  isValid: boolean;
  violations: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PEPValidationResult {
  isValid: boolean;
  matches: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class SARSValidator {
  // Sanctioned country codes (ISO 3166-1 alpha-2)
  private static readonly SANCTIONED_COUNTRIES = ['IR', 'KP', 'SY', 'CU', 'AF'];
  
  // Country name to code mapping
  private static readonly COUNTRY_MAP: Record<string, string> = {
    'Iran': 'IR',
    'North Korea': 'KP',
    'Syria': 'SY',
    'Cuba': 'CU',
    'Afghanistan': 'AF',
    'South Africa': 'ZA',
    'United States': 'US',
    'United Kingdom': 'GB',
    'Germany': 'DE',
    'France': 'FR',
    'China': 'CN',
    'Russia': 'RU',
    'India': 'IN',
    'Brazil': 'BR',
    'Japan': 'JP',
    'Australia': 'AU',
    'Canada': 'CA',
    'Italy': 'IT',
    'Spain': 'ES',
    'Netherlands': 'NL',
  };

  // PEP-related keywords for supplier name checking
  private static readonly PEP_KEYWORDS = [
    'minister', 'president', 'governor', 'mayor', 'ambassador',
    'senator', 'parliament', 'congress', 'senate', 'assembly',
    'premier', 'chancellor', 'prime minister', 'head of state',
    'politically exposed', 'government official', 'public official',
    'council', 'municipality', 'department', 'agency',
    'state', 'federal', 'provincial', 'local government',
  ];

  // High-value threshold (ZAR)
  private static readonly HIGH_VALUE_THRESHOLD = 100000;

  /**
   * Validate invoice against sanctions lists
   */
  static async validateSanctions(invoiceId: string): Promise<SanctionsValidationResult> {
    // Use SQLite table name (plural)
    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
      include: { 
        supplier: true, // Note: In SQLite schema, this might need to be handled differently
      },
    });

    if (!invoice) {
      return { 
        isValid: false, 
        violations: ['Invoice not found'], 
        riskLevel: 'HIGH' 
      };
    }

    const violations: string[] = [];

    // Check supplier country if available
    if (invoice.supplierId) {
      const supplier = await prisma.suppliers.findUnique({
        where: { id: invoice.supplierId },
      });
      
      if (supplier?.country) {
        const countryCode = this.getCountryCode(supplier.country);
        if (this.SANCTIONED_COUNTRIES.includes(countryCode)) {
          violations.push(`Supplier country ${supplier.country} (${countryCode}) is sanctioned`);
        }
      }
    }

    // Check for high-value transactions
    const amount = Number(invoice.totalAmount);
    if (amount > this.HIGH_VALUE_THRESHOLD) {
      violations.push(
        `High-value transaction R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ` +
        `requires enhanced due diligence`
      );
    }

    // Determine risk level
    const riskLevel = violations.length > 1 ? 'HIGH' : violations.length > 0 ? 'MEDIUM' : 'LOW';

    // Log sanctions check
    await auditLogger.log({
      action: 'COMPLIANCE_VIOLATION',
      entityType: EntityType.INVOICE,
      entityId: invoiceId,
      entityDescription: `Sanctions check: ${violations.length === 0 ? 'PASSED' : violations.join(', ')}`,
      severity: violations.length > 0 ? LogSeverity.WARNING : LogSeverity.INFO,
      metadata: {
        violations,
        riskLevel,
        amount,
      },
    });

    return {
      isValid: violations.length === 0,
      violations,
      riskLevel,
    };
  }

  /**
   * Validate invoice for PEP (Politically Exposed Person) indicators
   */
  static async validatePEP(invoiceId: string): Promise<PEPValidationResult> {
    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { isValid: false, matches: [], riskLevel: 'HIGH' };
    }

    // Get supplier name
    let supplierName = invoice.supplierName.toLowerCase();
    
    // Also check supplier record if available
    if (invoice.supplierId) {
      const supplier = await prisma.suppliers.findUnique({
        where: { id: invoice.supplierId },
      });
      if (supplier?.name) {
        supplierName = `${supplierName} ${supplier.name}`.toLowerCase();
      }
    }

    // Check for PEP keywords
    const matches = this.PEP_KEYWORDS.filter(keyword =>
      supplierName.includes(keyword.toLowerCase())
    );

    const riskLevel = matches.length > 2 ? 'HIGH' : matches.length > 0 ? 'MEDIUM' : 'LOW';

    // Log PEP check
    await auditLogger.log({
      action: 'COMPLIANCE_VIOLATION',
      entityType: EntityType.INVOICE,
      entityId: invoiceId,
      entityDescription: `PEP check: ${matches.length === 0 ? 'No matches' : `Found: ${matches.join(', ')}`}`,
      severity: matches.length > 0 ? LogSeverity.WARNING : LogSeverity.INFO,
      metadata: {
        supplierName: invoice.supplierName,
        matches,
        riskLevel,
      },
    });

    return {
      isValid: matches.length === 0,
      matches,
      riskLevel,
    };
  }

  /**
   * Get country code from country name
   */
  private static getCountryCode(countryName: string): string {
    // Direct lookup
    if (this.COUNTRY_MAP[countryName]) {
      return this.COUNTRY_MAP[countryName];
    }

    // Case-insensitive lookup
    const normalizedName = countryName.trim();
    for (const [name, code] of Object.entries(this.COUNTRY_MAP)) {
      if (name.toLowerCase() === normalizedName.toLowerCase()) {
        return code;
      }
    }

    // Try to extract 2-letter code if present in parentheses
    const codeMatch = normalizedName.match(/\(([A-Z]{2})\)/);
    if (codeMatch) {
      return codeMatch[1];
    }

    return '';
  }

  /**
   * Run full AML (Anti-Money Laundering) check
   */
  static async runAMLCheck(invoiceId: string): Promise<{
    sanctions: SanctionsValidationResult;
    pep: PEPValidationResult;
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    requiresEnhancedDueDiligence: boolean;
  }> {
    const [sanctions, pep] = await Promise.all([
      this.validateSanctions(invoiceId),
      this.validatePEP(invoiceId),
    ]);

    // Determine overall risk
    let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (sanctions.riskLevel === 'HIGH' || pep.riskLevel === 'HIGH') {
      overallRisk = 'HIGH';
    } else if (sanctions.riskLevel === 'MEDIUM' || pep.riskLevel === 'MEDIUM') {
      overallRisk = 'MEDIUM';
    }

    const requiresEnhancedDueDiligence = overallRisk === 'HIGH' || 
      (!sanctions.isValid && !pep.isValid);

    // Update invoice with compliance status
    await prisma.invoices.update({
      where: { id: invoiceId },
      data: {
        requiresAttention: requiresEnhancedDueDiligence,
      },
    });

    return {
      sanctions,
      pep,
      overallRisk,
      requiresEnhancedDueDiligence,
    };
  }
}

export default SARSValidator;
