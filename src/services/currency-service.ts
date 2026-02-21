import { prisma } from "@/lib/database/client";

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  source: string;
}

interface ConversionResult {
  originalAmount: number;
  convertedAmount: number;
  exchangeRate: number;
  fromCurrency: string;
  toCurrency: string;
  timestamp: Date;
}

interface MultiCurrencyInvoice {
  id: string;
  invoiceNumber: string;
  originalAmount: number;
  originalCurrency: string;
  baseAmount: number;
  baseCurrency: string;
  exchangeRate: number;
  exchangeRateDate: Date;
}

export class CurrencyService {
  private static baseCurrency = "ZAR";
  private static readonly fallbackRates: Record<string, number> = {
    USD: 18.5,
    EUR: 20.2,
    GBP: 23.4,
    ZAR: 1.0,
    AUD: 12.1,
    CAD: 13.6,
    CHF: 21.3,
    CNY: 2.58,
    JPY: 0.124,
    INR: 0.222,
    BRL: 3.72,
    AED: 5.04,
    SGD: 13.8,
    HKD: 2.37,
    SEK: 1.76,
    NOK: 1.72,
    DKK: 2.71,
    NZD: 11.2,
    MXN: 1.09,
    THB: 0.52,
    MYR: 3.94,
    KES: 0.14,
    NGN: 0.023,
    EGP: 0.6,
  };

  /**
   * Get current exchange rate
   */
  static async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRate> {
    // Normalize currency codes
    fromCurrency = fromCurrency.toUpperCase();
    toCurrency = toCurrency.toUpperCase();

    // Same currency
    if (fromCurrency === toCurrency) {
      return {
        from: fromCurrency,
        to: toCurrency,
        rate: 1,
        timestamp: new Date(),
        source: "internal",
      };
    }

    // Try to get from database cache first
    const cachedRate = await this.getCachedRate(fromCurrency, toCurrency);
    if (cachedRate && this.isRateFresh(cachedRate.timestamp)) {
      return cachedRate;
    }

    // Try to fetch from API
    try {
      const apiRate = await this.fetchExchangeRateFromAPI(
        fromCurrency,
        toCurrency,
      );
      await this.cacheExchangeRate(apiRate);
      return apiRate;
    } catch (error) {
      console.warn(
        "Failed to fetch exchange rate from API, using fallback:",
        error,
      );

      // Use fallback rates
      const fallbackRate = this.getFallbackRate(fromCurrency, toCurrency);
      return {
        from: fromCurrency,
        to: toCurrency,
        rate: fallbackRate,
        timestamp: new Date(),
        source: "fallback",
      };
    }
  }

  /**
   * Convert amount between currencies
   */
  static async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ConversionResult> {
    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
    const originalAmount = Number(amount);
    const convertedAmount = originalAmount * exchangeRate.rate;

    return {
      originalAmount,
      convertedAmount,
      exchangeRate: exchangeRate.rate,
      fromCurrency,
      toCurrency,
      timestamp: exchangeRate.timestamp,
    };
  }

  /**
   * Convert to base currency (ZAR)
   */
  static async convertToBase(
    amount: number,
    fromCurrency: string,
  ): Promise<ConversionResult> {
    return this.convert(amount, fromCurrency, this.baseCurrency);
  }

  /**
   * Process invoice with multi-currency support
   */
  static async processInvoiceCurrency(
    invoiceId: string,
  ): Promise<MultiCurrencyInvoice | null> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { supplier: true },
    });

    if (!invoice) return null;

    // If already in base currency, return as-is
    if (invoice.currency === this.baseCurrency) {
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        originalAmount: Number(invoice.totalAmount),
        originalCurrency: invoice.currency,
        baseAmount: Number(invoice.totalAmount),
        baseCurrency: this.baseCurrency,
        exchangeRate: 1,
        exchangeRateDate: new Date(),
      };
    }

    // Convert to base currency
    const conversion = await this.convertToBase(
      invoice.totalAmount,
      invoice.currency,
    );

    // Update invoice with conversion data
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        // Store conversion metadata in a JSON field or separate table
        // For now, we'll just return the conversion
      },
    });

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      originalAmount: conversion.originalAmount,
      originalCurrency: conversion.fromCurrency,
      baseAmount: conversion.convertedAmount,
      baseCurrency: conversion.toCurrency,
      exchangeRate: conversion.exchangeRate,
      exchangeRateDate: conversion.timestamp,
    };
  }

  /**
   * Get supported currencies
   */
  static getSupportedCurrencies(): Array<{
    code: string;
    name: string;
    symbol: string;
    flag: string;
  }> {
    return [
      { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦" },
      { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
      { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
      { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
      { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺" },
      { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦" },
      { code: "CHF", name: "Swiss Franc", symbol: "Fr", flag: "🇨🇭" },
      { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
      { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵" },
      { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
      { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷" },
      { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪" },
      { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬" },
      { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", flag: "🇭🇰" },
      { code: "SEK", name: "Swedish Krona", symbol: "kr", flag: "🇸🇪" },
      { code: "NOK", name: "Norwegian Krone", symbol: "kr", flag: "🇳🇴" },
      { code: "DKK", name: "Danish Krone", symbol: "kr", flag: "🇩🇰" },
      { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", flag: "🇳🇿" },
      { code: "MXN", name: "Mexican Peso", symbol: "$", flag: "🇲🇽" },
      { code: "THB", name: "Thai Baht", symbol: "฿", flag: "🇹🇭" },
      { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", flag: "🇲🇾" },
      { code: "KES", name: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪" },
      { code: "NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬" },
      { code: "EGP", name: "Egyptian Pound", symbol: "E£", flag: "🇪🇬" },
    ];
  }

  /**
   * Get exchange rate history
   */
  static async getRateHistory(
    currency: string,
    days: number = 30,
  ): Promise<Array<{ date: Date; rate: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query from exchange rate history table if available
    // For now, return simulated data based on current rate
    const currentRate = await this.getExchangeRate(currency, this.baseCurrency);
    const history: Array<{ date: Date; rate: number }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Simulate small variations
      const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
      history.push({
        date,
        rate: currentRate.rate * (1 + variation),
      });
    }

    return history.reverse();
  }

  /**
   * Calculate currency exposure
   */
  static async calculateCurrencyExposure(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string[];
  }): Promise<{
    baseCurrency: string;
    exposure: Array<{
      currency: string;
      totalOriginal: number;
      totalBase: number;
      invoiceCount: number;
      avgExchangeRate: number;
      unrealizedGainLoss: number;
    }>;
    totalBaseAmount: number;
  }> {
    const where: any = {
      currency: { not: this.baseCurrency },
    };

    if (filters?.status) {
      where.status = { in: filters.status };
    }

    if (filters?.startDate || filters?.endDate) {
      where.invoiceDate = {};
      if (filters.startDate) where.invoiceDate.gte = filters.startDate;
      if (filters.endDate) where.invoiceDate.lte = filters.endDate;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        currency: true,
        totalAmount: true,
        createdAt: true,
      },
    });

    // Group by currency
    const currencyMap = new Map<
      string,
      {
        originalAmount: number;
        invoiceCount: number;
      }
    >();

    for (const invoice of invoices) {
      const existing = currencyMap.get(invoice.currency) || {
        originalAmount: 0,
        invoiceCount: 0,
      };

      existing.originalAmount += Number(invoice.totalAmount);
      existing.invoiceCount += 1;

      currencyMap.set(invoice.currency, existing);
    }

    // Calculate exposure for each currency
    const exposure: Array<{
      currency: string;
      totalOriginal: number;
      totalBase: number;
      invoiceCount: number;
      avgExchangeRate: number;
      unrealizedGainLoss: number;
    }> = [];

    for (const [currency, data] of currencyMap.entries()) {
      const currentRate = await this.getExchangeRate(
        currency,
        this.baseCurrency,
      );
      const totalBase = data.originalAmount * currentRate.rate;

      exposure.push({
        currency,
        totalOriginal: data.originalAmount,
        totalBase,
        invoiceCount: data.invoiceCount,
        avgExchangeRate: currentRate.rate,
        unrealizedGainLoss: 0, // Would need original rates for accurate calculation
      });
    }

    return {
      baseCurrency: this.baseCurrency,
      exposure: exposure.sort((a, b) => b.totalBase - a.totalBase),
      totalBaseAmount: exposure.reduce((sum, e) => sum + e.totalBase, 0),
    };
  }

  /**
   * Format amount for display
   */
  static formatAmount(
    amount: number,
    currency: string,
    locale: string = "en-ZA",
  ): string {
    const currencyInfo = this.getSupportedCurrencies().find(
      (c) => c.code === currency.toUpperCase(),
    );

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  // Private methods

  private static async getCachedRate(
    from: string,
    to: string,
  ): Promise<ExchangeRate | null> {
    // Check if exchange rate table exists in schema
    // For now, return null to use fallback
    return null;
  }

  private static async fetchExchangeRateFromAPI(
    from: string,
    to: string,
  ): Promise<ExchangeRate> {
    // Try exchangerate-api.com (free tier available)
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;

    if (!apiKey) {
      throw new Error("Exchange rate API key not configured");
    }

    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}`,
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== "success") {
      throw new Error(`API error: ${data["error-type"]}`);
    }

    return {
      from: data.base_code,
      to: data.target_code,
      rate: data.conversion_rate,
      timestamp: new Date(data.time_last_update_utc),
      source: "exchangerate-api",
    };
  }

  private static async cacheExchangeRate(rate: ExchangeRate): Promise<void> {
    // Cache in database if exchange rate table exists
    // For now, just log
    console.log("Caching exchange rate:", rate);
  }

  private static isRateFresh(timestamp: Date): boolean {
    const maxAge = 60 * 60 * 1000; // 1 hour
    return Date.now() - timestamp.getTime() < maxAge;
  }

  private static getFallbackRate(from: string, to: string): number {
    const fromRate = this.fallbackRates[from.toUpperCase()];
    const toRate = this.fallbackRates[to.toUpperCase()];

    if (!fromRate || !toRate) {
      throw new Error(`No fallback rate available for ${from} or ${to}`);
    }

    // Cross rate calculation
    return toRate / fromRate;
  }
}
