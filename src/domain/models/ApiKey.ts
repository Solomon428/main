export interface ApiKey {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  keyHash: string;
  prefix: string;
  lastUsedAt?: Date | null;
  lastUsedIp?: string | null;
  expiresAt?: Date | null;
  permissions: string[];
  scopes: string[];
  rateLimit: number;
  rateLimitWindow: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  revokedAt?: Date | null;
  revokedBy?: string | null;
  revokedReason?: string | null;
}
