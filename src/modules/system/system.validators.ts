import { z } from "zod";

export const systemSettingSchema = z.object({
  key: z.string().min(1, "Setting key is required"),
  value: z.string().min(1, "Setting value is required"),
  description: z.string().optional(),
  category: z.string().default("GENERAL"),
  dataType: z
    .enum(["STRING", "NUMBER", "BOOLEAN", "JSON", "DATE"])
    .default("STRING"),
});

export const updateSystemSettingSchema = z.object({
  value: z.string().min(1, "Setting value is required"),
  description: z.string().optional(),
});

export const createCustomFieldSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  key: z.string().min(1, "Field key is required"),
  entityType: z.string().min(1, "Entity type is required"),
  fieldType: z.enum([
    "TEXT",
    "NUMBER",
    "DATE",
    "BOOLEAN",
    "SELECT",
    "MULTI_SELECT",
    "URL",
  ]),
  description: z.string().optional(),
  isRequired: z.boolean().default(false),
  defaultValue: z
    .union([z.string(), z.number(), z.boolean(), z.date(), z.array(z.string())])
    .optional(),
  options: z.array(z.string()).optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
    })
    .optional(),
});

export const updateCustomFieldSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  isRequired: z.boolean().optional(),
  defaultValue: z
    .union([z.string(), z.number(), z.boolean(), z.date(), z.array(z.string())])
    .optional(),
  options: z.array(z.string()).optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional(),
  description: z.string().optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional(),
  description: z.string().optional(),
});

export const scheduledTaskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  taskType: z.string().min(1, "Task type is required"),
  schedule: z.string().min(1, "Schedule (cron expression) is required"),
  isActive: z.boolean().default(true),
  parameters: z.record(z.unknown()).optional(),
});

export const executeTaskSchema = z.object({
  parameters: z.record(z.unknown()).optional(),
});

export const listSettingsQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

export const listCustomFieldsQuerySchema = z.object({
  entityType: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

export const setCustomFieldValueSchema = z.object({
  customFieldId: z.string().uuid("Valid custom field ID is required"),
  entityType: z.string().min(1, "Entity type is required"),
  entityId: z.string().uuid("Valid entity ID is required"),
  value: z.unknown(),
});

export type SystemSettingInput = z.infer<typeof systemSettingSchema>;
export type UpdateSystemSettingInput = z.infer<
  typeof updateSystemSettingSchema
>;
export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;
export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type ScheduledTaskInput = z.infer<typeof scheduledTaskSchema>;
export type ExecuteTaskInput = z.infer<typeof executeTaskSchema>;
export type ListSettingsQuery = z.infer<typeof listSettingsQuerySchema>;
export type ListCustomFieldsQuery = z.infer<typeof listCustomFieldsQuerySchema>;
export type SetCustomFieldValueInput = z.infer<
  typeof setCustomFieldValueSchema
>;
