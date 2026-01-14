// ============================================================================
// God Life Backend - Input Validators (Zod Schemas)
// ============================================================================

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ============================================================================
// Authentication Schemas
// ============================================================================

export const socialLoginSchema = z.object({
  provider: z.enum(['google', 'apple', 'kakao']),
  token: z.string().min(1),
  deviceInfo: z.object({
    deviceId: z.string().uuid(),
    platform: z.enum(['ios', 'android']),
    pushToken: z.string().optional(),
  }).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  deviceId: z.string().uuid(),
});

// ============================================================================
// User/Profile Schemas
// ============================================================================

export const onboardingSchema = z.object({
  interests: z.array(z.string()).min(1).max(10),
  isFaithUser: z.boolean(),
  coachingStyle: z.enum(['F', 'T']),
  themeMode: z.enum(['faith', 'universal']),
  notificationEnabled: z.boolean(),
  preferredNotificationTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  profileImageUrl: z.string().url().optional(),
});

export const settingsUpdateSchema = z.object({
  themeMode: z.enum(['faith', 'universal']).optional(),
  coachingStyle: z.enum(['F', 'T']).optional(),
  darkMode: z.enum(['light', 'dark', 'system']).optional(),
  notificationEnabled: z.boolean().optional(),
  preferredNotificationTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  language: z.string().length(2).optional(),
});

// ============================================================================
// Routine Schemas
// ============================================================================

export const routineCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), // Hex color
  category: z.enum(['spiritual', 'health', 'learning', 'productivity', 'custom']),
  schedule: z.object({
    type: z.enum(['daily', 'weekly', 'custom']),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    days: z.array(z.number().int().min(1).max(7)).min(1).max(7),
    reminderEnabled: z.boolean(),
    reminderMinutesBefore: z.number().int().min(0).max(1440),
  }),
});

export const routineUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  category: z.enum(['spiritual', 'health', 'learning', 'productivity', 'custom']).optional(),
  schedule: z.object({
    type: z.enum(['daily', 'weekly', 'custom']).optional(),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    days: z.array(z.number().int().min(1).max(7)).min(1).max(7).optional(),
    reminderEnabled: z.boolean().optional(),
    reminderMinutesBefore: z.number().int().min(0).max(1440).optional(),
  }).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export const routineCompleteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  note: z.string().max(500).optional(),
});

// ============================================================================
// AI Coaching Schemas
// ============================================================================

export const coachingMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const coachingConversationCreateSchema = z.object({
  initialMessage: z.string().min(1).max(2000),
});

export const addRecommendedRoutineSchema = z.object({
  recommendationId: z.string().min(1),
});

// ============================================================================
// Group Schemas
// ============================================================================

export const groupCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  maxMembers: z.number().int().min(2).max(30),
  isPrivate: z.boolean(),
});

export const groupJoinSchema = z.object({
  inviteCode: z.string().length(6).toUpperCase(),
});

export const groupCheerSchema = z.object({
  targetUserId: z.string().uuid(),
  message: z.string().min(1).max(500),
  type: z.enum(['text', 'emoji']),
});

// ============================================================================
// Challenge Schemas
// ============================================================================

export const challengeVerifySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional(),
});

// ============================================================================
// Notification Schemas
// ============================================================================

export const pushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
  deviceId: z.string().uuid(),
});

// ============================================================================
// Subscription Schemas
// ============================================================================

export const subscriptionVerifySchema = z.object({
  platform: z.enum(['ios', 'android']),
  receipt: z.string().min(1),
  productId: z.string().min(1),
});

// ============================================================================
// Query Parameter Schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const statusQuerySchema = z.object({
  status: z.enum(['active', 'archived', 'deleted']).optional(),
});

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate data against a schema and return typed result
 *
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws Error with validation details if invalid
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new Error(
        `VALID_001: ${JSON.stringify({ errors })}`,
      );
    }
    throw error;
  }
}

/**
 * Safe validation that returns result instead of throwing
 *
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Success with data or error with details
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: Array<{ field: string; message: string }> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return { success: false, errors };
}

/**
 * Validate UUID format
 *
 * @param uuid - String to validate
 * @returns true if valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  return z.string().uuid().safeParse(uuid).success;
}

/**
 * Validate date format (YYYY-MM-DD)
 *
 * @param date - String to validate
 * @returns true if valid date format
 */
export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/**
 * Validate time format (HH:MM)
 *
 * @param time - String to validate
 * @returns true if valid time format
 */
export function isValidTime(time: string): boolean {
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

/**
 * Validate hex color format
 *
 * @param color - String to validate
 * @returns true if valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Sanitize string input (remove HTML tags, trim)
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
}

/**
 * Validate and parse pagination params from query string
 *
 * @param searchParams - URLSearchParams from request
 * @returns Validated pagination params
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
): { page: number; limit: number } {
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  return validate(paginationSchema, { page, limit });
}
