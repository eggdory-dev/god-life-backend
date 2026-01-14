// ============================================================================
// God Life Backend - User Settings Edge Function
// PATCH /users/settings
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { getSupabaseAdmin } from '../_shared/database.ts';
import {
  parseRequestBody,
  successResponse,
  withErrorHandling,
} from '../_shared/response.ts';
import { settingsUpdateSchema, validate } from '../_shared/validators.ts';
import { ValidationError } from '../_shared/errors.ts';

/**
 * Update user settings
 *
 * Allows updating:
 * - themeMode (faith/universal)
 * - coachingStyle (F/T)
 * - darkMode (light/dark/system)
 * - notificationEnabled
 * - preferredNotificationTime
 * - language
 */
async function handleSettingsUpdate(req: Request, requestId: string): Promise<Response> {
  // Get authenticated user
  const user = await getUserFromRequest(req);

  // Parse and validate request body
  const body = await parseRequestBody(req);
  const data = validate(settingsUpdateSchema, body);

  const supabase = getSupabaseAdmin();

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.themeMode !== undefined) {
    updates.theme_mode = data.themeMode;
  }

  if (data.coachingStyle !== undefined) {
    updates.coaching_style = data.coachingStyle;
  }

  if (data.darkMode !== undefined) {
    updates.dark_mode = data.darkMode;
  }

  if (data.notificationEnabled !== undefined) {
    updates.notification_enabled = data.notificationEnabled;
  }

  if (data.preferredNotificationTime !== undefined) {
    updates.preferred_notification_time = data.preferredNotificationTime;
  }

  if (data.language !== undefined) {
    updates.language = data.language;
  }

  // Update settings
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    console.error('Failed to update settings:', updateError);
    throw new ValidationError('설정 업데이트에 실패했습니다');
  }

  return successResponse(
    {
      message: '설정이 업데이트되었습니다',
      settings: {
        themeMode: updatedProfile.theme_mode,
        coachingStyle: updatedProfile.coaching_style,
        darkMode: updatedProfile.dark_mode,
        notificationEnabled: updatedProfile.notification_enabled,
        preferredNotificationTime: updatedProfile.preferred_notification_time,
        language: updatedProfile.language,
      },
    },
    requestId,
  );
}

serve(withErrorHandling(handleSettingsUpdate));
