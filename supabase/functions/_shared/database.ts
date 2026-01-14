// ============================================================================
// God Life Backend - Supabase Client Factory
// ============================================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Creates a Supabase client with user context
 * Use this for authenticated user operations
 *
 * @param authToken - JWT access token from Authorization header
 * @returns Supabase client with user context (RLS enforced)
 */
export function getSupabaseClient(authToken: string): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is not set');
  }

  // Use anon key with user's JWT token for RLS-enforced operations
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is not set');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Creates a Supabase client with admin/service role access
 * Use this for server-side operations that bypass RLS
 *
 * WARNING: Only use for trusted server-side operations like:
 * - Creating profiles after OAuth
 * - Incrementing AI usage counters
 * - Sending notifications
 * - Admin operations
 *
 * @returns Supabase client with service role (bypasses RLS)
 */
export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is not set');
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a Supabase client from a Request object
 * Extracts the JWT token from the Authorization header
 *
 * @param req - HTTP Request object
 * @returns Supabase client with user context
 * @throws Error if Authorization header is missing or malformed
 */
export function getSupabaseFromRequest(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    throw new Error('Invalid Authorization header format');
  }

  return getSupabaseClient(token);
}

/**
 * Helper function to handle database errors
 * Converts Supabase errors into user-friendly messages
 *
 * @param error - Error from Supabase operation
 * @returns User-friendly error message
 */
export function handleDatabaseError(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const dbError = error as { message?: string; code?: string; details?: string };

    // Handle common PostgreSQL error codes
    switch (dbError.code) {
      case '23505': // Unique violation
        return 'This record already exists';
      case '23503': // Foreign key violation
        return 'Referenced record does not exist';
      case '23502': // Not null violation
        return 'Required field is missing';
      case '42P01': // Undefined table
        return 'Database schema error';
      case 'PGRST116': // Row not found
        return 'Record not found';
      default:
        return dbError.message || 'Database operation failed';
    }
  }

  return 'Unknown database error';
}

/**
 * Validates UUID format
 *
 * @param uuid - String to validate
 * @returns true if valid UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Safely parse JSON from database JSONB columns
 *
 * @param value - Value to parse
 * @returns Parsed JSON or empty object if invalid
 */
export function safeParseJSON<T>(value: unknown): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return {} as T;
    }
  }
  return (value || {}) as T;
}
