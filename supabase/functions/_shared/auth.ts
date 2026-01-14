// ============================================================================
// God Life Backend - Authentication Utilities
// ============================================================================

import { getSupabaseFromRequest } from './database.ts';
import type { AuthUser } from './types.ts';

/**
 * Extracts and validates the authenticated user from a Request
 * This function verifies the JWT token and returns the user information
 *
 * @param req - HTTP Request object with Authorization header
 * @returns Authenticated user information
 * @throws Error if token is invalid, expired, or missing
 */
export async function getUserFromRequest(req: Request): Promise<AuthUser> {
  try {
    // Get Supabase client with user context
    const supabase = getSupabaseFromRequest(req);

    // Validate JWT and get user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error('Invalid or expired token');
    }

    // Return typed user information
    return {
      id: user.id,
      email: user.email || '',
      role: user.role || 'authenticated',
      aud: user.aud || 'authenticated',
      exp: user.exp || 0,
    };
  } catch (error) {
    // Re-throw with more specific error message
    if (error instanceof Error) {
      if (error.message.includes('Authorization')) {
        throw new Error('AUTH_003'); // Login required
      }
      if (error.message.includes('expired')) {
        throw new Error('AUTH_001'); // Token expired
      }
      throw new Error('AUTH_002'); // Invalid token
    }
    throw new Error('AUTH_002'); // Invalid token
  }
}

/**
 * Checks if the authenticated user is the owner of a resource
 *
 * @param userId - ID from authenticated token
 * @param resourceUserId - ID of the resource owner
 * @returns true if user owns the resource
 */
export function isResourceOwner(userId: string, resourceUserId: string): boolean {
  return userId === resourceUserId;
}

/**
 * Checks if user has Pro subscription
 * Verifies both plan type and expiration date
 *
 * @param subscriptionPlan - User's subscription plan
 * @param expiresAt - Subscription expiration timestamp
 * @returns true if user has active Pro subscription
 */
export function hasProSubscription(
  subscriptionPlan: string,
  expiresAt: string | null,
): boolean {
  if (subscriptionPlan !== 'pro') {
    return false;
  }

  if (!expiresAt) {
    return false;
  }

  const expirationDate = new Date(expiresAt);
  const now = new Date();

  return expirationDate > now;
}

/**
 * Gets user's routine limit based on subscription
 *
 * @param subscriptionPlan - User's subscription plan
 * @param expiresAt - Subscription expiration timestamp
 * @returns Number of routines allowed (5 for free, 999 for pro)
 */
export function getRoutineLimit(
  subscriptionPlan: string,
  expiresAt: string | null,
): number {
  return hasProSubscription(subscriptionPlan, expiresAt) ? 999 : 5;
}

/**
 * Gets user's daily AI coaching limit
 *
 * @param subscriptionPlan - User's subscription plan
 * @param expiresAt - Subscription expiration timestamp
 * @returns Number of conversations allowed per day (3 for free, 500/month for pro)
 */
export function getAILimit(
  subscriptionPlan: string,
  expiresAt: string | null,
): { limit: number; period: 'daily' | 'monthly' } {
  if (hasProSubscription(subscriptionPlan, expiresAt)) {
    return { limit: 500, period: 'monthly' };
  }
  return { limit: 3, period: 'daily' };
}

/**
 * Validates password strength
 * Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number
 *
 * @param password - Password to validate
 * @returns true if password meets requirements
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

/**
 * Validates email format
 *
 * @param email - Email to validate
 * @returns true if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extracts bearer token from Authorization header
 *
 * @param authHeader - Authorization header value
 * @returns JWT token string or null if invalid
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Checks if request is from an authenticated user
 * Non-throwing version of getUserFromRequest
 *
 * @param req - HTTP Request object
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(req: Request): Promise<boolean> {
  try {
    await getUserFromRequest(req);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rate limit check for API endpoints
 * Basic implementation - for production, use Redis/Upstash
 *
 * @param userId - User ID
 * @param endpoint - API endpoint name
 * @param limit - Max requests per window
 * @returns true if within limit
 */
export function checkRateLimit(
  userId: string,
  endpoint: string,
  limit: number = 100,
): boolean {
  // TODO: Implement with Redis/Upstash for production
  // For now, always allow (will be implemented in rate-limiter.ts)
  return true;
}

/**
 * Generates a secure random token
 * Useful for invite codes, reset tokens, etc.
 *
 * @param length - Token length (default: 32)
 * @returns Random hex string
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes a password using SHA-256
 * Note: In production, use bcrypt or argon2
 *
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validates coaching style parameter
 *
 * @param style - Coaching style to validate
 * @returns true if valid ('F' or 'T')
 */
export function isValidCoachingStyle(style: unknown): style is 'F' | 'T' {
  return style === 'F' || style === 'T';
}

/**
 * Validates theme mode parameter
 *
 * @param mode - Theme mode to validate
 * @returns true if valid ('faith' or 'universal')
 */
export function isValidThemeMode(mode: unknown): mode is 'faith' | 'universal' {
  return mode === 'faith' || mode === 'universal';
}
