// ============================================================================
// God Life Backend - Routine Uncomplete Edge Function
// DELETE /routines/:id/complete/:date
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
 * Extract routine ID and date from URL path
 */
function getParamsFromPath(url: string): { routineId: string; date: string } {
  const parts = new URL(url).pathname.split('/');
  // URL pattern: /routines/:id/complete/:date
  const routineId = parts[parts.length - 3];
  const date = parts[parts.length - 1];

  if (!routineId || !date) {
    throw new ValidationError('루틴 ID와 날짜가 필요합니다');
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ValidationError('날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)');
  }

  return { routineId, date };
}

/**
 * Remove routine completion for a specific date
 *
 * After deletion, the streak will need to be recalculated.
 * We could add a trigger for this, but for MVP we'll recalculate on next completion.
 */
async function handleRoutineUncomplete(req: Request, requestId: string): Promise<Response> {
  // Get authenticated user
  const user = await getUserFromRequest(req);

  // Extract routine ID and date from URL
  const { routineId, date } = getParamsFromPath(req.url);

  const supabase = getSupabaseAdmin();

  // Check if routine exists and user owns it
  const { data: routine, error: routineError } = await supabase
    .from('routines')
    .select('user_id, name')
    .eq('id', routineId)
    .single();

  if (routineError || !routine) {
    throw new NotFoundError('루틴을 찾을 수 없습니다');
  }

  if (routine.user_id !== user.id) {
    throw new AuthorizationError('이 루틴에 접근할 권한이 없습니다');
  }

  // Check if completion exists
  const { data: completion, error: fetchError } = await supabase
    .from('routine_completions')
    .select('id')
    .eq('routine_id', routineId)
    .eq('completion_date', date)
    .single();

  if (fetchError || !completion) {
    throw new NotFoundError('완료 기록을 찾을 수 없습니다');
  }

  // Delete completion record
  const { error: deleteError } = await supabase
    .from('routine_completions')
    .delete()
    .eq('id', completion.id);

  if (deleteError) {
    console.error('Failed to delete completion:', deleteError);
    throw new ValidationError('완료 기록 삭제에 실패했습니다');
  }

  // Recalculate streak for this routine
  // Get the latest completion date to calculate streak from
  const { data: latestCompletion } = await supabase
    .from('routine_completions')
    .select('completion_date')
    .eq('routine_id', routineId)
    .order('completion_date', { ascending: false })
    .limit(1)
    .single();

  let newStreak = 0;

  if (latestCompletion) {
    // Call calculate_streak function
    const { data: streakData, error: streakError } = await supabase
      .rpc('calculate_streak', {
        p_routine_id: routineId,
        p_completion_date: latestCompletion.completion_date,
      });

    if (!streakError && streakData !== null) {
      newStreak = streakData;
    }
  }

  // Update routine with new streak
  const { data: updatedRoutine } = await supabase
    .from('routines')
    .update({
      current_streak: newStreak,
      total_completions: Math.max(0, (routine as any).total_completions - 1),
      updated_at: new Date().toISOString(),
    })
    .eq('id', routineId)
    .select('current_streak, longest_streak, total_completions')
    .single();

  // Update profile stats
  await supabase
    .from('profiles')
    .update({
      total_completions: Math.max(0, (user as any).total_completions - 1),
    })
    .eq('id', user.id);

  return successResponse(
    {
      message: `${routine.name} 완료 기록이 취소되었습니다`,
      uncompleted: {
        routineId,
        routineName: routine.name,
        date,
      },
      streak: {
        current: updatedRoutine?.current_streak || 0,
        longest: updatedRoutine?.longest_streak || 0,
      },
    },
    requestId,
  );
}

serve(withErrorHandling(handleRoutineUncomplete));
