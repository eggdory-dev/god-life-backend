// ============================================================================
// God Life Backend - Routine Complete Edge Function
// POST /routines/:id/complete
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { getSupabaseAdmin } from '../_shared/database.ts';
import {
  parseRequestBody,
  successResponse,
  withErrorHandling,
} from '../_shared/response.ts';
import { routineCompleteSchema, validate } from '../_shared/validators.ts';
import { NotFoundError, ValidationError, AuthorizationError, ConflictError } from '../_shared/errors.ts';

/**
 * Extract routine ID from URL path
 */
function getRoutineIdFromPath(url: string): string {
  const parts = new URL(url).pathname.split('/');
  // URL pattern: /routines/:id/complete
  const id = parts[parts.length - 2];

  if (!id) {
    throw new ValidationError('루틴 ID가 필요합니다');
  }

  return id;
}

/**
 * Mark routine as complete for a specific date
 *
 * This will trigger:
 * - calculate_streak() function
 * - update_routine_streak() trigger
 * - Profile stats update
 */
async function handleRoutineComplete(req: Request, requestId: string): Promise<Response> {
  // Get authenticated user
  const user = await getUserFromRequest(req);

  // Extract routine ID from URL
  const routineId = getRoutineIdFromPath(req.url);

  // Parse and validate request body
  const body = await parseRequestBody(req);
  const data = validate(routineCompleteSchema, body);

  const supabase = getSupabaseAdmin();

  // Check if routine exists and user owns it
  const { data: routine, error: routineError } = await supabase
    .from('routines')
    .select('user_id, status, name, current_streak, longest_streak')
    .eq('id', routineId)
    .single();

  if (routineError || !routine) {
    throw new NotFoundError('루틴을 찾을 수 없습니다');
  }

  if (routine.user_id !== user.id) {
    throw new AuthorizationError('이 루틴에 접근할 권한이 없습니다');
  }

  if (routine.status !== 'active') {
    throw new ValidationError('활성화된 루틴만 완료할 수 있습니다');
  }

  // Check if already completed on this date
  const { data: existingCompletion } = await supabase
    .from('routine_completions')
    .select('id')
    .eq('routine_id', routineId)
    .eq('completion_date', data.date)
    .single();

  if (existingCompletion) {
    throw new ConflictError('이미 완료한 루틴입니다');
  }

  // Insert completion record
  // This will automatically trigger:
  // 1. calculate_streak() to compute new streak
  // 2. update_routine_streak() to update routine.current_streak, longest_streak, total_completions
  // 3. Update profile.current_streak, longest_streak, total_completions
  const { error: insertError } = await supabase
    .from('routine_completions')
    .insert({
      routine_id: routineId,
      user_id: user.id,
      completion_date: data.date,
      note: data.note || null,
    });

  if (insertError) {
    console.error('Failed to insert completion:', insertError);

    // Check if it's a unique constraint violation
    if (insertError.code === '23505') {
      throw new ConflictError('이미 완료한 루틴입니다');
    }

    throw new ValidationError('루틴 완료 처리에 실패했습니다');
  }

  // Fetch updated routine to get new streak values
  // (These were updated by the trigger)
  const { data: updatedRoutine } = await supabase
    .from('routines')
    .select('current_streak, longest_streak, total_completions')
    .eq('id', routineId)
    .single();

  const newStreak = updatedRoutine?.current_streak || 0;
  const longestStreak = updatedRoutine?.longest_streak || 0;
  const totalCompletions = updatedRoutine?.total_completions || 0;

  // Check for achievements (7, 15, 30, 50, 100 day streaks)
  const achievements = [];
  if (newStreak === 7) {
    achievements.push({ type: 'streak_7', message: '7일 연속 달성! 🎉' });
  } else if (newStreak === 15) {
    achievements.push({ type: 'streak_15', message: '15일 연속 달성! 🔥' });
  } else if (newStreak === 30) {
    achievements.push({ type: 'streak_30', message: '30일 연속 달성! 💪' });
  } else if (newStreak === 50) {
    achievements.push({ type: 'streak_50', message: '50일 연속 달성! 🏆' });
  } else if (newStreak === 100) {
    achievements.push({ type: 'streak_100', message: '100일 연속 달성! 👑' });
  }

  return successResponse(
    {
      message: `${routine.name} 루틴을 완료했습니다`,
      completion: {
        routineId,
        routineName: routine.name,
        completionDate: data.date,
        note: data.note || null,
      },
      streak: {
        current: newStreak,
        longest: longestStreak,
        isNewRecord: newStreak === longestStreak && newStreak > 1,
      },
      stats: {
        totalCompletions,
      },
      achievements: achievements.length > 0 ? achievements : undefined,
    },
    requestId,
  );
}

serve(withErrorHandling(handleRoutineComplete));
