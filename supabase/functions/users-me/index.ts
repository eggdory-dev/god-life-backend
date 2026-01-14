// ============================================================================
// God Life Backend - User Profile Edge Function
// GET /users/me - Get current user profile
// PATCH /users/me - Update user profile (name, profile_image_url)
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { getSupabaseAdmin } from '../_shared/database.ts';
import {
  parseRequestBody,
  successResponse,
  withErrorHandling,
} from '../_shared/response.ts';
import { profileUpdateSchema, validate } from '../_shared/validators.ts';
import { NotFoundError, ValidationError } from '../_shared/errors.ts';

/**
 * Get current user's profile with stats and subscription info
 */
async function getProfile(userId: string, requestId: string): Promise<Response> {
  const supabase = getSupabaseAdmin();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new NotFoundError('사용자 프로필을 찾을 수 없습니다');
  }

  return successResponse(
    {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      profileImageUrl: profile.profile_image_url,
      provider: profile.provider,
      interests: profile.interests,
      coachingStyle: profile.coaching_style,
      themeMode: profile.theme_mode,
      darkMode: profile.dark_mode,
      notificationEnabled: profile.notification_enabled,
      preferredNotificationTime: profile.preferred_notification_time,
      language: profile.language,
      onboardingCompleted: profile.onboarding_completed,
      subscription: {
        plan: profile.subscription_plan,
        expiresAt: profile.subscription_expires_at,
      },
      stats: {
        currentStreak: profile.current_streak,
        longestStreak: profile.longest_streak,
        totalCompletions: profile.total_completions,
        totalRoutines: profile.total_routines,
      },
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    },
    requestId,
  );
}

/**
 * Update current user's profile (name, profile_image_url)
 */
async function updateProfile(
  userId: string,
  req: Request,
  requestId: string,
): Promise<Response> {
  // Parse and validate request body
  const body = await parseRequestBody(req);
  const data = validate(profileUpdateSchema, body);

  const supabase = getSupabaseAdmin();

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) {
    updates.name = data.name;
  }

  if (data.profileImageUrl !== undefined) {
    updates.profile_image_url = data.profileImageUrl;
  }

  // Update profile
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (updateError) {
    console.error('Failed to update profile:', updateError);
    throw new ValidationError('프로필 업데이트에 실패했습니다');
  }

  return successResponse(
    {
      message: '프로필이 업데이트되었습니다',
      profile: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
        profileImageUrl: updatedProfile.profile_image_url,
      },
    },
    requestId,
  );
}

/**
 * Main handler - routes GET and PATCH requests
 */
async function handleUserProfile(req: Request, requestId: string): Promise<Response> {
  // Get authenticated user
  const user = await getUserFromRequest(req);

  // Route based on HTTP method
  if (req.method === 'GET') {
    return await getProfile(user.id, requestId);
  } else if (req.method === 'PATCH') {
    return await updateProfile(user.id, req, requestId);
  } else {
    throw new ValidationError(`지원하지 않는 HTTP 메서드입니다: ${req.method}`);
  }
}

serve(withErrorHandling(handleUserProfile));
