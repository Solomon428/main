export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
  location?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  isValid: boolean;
  invalidatedAt?: Date | null;
  invalidatedReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date | null;
}
