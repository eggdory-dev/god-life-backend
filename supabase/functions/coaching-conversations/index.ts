// ============================================================================
// God Life Backend - Coaching Conversations Edge Function
// GET /coaching/conversations - List user's coaching conversations
// POST /coaching/conversations - Create new conversation with initial message
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { getSupabaseAdmin } from '../_shared/database.ts';
import {
  parseRequestBody,
  successResponse,
  withErrorHandling,
  createPaginationMeta,
} from '../_shared/response.ts';
import { coachingConversationCreateSchema, validate } from '../_shared/validators.ts';
import { checkRateLimit, incrementAIUsage } from '../_shared/rate-limiter.ts';
import { AIClient } from '../_shared/ai-client.ts';
import { ValidationError } from '../_shared/errors.ts';
import type { CoachingContext } from '../_shared/types.ts';

/**
 * Get user's coaching conversations
 */
async function getConversations(
  userId: string,
  req: Request,
  requestId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const cursor = url.searchParams.get('cursor');

  const supabase = getSupabaseAdmin();

  // Build query
  let query = supabase
    .from('coaching_conversations')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  // Apply cursor pagination
  if (cursor) {
    query = query.lt('updated_at', cursor).limit(limit);
  } else {
    query = query.limit(limit);
  }

  const { data: conversations, error, count } = await query;

  if (error) {
    console.error('Failed to fetch conversations:', error);
    throw new ValidationError('대화 목록을 불러오는데 실패했습니다');
  }

  // For each conversation, get the last message
  const conversationsWithLastMessage = await Promise.all(
    conversations.map(async (conv) => {
      const { data: lastMessage } = await supabase
        .from('coaching_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        id: conv.id,
        title: conv.title,
        hasReport: conv.has_report,
        messageCount: conv.message_count,
        lastMessage: lastMessage
          ? {
              role: lastMessage.role,
              content: lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : ''),
              createdAt: lastMessage.created_at,
            }
          : null,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
      };
    }),
  );

  // Create pagination metadata
  const hasMore = conversations.length === limit;
  const nextCursor = hasMore && conversations.length > 0
    ? conversations[conversations.length - 1].updated_at
    : null;

  const pagination = createPaginationMeta({
    total: count || 0,
    limit,
    hasMore,
    nextCursor,
  });

  return successResponse(
    conversationsWithLastMessage,
    requestId,
    pagination,
  );
}

/**
 * Create new coaching conversation with initial message
 */
async function createConversation(
  userId: string,
  req: Request,
  requestId: string,
): Promise<Response> {
  // Parse and validate request body
  const body = await parseRequestBody(req);
  const data = validate(coachingConversationCreateSchema, body);

  const supabase = getSupabaseAdmin();

  // Get user profile for coaching context
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('theme_mode, coaching_style, subscription_plan, subscription_expires_at')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new ValidationError('사용자 프로필을 찾을 수 없습니다');
  }

  // Check rate limit before creating conversation
  const rateLimit = await checkRateLimit(userId, {
    resource: 'ai_conversations',
    subscriptionPlan: profile.subscription_plan,
    subscriptionExpiresAt: profile.subscription_expires_at,
  });

  if (!rateLimit.allowed) {
    throw rateLimit.error!;
  }

  // Get user's routines for context
  const { data: routines } = await supabase
    .from('routines')
    .select('name, category, current_streak')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('current_streak', { ascending: false })
    .limit(10);

  // Get recent completions for context
  const { data: recentCompletions } = await supabase
    .from('routine_completions')
    .select('routine_id, completion_date')
    .eq('user_id', userId)
    .gte('completion_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
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
    recent_completions: recentCompletions?.map((c) => ({
      routine_name: routines?.find((r) => r.id === c.routine_id)?.name || 'Unknown',
      completion_date: c.completion_date,
    })) || [],
  };

  // Create conversation
  const { data: conversation, error: conversationError } = await supabase
    .from('coaching_conversations')
    .insert({
      user_id: userId,
      title: data.initialMessage.substring(0, 50) + (data.initialMessage.length > 50 ? '...' : ''),
      message_count: 2, // User message + AI response
    })
    .select()
    .single();

  if (conversationError) {
    console.error('Failed to create conversation:', conversationError);
    throw new ValidationError('대화 생성에 실패했습니다');
  }

  // Save user's initial message
  const { error: userMessageError } = await supabase
    .from('coaching_messages')
    .insert({
      conversation_id: conversation.id,
      role: 'user',
      content: data.initialMessage,
    });

  if (userMessageError) {
    console.error('Failed to save user message:', userMessageError);
    throw new ValidationError('메시지 저장에 실패했습니다');
  }

  // Call AI to get response
  const aiClient = new AIClient();
  const messages = [{ role: 'user' as const, content: data.initialMessage }];

  const aiResponse = await aiClient.chat(messages, context);

  // Save AI response
  const { error: aiMessageError } = await supabase
    .from('coaching_messages')
    .insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: aiResponse.content,
      tokens: aiResponse.tokens,
    });

  if (aiMessageError) {
    console.error('Failed to save AI message:', aiMessageError);
    throw new ValidationError('AI 응답 저장에 실패했습니다');
  }

  // Increment AI usage counter
  await incrementAIUsage(userId, profile.subscription_plan, profile.subscription_expires_at);

  return successResponse(
    {
      message: '새로운 대화가 시작되었습니다',
      conversation: {
        id: conversation.id,
        title: conversation.title,
        messages: [
          {
            role: 'user',
            content: data.initialMessage,
          },
          {
            role: 'assistant',
            content: aiResponse.content,
          },
        ],
      },
      rateLimit: {
        remaining: rateLimit.remaining - 1,
        resetAt: rateLimit.resetAt,
        limit: rateLimit.limit,
      },
    },
    requestId,
  );
}

/**
 * Main handler - routes GET and POST requests
 */
async function handleCoachingConversations(req: Request, requestId: string): Promise<Response> {
  // Get authenticated user
  const user = await getUserFromRequest(req);

  // Route based on HTTP method
  if (req.method === 'GET') {
    return await getConversations(user.id, req, requestId);
  } else if (req.method === 'POST') {
    return await createConversation(user.id, req, requestId);
  } else {
    throw new ValidationError(`지원하지 않는 HTTP 메서드입니다: ${req.method}`);
  }
}

serve(withErrorHandling(handleCoachingConversations));
