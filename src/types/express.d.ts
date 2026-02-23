// Custom type augmentations for Express - extends the real @types/express
// This file adds project-specific types on top of @types/express

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
      organizationId?: string;
    };
    orgId?: string;
  }
}
