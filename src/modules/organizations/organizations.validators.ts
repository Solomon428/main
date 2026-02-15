import { z } from 'zod';
import { Currency } from '../../domain/enums/Currency';

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name is required'),
  legalName: z.string().optional(),
  tradingName: z.string().optional(),
  taxId: z.string().optional(),
  vatNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  companyNumber: z.string().optional(),
  industry: z.string().optional(),
  sector: z.string().optional(),
  employeeCount: z.number().int().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  faxNumber: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('South Africa'),
  countryCode: z.string().default('ZA'),
  timezone: z.string().default('Africa/Johannesburg'),
  currency: z.nativeEnum(Currency).default(Currency.ZAR),
  baseCurrency: z.nativeEnum(Currency).default(Currency.ZAR),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export const organizationSettingsSchema = z.object({
  settings: z.record(z.unknown()).optional(),
  complianceSettings: z.record(z.unknown()).optional(),
  riskSettings: z.record(z.unknown()).optional(),
  approvalSettings: z.record(z.unknown()).optional(),
  paymentSettings: z.record(z.unknown()).optional(),
  notificationSettings: z.record(z.unknown()).optional(),
  brandingSettings: z.record(z.unknown()).optional(),
  securitySettings: z.record(z.unknown()).optional(),
  integrationSettings: z.record(z.unknown()).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
