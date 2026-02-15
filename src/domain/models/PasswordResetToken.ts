export interface PasswordResetToken {
  id: string;
  email: string;
  token: string;
  expires: Date;
  used: boolean;
  createdAt: Date;
  usedAt?: Date | null;
  ipAddress?: string | null;
}
