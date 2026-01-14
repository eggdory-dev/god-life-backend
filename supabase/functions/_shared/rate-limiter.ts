// ============================================================================
// God Life Backend - Rate Limiting
// ============================================================================

import { getSupabaseAdmin } from './database.ts';
import type { RateLimitConfig, RateLimitResult } from './types.ts';

/**
 * Check if user is within rate limit
 * Uses database for tracking (for production, consider Redis/Upstash)
 *
 * @param userId - User ID to check
 * @param config - Rate limit configuration
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const supabase = getSupabaseAdmin();

  if (config.type === 'ai_daily' || config.type === 'ai_monthly') {
    return await checkAIRateLimit(userId, config);
  }

  // For API rate limiting, return permissive for now
  // TODO: Implement with Redis/Upstash for production
  return {
    allowed: true,
    remaining: config.maxRequests,
    resetAt: new Date(Date.now() + config.windowMs),
    limit: config.maxRequests,
  };
}

/**
 * Check AI coaching rate limit
 * Free: 3 conversations per day
 * Pro: 500 conversations per month
 *
 * @param userId - User ID
 * @param config - Rate limit config
 * @returns Rate limit result
 */
async function checkAIRateLimit(
  userId: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const supabase = getSupabaseAdmin();

  // Get user subscription info
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan, subscription_expires_at')
    .eq('id', userId)
    .single();

  if (!profile) {
    throw new Error('User not found');
  }

  // Check if Pro subscription is active
  const isPro = profile.subscription_plan === 'pro' &&
    profile.subscription_expires_at &&
    new Date(profile.subscription_expires_at) > new Date();

  let limit: number;
  let period: 'daily' | 'monthly';
  let resetAt: Date;
  let usageDate: string;

  if (isPro) {
    // Pro users: 500 per month
    limit = 500;
    period = 'monthly';
    const now = new Date();
    resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1); // First day of next month
    usageDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Get monthly usage
    const { data: usageData } = await supabase
      .from('ai_usage_tracking')
      .select('conversation_count')
      .eq('user_id', userId)
      .gte('usage_date', usageDate)
      .order('usage_date', { ascending: false });

    const totalUsage = usageData?.reduce(
      (sum, record) => sum + (record.conversation_count || 0),
      0,
    ) || 0;

    return {
      allowed: totalUsage < limit,
      remaining: Math.max(0, limit - totalUsage),
      resetAt,
      limit,
    };
  } else {
    // Free users: 3 per day
    limit = 3;
    period = 'daily';
    const today = new Date().toISOString().split('T')[0];
    resetAt = new Date(today + 'T00:00:00Z');
    resetAt.setDate(resetAt.getDate() + 1); // Midnight tomorrow
    usageDate = today;

    // Get today's usage
    const { data: usage } = await supabase
      .from('ai_usage_tracking')
      .select('conversation_count')
      .eq('user_id', userId)
      .eq('usage_date', usageDate)
      .single();

    const used = usage?.conversation_count || 0;

    return {
      allowed: used < limit,
      remaining: Math.max(0, limit - used),
      resetAt,
      limit,
    };
  }
}

/**
 * Increment AI usage counter (atomic operation)
 * Called after successful AI conversation
 *
 * @param userId - User ID
 * @param tokens - Number of tokens used (optional)
 * @returns true if successful
 */
export async function incrementAIUsage(
  userId: string,
  tokens: number = 0,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().split('T')[0];

  try {
    // Use database function for atomic increment
    const { error } = await supabase.rpc('increment_ai_usage', {
      p_user_id: userId,
      p_usage_date: today,
      p_message_tokens: tokens,
    });

    if (error) {
      console.error('Failed to increment AI usage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error incrementing AI usage:', error);
    return false;
  }
}

/**
 * Check if user can create more routines
 * Free: 5 routines
 * Pro: unlimited (999)
 *
 * @param userId - User ID
 * @returns true if user can create more routines
 */
export async function canCreateRoutine(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // Get user's subscription and current routine count
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan, subscription_expires_at, total_routines')
    .eq('id', userId)
    .single();

  if (!profile) {
    return false;
  }

  // Check if Pro
  const isPro = profile.subscription_plan === 'pro' &&
    profile.subscription_expires_at &&
    new Date(profile.subscription_expires_at) > new Date();

  const limit = isPro ? 999 : 5;
  const current = profile.total_routines || 0;

  return current < limit;
}

/**
 * Get routine limit for user
 *
 * @param userId - User ID
 * @returns Current usage and limit info
 */
export async function getRoutineLimit(userId: string): Promise<{
  current: number;
  limit: number;
  canCreate: boolean;
  isPro: boolean;
}> {
  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan, subscription_expires_at, total_routines')
    .eq('id', userId)
    .single();

  if (!profile) {
    throw new Error('User not found');
  }

  const isPro = profile.subscription_plan === 'pro' &&
    profile.subscription_expires_at &&
    new Date(profile.subscription_expires_at) > new Date();

  const limit = isPro ? 999 : 5;
  const current = profile.total_routines || 0;

  return {
    current,
    limit,
    canCreate: current < limit,
    isPro,
  };
}

/**
 * Get AI usage info for user
 *
 * @param userId - User ID
 * @returns Usage info with limits
 */
export async function getAIUsage(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  period: 'daily' | 'monthly';
  resetAt: Date;
  isPro: boolean;
}> {
  const config: RateLimitConfig = {
    maxRequests: 3,
    windowMs: 86400000,
    type: 'ai_daily',
  };

  const result = await checkRateLimit(userId, config);

  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan, subscription_expires_at')
    .eq('id', userId)
    .single();

  const isPro = profile?.subscription_plan === 'pro' &&
    profile.subscription_expires_at &&
    new Date(profile.subscription_expires_at) > new Date();

  return {
    used: result.limit - result.remaining,
    limit: result.limit,
    remaining: result.remaining,
    period: isPro ? 'monthly' : 'daily',
    resetAt: result.resetAt,
    isPro,
  };
}

/**
 * Check if user can join more groups
 * Free & Pro: 10 groups
 *
 * @param userId - User ID
 * @returns true if user can join more groups
 */
export async function canJoinGroup(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { count } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const limit = 10; // Same for all users
  return (count || 0) < limit;
}

/**
 * Simple in-memory cache for rate limiting (for high-frequency endpoints)
 * This is a basic implementation - for production use Redis/Upstash
 */
class RateLimitCache {
  private cache = new Map<string, { count: number; resetAt: number }>();

  check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (!cached || cached.resetAt < now) {
      // Reset or first request
      this.cache.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return true;
    }

    if (cached.count >= limit) {
      return false;
    }

    cached.count++;
    return true;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.resetAt < now) {
        this.cache.delete(key);
      }
    }
  }
}

// Global rate limit cache instance
const rateLimitCache = new RateLimitCache();

// Cleanup every 5 minutes
setInterval(() => rateLimitCache.cleanup(), 5 * 60 * 1000);

/**
 * Simple API rate limiter using in-memory cache
 * For production, use Redis/Upstash
 *
 * @param userId - User ID
 * @param endpoint - Endpoint name
 * @param limit - Max requests per minute
 * @returns true if within limit
 */
export function checkAPIRateLimit(
  userId: string,
  endpoint: string,
  limit: number = 100,
): boolean {
  const key = `${userId}:${endpoint}`;
  return rateLimitCache.check(key, limit, 60000); // 1 minute window
}

/**
 * Create rate limit config for AI coaching
 *
 * @param type - 'daily' or 'monthly'
 * @returns Rate limit configuration
 */
export function createAIRateLimitConfig(
  type: 'daily' | 'monthly' = 'daily',
): RateLimitConfig {
  if (type === 'monthly') {
    return {
      maxRequests: 500,
      windowMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      type: 'ai_monthly',
    };
  }

  return {
    maxRequests: 3,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    type: 'ai_daily',
  };
}
