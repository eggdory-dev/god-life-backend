// ============================================================================
// God Life Backend - Onboarding Edge Function
// POST /users/onboarding
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { getSupabaseAdmin } from '../_shared/database.ts';
import {
  parseRequestBody,
  successResponse,
  withErrorHandling,
} from '../_shared/response.ts';
import { onboardingSchema, validate } from '../_shared/validators.ts';
import { ValidationError } from '../_shared/errors.ts';

/**
 * Complete user onboarding by saving preferences and settings
 *
 * Sets:
 * - interests (선택한 관심사)
 * - isFaithUser (신앙 기반 사용자 여부)
 * - coachingStyle (F/T)
 * - themeMode (faith/universal)
 * - notificationEnabled
 * - preferredNotificationTime
 * - onboarding_completed = true
 */
async function handleOnboarding(req: Request, requestId: string): Promise<Response> {
  // Get authenticated user
  const user = await getUserFromRequest(req);

  // Parse and validate request body
  const body = await parseRequestBody(req);
  const data = validate(onboardingSchema, body);

  const supabase = getSupabaseAdmin();

  // Check if onboarding already completed
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  if (fetchError) {
    throw new ValidationError('사용자 프로필을 찾을 수 없습니다');
  }

  if (profile.onboarding_completed) {
    throw new ValidationError('이미 온보딩이 완료되었습니다');
  }

  // Determine theme_mode based on isFaithUser
  const themeMode = data.isFaithUser ? 'faith' : 'universal';

  // Update profile with onboarding data
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({
      interests: data.interests,
      coaching_style: data.coachingStyle,
      theme_mode: themeMode,
      notification_enabled: data.notificationEnabled,
      preferred_notification_time: data.preferredNotificationTime,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    console.error('Failed to update profile:', updateError);
    throw new ValidationError('온보딩 정보 저장에 실패했습니다');
  }

  return successResponse(
    {
      message: '온보딩이 완료되었습니다',
      profile: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
        interests: updatedProfile.interests,
        coachingStyle: updatedProfile.coaching_style,
        themeMode: updatedProfile.theme_mode,
        notificationEnabled: updatedProfile.notification_enabled,
        preferredNotificationTime: updatedProfile.preferred_notification_time,
        onboardingCompleted: updatedProfile.onboarding_completed,
      },
    },
    requestId,
  );
}

serve(withErrorHandling(handleOnboarding));
