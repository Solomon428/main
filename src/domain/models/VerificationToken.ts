export interface VerificationToken {
  identifier: string;
  token: string;
  expires: Date;
  createdAt: Date;
  usedAt?: Date | null;
  usedByIp?: string | null;
}
