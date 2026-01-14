// ============================================================================
// God Life Backend - Coaching Messages Edge Function
// POST /coaching/conversations/:id/messages
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { getSupabaseAdmin } from '../_shared/database.ts';
import {
  parseRequestBody,
  successResponse,
  withErrorHandling,
} from '../_shared/response.ts';
import { coachingMessageSchema, validate } from '../_shared/validators.ts';
import { checkRateLimit, incrementAIUsage } from '../_shared/rate-limiter.ts';
import { AIClient } from '../_shared/ai-client.ts';
import { NotFoundError, ValidationError, AuthorizationError } from '../_shared/errors.ts';
import type { CoachingContext, AIMessage } from '../_shared/types.ts';

/**
 * Extract conversation ID from URL path
 */
function getConversationIdFromPath(url: string): string {
  const parts = new URL(url).pathname.split('/');
  // URL pattern: /coaching/conversations/:id/messages
  const id = parts[parts.length - 2];

  if (!id) {
    throw new ValidationError('대화 ID가 필요합니다');
  }

  return id;
}

/**
 * Send message in coaching conversation
 *
 * This is the most complex Edge Function in the system:
 * 1. Check rate limit
 * 2. Load conversation history (last 20 messages)
 * 3. Build coaching context (theme, style, routines, completions)
 * 4. Call Anthropic Claude API
 * 5. Save user message and AI response
 * 6. Increment AI usage counter
 */
async function handleSendMessage(req: Request, requestId: string): Promise<Response> {
  // Get authenticated user
  const user = await getUserFromRequest(req);

  // Extract conversation ID from URL
  const conversationId = getConversationIdFromPath(req.url);

  // Parse and validate request body
  const body = await parseRequestBody(req);
  const data = validate(coachingMessageSchema, body);

  const supabase = getSupabaseAdmin();

  // Get conversation and verify ownership
  const { data: conversation, error: conversationError } = await supabase
    .from('coaching_conversations')
    .select('user_id, message_count')
    .eq('id', conversationId)
    .single();

  if (conversationError || !conversation) {
    throw new NotFoundError('대화를 찾을 수 없습니다');
  }

  if (conversation.user_id !== user.id) {
    throw new AuthorizationError('이 대화에 접근할 권한이 없습니다');
  }

  // Get user profile for rate limiting and coaching context
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('theme_mode, coaching_style, subscription_plan, subscription_expires_at')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new ValidationError('사용자 프로필을 찾을 수 없습니다');
  }

  // Check rate limit
  const rateLimit = await checkRateLimit(user.id, {
    resource: 'ai_conversations',
    subscriptionPlan: profile.subscription_plan,
    subscriptionExpiresAt: profile.subscription_expires_at,
  });

  if (!rateLimit.allowed) {
    throw rateLimit.error!;
  }

  // Load conversation history (last 20 messages for context)
  const { data: messageHistory, error: historyError } = await supabase
    .from('coaching_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (historyError) {
    console.error('Failed to load message history:', historyError);
    throw new ValidationError('대화 히스토리를 불러오는데 실패했습니다');
  }

  // Reverse to chronological order
  const messages: AIMessage[] = messageHistory
    .reverse()
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

  // Add new user message to conversation history
  messages.push({
    role: 'user',
    content: data.content,
  });

  // Get user's routines for context
  const { data: routines } = await supabase
    .from('routines')
    .select('name, category, current_streak')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('current_streak', { ascending: false })
    .limit(10);

  // Get recent completions for context
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const { data: recentCompletions } = await supabase
    .from('routine_completions')
    .select('completion_date, routines(name)')
    .eq('user_id', user.id)
    .gte('completion_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('completion_date', { ascending: false })
    .limit(20);

  // Build coaching context
  const context: CoachingContext = {
    theme_mode: profile.theme_mode,
    coaching_style: profile.coaching_style,
    user_routines: routines?.map((r) => ({
      name: r.name,
      category: r.category,
      current_streak: r.current_streak,
    })) || [],
    recent_completions: recentCompletions?.map((c: any) => ({
      routine_name: c.routines?.name || 'Unknown',
      completion_date: c.completion_date,
    })) || [],
  };

  // Call Anthropic Claude API
  const aiClient = new AIClient();
  const aiResponse = await aiClient.chat(messages, context);

  // Save user message
  const { error: userMessageError } = await supabase
    .from('coaching_messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content: data.content,
    });

  if (userMessageError) {
    console.error('Failed to save user message:', userMessageError);
    throw new ValidationError('메시지 저장에 실패했습니다');
  }

  // Save AI response
  const { error: aiMessageError } = await supabase
    .from('coaching_messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: aiResponse.content,
      tokens: aiResponse.tokens,
    });

  if (aiMessageError) {
    console.error('Failed to save AI message:', aiMessageError);
    throw new ValidationError('AI 응답 저장에 실패했습니다');
  }

  // Update conversation message count and updated_at
  await supabase
    .from('coaching_conversations')
    .update({
      message_count: conversation.message_count + 2,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  // Increment AI usage counter
  await incrementAIUsage(user.id, profile.subscription_plan, profile.subscription_expires_at);

  return successResponse(
    {
      message: {
        role: 'assistant',
        content: aiResponse.content,
      },
      rateLimit: {
        remaining: rateLimit.remaining - 1,
        resetAt: rateLimit.resetAt,
        limit: rateLimit.limit,
      },
      tokens: aiResponse.tokens,
    },
    requestId,
  );
}

serve(withErrorHandling(handleSendMessage));
