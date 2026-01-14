// ============================================================================
// God Life Backend - Coaching Conversation Detail Edge Function
// GET /coaching/conversations/:id
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { getSupabaseAdmin } from '../_shared/database.ts';
import {
  successResponse,
  withErrorHandling,
} from '../_shared/response.ts';
import { NotFoundError, ValidationError, AuthorizationError } from '../_shared/errors.ts';

/**
 * Extract conversation ID from URL path
 */
function getConversationIdFromPath(url: string): string {
  const parts = new URL(url).pathname.split('/');
  const id = parts[parts.length - 1];

  if (!id) {
    throw new ValidationError('대화 ID가 필요합니다');
  }

  return id;
}

/**
 * Get conversation detail with all messages
 */
async function handleGetConversation(req: Request, requestId: string): Promise<Response> {
  // Get authenticated user
  const user = await getUserFromRequest(req);

  // Extract conversation ID from URL
  const conversationId = getConversationIdFromPath(req.url);

  const supabase = getSupabaseAdmin();

  // Get conversation
  const { data: conversation, error: conversationError } = await supabase
    .from('coaching_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (conversationError || !conversation) {
    throw new NotFoundError('대화를 찾을 수 없습니다');
  }

  // Check ownership
  if (conversation.user_id !== user.id) {
    throw new AuthorizationError('이 대화에 접근할 권한이 없습니다');
  }

  // Get all messages for this conversation
  const { data: messages, error: messagesError } = await supabase
    .from('coaching_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Failed to fetch messages:', messagesError);
    throw new ValidationError('메시지를 불러오는데 실패했습니다');
  }

  // Get report if exists
  let report = null;
  if (conversation.has_report) {
    const { data: reportData } = await supabase
      .from('coaching_reports')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (reportData) {
      report = {
        id: reportData.id,
        diagnosis: reportData.diagnosis,
        recommendations: reportData.recommendations,
        createdAt: reportData.created_at,
      };
    }
  }

  return successResponse(
    {
      id: conversation.id,
      title: conversation.title,
      hasReport: conversation.has_report,
      messageCount: conversation.message_count,
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        tokens: msg.tokens,
        createdAt: msg.created_at,
      })),
      report,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
    },
    requestId,
  );
}

serve(withErrorHandling(handleGetConversation));
