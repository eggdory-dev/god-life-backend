// ============================================================================
// God Life Backend - Logout Edge Function
// POST /auth/logout
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseAdmin } from '../_shared/database.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import {
  parseRequestBody,
  successResponse,
  withErrorHandling,
} from '../_shared/response.ts';
import { logoutSchema, validate } from '../_shared/validators.ts';

/**
 * Logout user and clear push token for device
 */
async function handleLogout(req: Request, requestId: string): Promise<Response> {
  // Get authenticated user
  const user = await getUserFromRequest(req);

  // Parse request body
  const body = await parseRequestBody<{ deviceId: string }>(req);
  const { deviceId } = validate(logoutSchema, body);

  const supabase = getSupabaseAdmin();

  // Deactivate push token for this device
  await supabase
    .from('push_tokens')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('device_id', deviceId);

  // Sign out user session (this invalidates the access token)
  // Note: In a full implementation, we'd track sessions and revoke them
  // For Supabase, the JWT will naturally expire

  return successResponse(
    {
      message: '로그아웃되었습니다',
    },
    requestId,
  );
}

serve(withErrorHandling(handleLogout));
