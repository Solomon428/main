import crypto from "crypto";

const TOKEN_SECRET = process.env.NEXTAUTH_SECRET || "default-secret";

export function generateToken(payload: object): string {
  const data = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(data)
    .digest("hex");
  return Buffer.from(`${data}.${signature}`).toString("base64url");
}

export function verifyToken(token: string): object {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    const data = parts[0] ?? '';
    const signature = parts[1] ?? '';

    const expectedSignature = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(data)
      .digest("hex");

    if (signature !== expectedSignature) {
      throw new Error("Invalid token signature");
    }

    return JSON.parse(data);
  } catch (error) {
    throw new Error("Invalid token");
  }
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
