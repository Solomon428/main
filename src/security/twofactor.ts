// ============================================================================
// Two-Factor Authentication Service
// ============================================================================

import * as crypto from "crypto";
import { encrypt, decrypt } from "./crypto";

const TOTP_PERIOD = 30; // 30 seconds
const TOTP_DIGITS = 6;

/**
 * Generate a new 2FA secret
 */
export function generateTwoFactorSecret(): {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
} {
  const secret = crypto.randomBytes(20).toString("base64url");
  const backupCodes = generateRecoveryCodes();

  // Generate OTPAuth URL for QR code
  const issuer = encodeURIComponent(
    process.env.TWO_FACTOR_ISSUER || "CreditorFlow",
  );
  const qrCodeUrl = `otpauth://totp/${issuer}:user?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;

  return {
    secret,
    qrCodeUrl,
    backupCodes,
  };
}

/**
 * Verify a TOTP token
 */
export function verifyTwoFactorToken(secret: string, token: string): boolean {
  const expectedToken = generateTOTP(secret);
  const previousToken = generateTOTP(secret, -1);
  const nextToken = generateTOTP(secret, 1);

  // Allow current, previous, and next window for clock drift
  return (
    token === expectedToken || token === previousToken || token === nextToken
  );
}

/**
 * Generate TOTP code
 */
function generateTOTP(secret: string, stepOffset: number = 0): string {
  const timeStep = Math.floor(Date.now() / 1000 / TOTP_PERIOD) + stepOffset;
  const timeBuffer = Buffer.allocUnsafe(8);
  timeBuffer.writeBigUInt64BE(BigInt(timeStep), 0);

  const secretBuffer = Buffer.from(secret, "base64url");
  const hmac = crypto.createHmac("sha1", secretBuffer);
  hmac.update(timeBuffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1]! & 0x0f;
  const code =
    (((hash[offset]! & 0x7f) << 24) |
      ((hash[offset + 1]! & 0xff) << 16) |
      ((hash[offset + 2]! & 0xff) << 8) |
      (hash[offset + 3]! & 0xff)) %
    Math.pow(10, TOTP_DIGITS);

  return code.toString().padStart(TOTP_DIGITS, "0");
}

/**
 * Generate recovery codes
 */
export function generateRecoveryCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }

  return codes;
}

/**
 * Verify a recovery code
 */
export function verifyRecoveryCode(
  providedCode: string,
  hashedCodes: string[],
): boolean {
  const normalizedCode = providedCode.toUpperCase().replace(/-/g, "");

  return hashedCodes.some((hashedCode) => {
    const normalizedHash = hashedCode.toUpperCase().replace(/-/g, "");
    return crypto.timingSafeEqual(
      Buffer.from(normalizedCode),
      Buffer.from(normalizedHash),
    );
  });
}

/**
 * Encrypt 2FA secret for storage
 */
export function encryptTwoFactorSecret(secret: string): string {
  return encrypt(secret);
}

/**
 * Decrypt 2FA secret for verification
 */
export function decryptTwoFactorSecret(encryptedSecret: string): string {
  return decrypt(encryptedSecret);
}
