/**
 * CREDITORFLOW EMS - API CLIENTS FOR VAT VALIDATION
 * Version: 3.8.4
 *
 * External API integration for VAT validation
 */

import type { VATCheckResult } from "./types";

/**
 * SARS eFiling API configuration
 */
export interface SARSAPIConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
}

/**
 * Default SARS API configuration
 */
export const DEFAULT_SARS_CONFIG: SARSAPIConfig = {
  baseUrl: "https://api.sarsefiling.co.za/v1",
  apiKey: process.env.SARS_API_KEY || "",
  timeout: 30000,
  retryAttempts: 3,
};

/**
 * VIES (VAT Information Exchange System) API configuration for EU
 */
export interface VIESConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

/**
 * Default VIES configuration
 */
export const DEFAULT_VIES_CONFIG: VIESConfig = {
  baseUrl: "http://ec.europa.eu/taxation_customs/vies/services/checkVatService",
  timeout: 30000,
  retryAttempts: 3,
};

/**
 * HMRC API configuration for UK VAT
 */
export interface HMRCConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
}

/**
 * Default HMRC configuration
 */
export const DEFAULT_HMRC_CONFIG: HMRCConfig = {
  baseUrl: "https://api.service.hmrc.gov.uk/organisations/vat",
  apiKey: process.env.HMRC_API_KEY || "",
  timeout: 30000,
  retryAttempts: 3,
};

/**
 * Validate South African VAT number via SARS eFiling API
 * @param vatNumber - VAT number to validate
 * @param config - SARS API configuration
 * @returns Promise with validation result
 */
export async function validateSARSVATNumber(
  vatNumber: string,
  config: SARSAPIConfig = DEFAULT_SARS_CONFIG,
): Promise<VATCheckResult> {
  const normalizedNumber = vatNumber.replace(/\s/g, "");

  try {
    // Note: This is a placeholder implementation
    // In production, this would call the actual SARS API
    const response = await fetch(`${config.baseUrl}/vat/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "X-Request-ID": `vat_${Date.now()}`,
      },
      body: JSON.stringify({ vatNumber: normalizedNumber }),
      signal: AbortSignal.timeout(config.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `SARS API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return {
      isValid: data.valid || false,
      countryCode: "ZA",
      vatNumber: normalizedNumber,
      normalizedNumber,
      errors: data.errors || [],
      warnings: data.warnings || [],
    };
  } catch (error) {
    // Return offline validation result on API failure
    return {
      isValid: false,
      countryCode: "ZA",
      vatNumber: normalizedNumber,
      normalizedNumber,
      errors: [
        `API validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
      warnings: ["Falling back to offline validation"],
    };
  }
}

/**
 * Validate EU VAT number via VIES API
 * @param vatNumber - VAT number with country prefix
 * @param config - VIES configuration
 * @returns Promise with validation result
 */
export async function validateEUVATNumber(
  vatNumber: string,
  config: VIESConfig = DEFAULT_VIES_CONFIG,
): Promise<VATCheckResult> {
  const normalizedNumber = vatNumber.replace(/\s/g, "").toUpperCase();

  // Extract country code from VAT number
  const countryCode = normalizedNumber.substring(0, 2);
  const number = normalizedNumber.substring(2);

  try {
    // Note: This is a placeholder implementation
    // In production, this would call the actual VIES SOAP service
    const response = await fetch(`${config.baseUrl}/check-vat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": `vat_${Date.now()}`,
      },
      body: JSON.stringify({
        countryCode,
        vatNumber: number,
      }),
      signal: AbortSignal.timeout(config.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `VIES API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return {
      isValid: data.valid || false,
      countryCode,
      vatNumber: normalizedNumber,
      normalizedNumber,
      errors: data.errors || [],
      warnings: data.warnings || [],
    };
  } catch (error) {
    return {
      isValid: false,
      countryCode,
      vatNumber: normalizedNumber,
      normalizedNumber,
      errors: [
        `VIES validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
      warnings: ["Falling back to offline validation"],
    };
  }
}

/**
 * Validate UK VAT number via HMRC API
 * @param vatNumber - UK VAT number
 * @param config - HMRC configuration
 * @returns Promise with validation result
 */
export async function validateUKVATNumber(
  vatNumber: string,
  config: HMRCConfig = DEFAULT_HMRC_CONFIG,
): Promise<VATCheckResult> {
  const normalizedNumber = vatNumber.replace(/\s/g, "").toUpperCase();

  // Remove GB prefix if present
  const number = normalizedNumber.startsWith("GB")
    ? normalizedNumber.substring(2)
    : normalizedNumber;

  try {
    // Note: This is a placeholder implementation
    const response = await fetch(
      `${config.baseUrl}/check-vat-number/${number}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: "application/vnd.hmrc.1.0+json",
          "X-Request-ID": `vat_${Date.now()}`,
        },
        signal: AbortSignal.timeout(config.timeout),
      },
    );

    if (!response.ok) {
      throw new Error(
        `HMRC API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return {
      isValid: data.target?.isValid || false,
      countryCode: "GB",
      vatNumber: normalizedNumber,
      normalizedNumber,
      errors: [],
      warnings: [],
    };
  } catch (error) {
    return {
      isValid: false,
      countryCode: "GB",
      vatNumber: normalizedNumber,
      normalizedNumber,
      errors: [
        `HMRC validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
      warnings: ["Falling back to offline validation"],
    };
  }
}

/**
 * Generic VAT validation function that dispatches to appropriate validator
 * @param vatNumber - VAT number to validate
 * @param countryCode - ISO country code
 * @returns Promise with validation result
 */
export async function validateVATNumberViaAPI(
  vatNumber: string,
  countryCode: string,
): Promise<VATCheckResult> {
  const upperCountryCode = countryCode.toUpperCase();

  switch (upperCountryCode) {
    case "ZA":
      return validateSARSVATNumber(vatNumber);

    case "GB":
    case "UK":
      return validateUKVATNumber(vatNumber);

    case "AT":
    case "BE":
    case "BG":
    case "HR":
    case "CY":
    case "CZ":
    case "DK":
    case "EE":
    case "FI":
    case "FR":
    case "DE":
    case "EL":
    case "HU":
    case "IE":
    case "IT":
    case "LV":
    case "LT":
    case "LU":
    case "MT":
    case "NL":
    case "PL":
    case "PT":
    case "RO":
    case "SK":
    case "SI":
    case "ES":
    case "SE":
      return validateEUVATNumber(vatNumber);

    default:
      return {
        isValid: false,
        countryCode: upperCountryCode,
        vatNumber,
        normalizedNumber: vatNumber.replace(/\s/g, ""),
        errors: [
          `API validation not supported for country: ${upperCountryCode}`,
        ],
        warnings: ["Using offline validation only"],
      };
  }
}

/**
 * Batch validate multiple VAT numbers
 * @param vatNumbers - Array of objects with vatNumber and countryCode
 * @returns Promise with array of validation results
 */
export async function batchValidateVATNumbers(
  vatNumbers: Array<{ vatNumber: string; countryCode: string }>,
): Promise<VATCheckResult[]> {
  const results: VATCheckResult[] = [];

  // Process in batches to avoid overwhelming the API
  const batchSize = 10;
  for (let i = 0; i < vatNumbers.length; i += batchSize) {
    const batch = vatNumbers.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(({ vatNumber, countryCode }) =>
        validateVATNumberViaAPI(vatNumber, countryCode),
      ),
    );
    results.push(...batchResults);

    // Small delay between batches to be respectful to APIs
    if (i + batchSize < vatNumbers.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}
