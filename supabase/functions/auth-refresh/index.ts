// ============================================================================
// God Life Backend - Refresh Token Edge Function
// POST /auth/refresh
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseAdmin } from '../_shared/database.ts';
import {
  parseRequestBody,
  successResponse,
  withErrorHandling,
} from '../_shared/response.ts';
import { refreshTokenSchema, validate } from '../_shared/validators.ts';
import { AuthenticationError } from '../_shared/errors.ts';

/**
 * Refresh access token using refresh token
 */
async function handleRefreshToken(req: Request, requestId: string): Promise<Response> {
  // Parse and validate request
  const body = await parseRequestBody<{ refreshToken: string }>(req);
  const { refreshToken } = validate(refreshTokenSchema, body);

  const supabase = getSupabaseAdmin();

  // Refresh the session
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    throw new AuthenticationError('Refresh Token이 만료되었습니다', 'AUTH_006');
  }

  // Return new tokens
  return successResponse(
    {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in || 3600,
      tokenType: 'Bearer',
    },
    requestId,
  );
}

serve(withErrorHandling(handleRefreshToken));
