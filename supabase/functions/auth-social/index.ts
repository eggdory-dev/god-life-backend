// ============================================================================
// God Life Backend - Social Login Edge Function
// POST /auth/social
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseAdmin } from '../_shared/database.ts';
import {
  getOrGenerateRequestId,
  parseRequestBody,
  successResponse,
  withErrorHandling,
} from '../_shared/response.ts';
import { socialLoginSchema, validate } from '../_shared/validators.ts';
import {
  AuthenticationError,
  ExternalServiceError,
  ValidationError,
} from '../_shared/errors.ts';
import type { SocialLoginRequest, AuthResponse } from '../_shared/types.ts';

/**
 * Verify Google OAuth token
 */
async function verifyGoogleToken(token: string): Promise<{
  email: string;
  name: string;
  picture?: string;
  sub: string;
}> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`,
    );

    if (!response.ok) {
      throw new Error('Invalid Google token');
    }

    const data = await response.json();

    return {
      email: data.email,
      name: data.name,
      picture: data.picture,
      sub: data.sub,
    };
  } catch (error) {
    throw new ExternalServiceError('Google OAuth', error);
  }
}

/**
 * Verify Apple Sign In token
 */
async function verifyAppleToken(token: string): Promise<{
  email: string;
  name: string;
  sub: string;
}> {
  // Apple token verification requires JWT validation
  // For MVP, we'll use Supabase's built-in Apple auth
  // This is a placeholder for custom implementation
  try {
    // Decode JWT (basic validation - in production use proper JWT library)
    const payload = JSON.parse(atob(token.split('.')[1]));

    return {
      email: payload.email,
      name: payload.email.split('@')[0], // Use email prefix as name
      sub: payload.sub,
    };
  } catch (error) {
    throw new ExternalServiceError('Apple Sign In', error);
  }
}

/**
 * Verify Kakao OAuth token
 */
async function verifyKakaoToken(token: string): Promise<{
  email: string;
  name: string;
  picture?: string;
  sub: string;
}> {
  try {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Invalid Kakao token');
    }

    const data = await response.json();

    return {
      email: data.kakao_account?.email || '',
      name: data.properties?.nickname || data.kakao_account?.profile?.nickname || 'User',
      picture: data.properties?.profile_image || data.kakao_account?.profile?.profile_image_url,
      sub: String(data.id),
    };
  } catch (error) {
    throw new ExternalServiceError('Kakao OAuth', error);
  }
}

/**
 * Main handler for social login
 */
async function handleSocialLogin(req: Request, requestId: string): Promise<Response> {
  // Parse and validate request body
  const body = await parseRequestBody<SocialLoginRequest>(req);
  const validatedData = validate(socialLoginSchema, body);

  const { provider, token, deviceInfo } = validatedData;

  // Verify token with provider
  let providerData: {
    email: string;
    name: string;
    picture?: string;
    sub: string;
  };

  switch (provider) {
    case 'google':
      providerData = await verifyGoogleToken(token);
      break;
    case 'apple':
      providerData = await verifyAppleToken(token);
      break;
    case 'kakao':
      providerData = await verifyKakaoToken(token);
      break;
    default:
      throw new ValidationError('Invalid provider');
  }

  if (!providerData.email) {
    throw new AuthenticationError('Email not provided by OAuth provider');
  }

  const supabase = getSupabaseAdmin();

  // Check if user exists by email
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', providerData.email)
    .single();

  let userId: string;
  let isNewUser = false;

  if (existingUser) {
    // Existing user - sign in
    userId = existingUser.id;
  } else {
    // New user - create account
    isNewUser = true;

    // Create auth user first
    const { data: authData, error: authError } = await supabase.auth.admin
      .createUser({
        email: providerData.email,
        email_confirm: true, // Auto-confirm for OAuth users
        user_metadata: {
          provider,
          name: providerData.name,
          picture: providerData.picture,
        },
      });

    if (authError || !authData.user) {
      throw new AuthenticationError('Failed to create user account');
    }

    userId = authData.user.id;

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: providerData.email,
        name: providerData.name,
        profile_image_url: providerData.picture,
        provider,
        onboarding_completed: false,
      });

    if (profileError) {
      console.error('Failed to create profile:', profileError);
      // Rollback auth user creation
      await supabase.auth.admin.deleteUser(userId);
      throw new AuthenticationError('Failed to create user profile');
    }
  }

  // Generate session tokens
  const { data: sessionData, error: sessionError } = await supabase.auth.admin
    .generateLink({
      type: 'magiclink',
      email: providerData.email,
    });

  if (sessionError || !sessionData) {
    throw new AuthenticationError('Failed to generate session');
  }

  // For a proper implementation, we should use Supabase's signInWithIdToken
  // This is a simplified version for the MVP
  // In production, use proper JWT token generation

  // Store push token if provided
  if (deviceInfo?.pushToken) {
    await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token: deviceInfo.pushToken,
        platform: deviceInfo.platform,
        device_id: deviceInfo.deviceId,
        is_active: true,
      }, {
        onConflict: 'user_id,device_id',
      });
  }

  // Get user profile with subscription info
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) {
    throw new AuthenticationError('Failed to fetch user profile');
  }

  // Build response
  const response: AuthResponse = {
    accessToken: sessionData.properties?.hashed_token || 'temp_token', // In production, use proper JWT
    refreshToken: sessionData.properties?.hashed_token || 'temp_refresh', // In production, generate refresh token
    expiresIn: 3600,
    tokenType: 'Bearer',
    user: {
      id: userId,
      email: profile.email,
      name: profile.name,
      profileImage: profile.profile_image_url,
      provider: profile.provider,
      isNewUser,
      subscription: {
        plan: profile.subscription_plan,
        expiresAt: profile.subscription_expires_at,
      },
    },
  };

  return successResponse(response, requestId);
}

// Start the server
serve(withErrorHandling(handleSocialLogin));
