// ============================================================================
// Validation Utilities
// ============================================================================

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// South African ID number regex
const SA_ID_REGEX = /^[0-9]{13}$/;

// VAT number regex patterns by country
const VAT_PATTERNS: Record<string, RegExp> = {
  ZA: /^4[0-9]{9}$/, // South African VAT number
  GB: /^GB[0-9]{9}$/,
  EU: /^EU[0-9]{9}$/,
  US: /^[0-9]{2}-[0-9]{7}$/,
};

// Bank account patterns (simplified)
const BANK_ACCOUNT_REGEX = /^[0-9]{8,16}$/;

// Invoice number regex (alphanumeric, dashes, slashes)
const INVOICE_NUMBER_REGEX = /^[A-Za-z0-9\-\/]{3,50}$/;

// Phone number regex (South Africa)
const PHONE_REGEX = /^(\+27|0)[1-9][0-9]{8}$/;

// URL regex
const URL_REGEX = /^https?:\/\/.+/;

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validate VAT number
 */
export function validateVAT(
  vatNumber: string,
  country: string = "ZA",
): boolean {
  const pattern = VAT_PATTERNS[country] || VAT_PATTERNS.ZA;
  return pattern.test(vatNumber);
}

/**
 * Validate bank account number
 */
export function validateBankAccount(
  accountNumber: string,
  bankCode?: string,
): boolean {
  // Basic validation - would need more sophisticated check per country
  if (!BANK_ACCOUNT_REGEX.test(accountNumber)) {
    return false;
  }

  // Luhn check for certain countries
  if (bankCode) {
    // Additional validation based on bank code
    return true;
  }

  return true;
}

/**
 * Validate invoice number
 */
export function validateInvoiceNumber(invoiceNumber: string): boolean {
  return INVOICE_NUMBER_REGEX.test(invoiceNumber);
}

/**
 * Validate phone number (South African)
 */
export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, "");
  return PHONE_REGEX.test(cleaned);
}

/**
 * Validate URL
 */
export function validateURL(url: string): boolean {
  return URL_REGEX.test(url);
}

/**
 * Validate South African ID number
 */
export function validateSAIDNumber(idNumber: string): boolean {
  if (!SA_ID_REGEX.test(idNumber)) {
    return false;
  }

  // Luhn checksum validation
  return validateLuhn(idNumber);
}

/**
 * Luhn algorithm validation
 */
function validateLuhn(value: string): boolean {
  let sum = 0;
  let isEven = false;

  for (let i = value.length - 1; i >= 0; i--) {
    let digit = parseInt(value.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate that value is not empty
 */
export function validateRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
): boolean {
  const length = value.length;
  return length >= min && length <= max;
}

/**
 * Validate numeric range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
): boolean {
  return value >= min && value <= max;
}

/**
 * Validate date is in the past
 */
export function validatePastDate(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Validate date is in the future
 */
export function validateFutureDate(date: Date): boolean {
  return date.getTime() > Date.now();
}

/**
 * Validate file type
 */
export function validateFileType(
  filename: string,
  allowedTypes: string[],
): boolean {
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}

/**
 * Validate tax ID (generic)
 */
export function validateTaxId(taxId: string, country: string = "ZA"): boolean {
  switch (country) {
    case "ZA":
      // South African tax number format
      return /^[0-9]{10}$/.test(taxId);
    case "US":
      // US EIN format
      return /^[0-9]{2}-[0-9]{7}$/.test(taxId);
    default:
      return /^[A-Za-z0-9\-]{5,20}$/.test(taxId);
  }
}

/**
 * Validate company registration number (South Africa)
 */
export function validateCompanyRegNumber(regNumber: string): boolean {
  // Format: YYYY/######/##
  return /^\d{4}\/\d{6}\/\d{2}$/.test(regNumber);
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/\s+/g, " "); // Normalize whitespace
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

/**
 * Validate JSON string
 */
export function validateJSON(json: string): boolean {
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}
