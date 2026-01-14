// ============================================================================
// God Life Backend - Coaching Report Edge Function
// POST /coaching/conversations/:id/report
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { getSupabaseAdmin } from '../_shared/database.ts';
import {
  successResponse,
  withErrorHandling,
} from '../_shared/response.ts';
import { AIClient } from '../_shared/ai-client.ts';
import { NotFoundError, ValidationError, AuthorizationError, ConflictError } from '../_shared/errors.ts';
import type { CoachingContext, AIMessage } from '../_shared/types.ts';

/**
 * Extract conversation ID from URL path
 */
function getConversationIdFromPath(url: string): string {
  const parts = new URL(url).pathname.split('/');
  // URL pattern: /coaching/conversations/:id/report
  const id = parts[parts.length - 2];

  if (!id) {
    throw new ValidationError('대화 ID가 필요합니다');
  }

  return id;
}

/**
 * Generate coaching report from conversation
 *
 * This analyzes the entire conversation and generates:
 * 1. Diagnosis: Current state assessment
 * 2. Recommendations: Actionable suggestions for routines
 *
 * The report is generated once per conversation and stored in the database.
 */
async function handleGenerateReport(req: Request, requestId: string): Promise<Response> {
  // Get authenticated user
  const user = await getUserFromRequest(req);

  // Extract conversation ID from URL
  const conversationId = getConversationIdFromPath(req.url);

  const supabase = getSupabaseAdmin();

  // Get conversation and verify ownership
  const { data: conversation, error: conversationError } = await supabase
    .from('coaching_conversations')
    .select('user_id, has_report')
    .eq('id', conversationId)
    .single();

  if (conversationError || !conversation) {
    throw new NotFoundError('대화를 찾을 수 없습니다');
  }

  if (conversation.user_id !== user.id) {
    throw new AuthorizationError('이 대화에 접근할 권한이 없습니다');
  }

  // Check if report already exists
  if (conversation.has_report) {
    throw new ConflictError('이미 리포트가 생성되었습니다');
  }

  // Get user profile for coaching context
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('theme_mode, coaching_style')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new ValidationError('사용자 프로필을 찾을 수 없습니다');
  }

  // Load full conversation history
  const { data: messages, error: messagesError } = await supabase
    .from('coaching_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (messagesError || !messages || messages.length === 0) {
    throw new ValidationError('대화 내용을 불러오는데 실패했습니다');
  }

  // Get user's routines for context
  const { data: routines } = await supabase
    .from('routines')
    .select('name, category, current_streak, total_completions')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('current_streak', { ascending: false });

  // Build coaching context
  const context: CoachingContext = {
    theme_mode: profile.theme_mode,
    coaching_style: profile.coaching_style,
    user_routines: routines?.map((r) => ({
      name: r.name,
      category: r.category,
      current_streak: r.current_streak,
    })) || [],
    recent_completions: [], // Not needed for report generation
  };

  // Convert messages to AI format
  const conversationMessages: AIMessage[] = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  // Call AI to generate report
  const aiClient = new AIClient();
  const report = await aiClient.generateReport(conversationMessages, context);

  // Save report to database
  const { data: savedReport, error: reportError } = await supabase
    .from('coaching_reports')
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      diagnosis: report.diagnosis,
      recommendations: report.recommendations,
    })
    .select()
    .single();

  if (reportError) {
    console.error('Failed to save report:', reportError);
    throw new ValidationError('리포트 저장에 실패했습니다');
  }

  // Mark conversation as having report
  await supabase
    .from('coaching_conversations')
    .update({
      has_report: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  return successResponse(
    {
      message: '코칭 리포트가 생성되었습니다',
      report: {
        id: savedReport.id,
        diagnosis: savedReport.diagnosis,
        recommendations: savedReport.recommendations.map((rec: any) => ({
          title: rec.title,
          description: rec.description,
          category: rec.category,
          priority: rec.priority,
          suggestedRoutine: rec.suggestedRoutine,
        })),
        createdAt: savedReport.created_at,
      },
    },
    requestId,
  );
}

serve(withErrorHandling(handleGenerateReport));
