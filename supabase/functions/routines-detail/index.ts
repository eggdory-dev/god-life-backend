// ============================================================================
// God Life Backend - Routine Detail Edge Function
// GET /routines/:id - Get routine detail
// PATCH /routines/:id - Update routine
// DELETE /routines/:id - Soft delete routine
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { getSupabaseAdmin } from '../_shared/database.ts';
import {
  parseRequestBody,
  successResponse,
  withErrorHandling,
} from '../_shared/response.ts';
import { routineUpdateSchema, validate } from '../_shared/validators.ts';
import { NotFoundError, ValidationError, AuthorizationError } from '../_shared/errors.ts';

/**
 * Extract routine ID from URL path
 */
function getRoutineIdFromPath(url: string): string {
  const parts = new URL(url).pathname.split('/');
  const id = parts[parts.length - 1];

  if (!id) {
    throw new ValidationError('루틴 ID가 필요합니다');
  }

  return id;
}

/**
 * Get routine detail
 */
async function getRoutineDetail(
  userId: string,
  routineId: string,
  requestId: string,
): Promise<Response> {
  const supabase = getSupabaseAdmin();

  const { data: routine, error } = await supabase
    .from('routines')
    .select('*')
    .eq('id', routineId)
    .single();

  if (error || !routine) {
    throw new NotFoundError('루틴을 찾을 수 없습니다');
  }

  // Check ownership
  if (routine.user_id !== userId) {
    throw new AuthorizationError('이 루틴에 접근할 권한이 없습니다');
  }

  return successResponse(
    {
      id: routine.id,
      name: routine.name,
      description: routine.description,
      icon: routine.icon,
      color: routine.color,
      category: routine.category,
      schedule: routine.schedule,
      status: routine.status,
      currentStreak: routine.current_streak,
      longestStreak: routine.longest_streak,
      totalCompletions: routine.total_completions,
      createdAt: routine.created_at,
      updatedAt: routine.updated_at,
    },
    requestId,
  );
}

/**
 * Update routine
 */
async function updateRoutine(
  userId: string,
  routineId: string,
  req: Request,
  requestId: string,
): Promise<Response> {
  const supabase = getSupabaseAdmin();

  // Check if routine exists and user owns it
  const { data: existingRoutine, error: fetchError } = await supabase
    .from('routines')
    .select('user_id')
    .eq('id', routineId)
    .single();

  if (fetchError || !existingRoutine) {
    throw new NotFoundError('루틴을 찾을 수 없습니다');
  }

  if (existingRoutine.user_id !== userId) {
    throw new AuthorizationError('이 루틴을 수정할 권한이 없습니다');
  }

  // Parse and validate request body
  const body = await parseRequestBody(req);
  const data = validate(routineUpdateSchema, body);

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.color !== undefined) updates.color = data.color;
  if (data.category !== undefined) updates.category = data.category;
  if (data.schedule !== undefined) updates.schedule = data.schedule;
  if (data.status !== undefined) updates.status = data.status;

  // Update routine
  const { data: updatedRoutine, error: updateError } = await supabase
    .from('routines')
    .update(updates)
    .eq('id', routineId)
    .select()
    .single();

  if (updateError) {
    console.error('Failed to update routine:', updateError);
    throw new ValidationError('루틴 업데이트에 실패했습니다');
  }

  return successResponse(
    {
      message: '루틴이 업데이트되었습니다',
      routine: {
        id: updatedRoutine.id,
        name: updatedRoutine.name,
        description: updatedRoutine.description,
        icon: updatedRoutine.icon,
        color: updatedRoutine.color,
        category: updatedRoutine.category,
        schedule: updatedRoutine.schedule,
        status: updatedRoutine.status,
        currentStreak: updatedRoutine.current_streak,
        longestStreak: updatedRoutine.longest_streak,
        totalCompletions: updatedRoutine.total_completions,
        createdAt: updatedRoutine.created_at,
        updatedAt: updatedRoutine.updated_at,
      },
    },
    requestId,
  );
}

/**
 * Soft delete routine (set status = 'deleted')
 */
async function deleteRoutine(
  userId: string,
  routineId: string,
  requestId: string,
): Promise<Response> {
  const supabase = getSupabaseAdmin();

  // Check if routine exists and user owns it
  const { data: existingRoutine, error: fetchError } = await supabase
    .from('routines')
    .select('user_id')
    .eq('id', routineId)
    .single();

  if (fetchError || !existingRoutine) {
    throw new NotFoundError('루틴을 찾을 수 없습니다');
  }

  if (existingRoutine.user_id !== userId) {
    throw new AuthorizationError('이 루틴을 삭제할 권한이 없습니다');
  }

  // Soft delete (set status = 'deleted')
  const { error: deleteError } = await supabase
    .from('routines')
    .update({
      status: 'deleted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', routineId);

  if (deleteError) {
    console.error('Failed to delete routine:', deleteError);
    throw new ValidationError('루틴 삭제에 실패했습니다');
  }

  return successResponse(
    {
      message: '루틴이 삭제되었습니다',
    },
    requestId,
  );
}

/**
 * Main handler - routes GET, PATCH, and DELETE requests
 */
async function handleRoutineDetail(req: Request, requestId: string): Promise<Response> {
  // Get authenticated user
  const user = await getUserFromRequest(req);

  // Extract routine ID from URL
  const routineId = getRoutineIdFromPath(req.url);

  // Route based on HTTP method
  if (req.method === 'GET') {
    return await getRoutineDetail(user.id, routineId, requestId);
  } else if (req.method === 'PATCH') {
    return await updateRoutine(user.id, routineId, req, requestId);
  } else if (req.method === 'DELETE') {
    return await deleteRoutine(user.id, routineId, requestId);
  } else {
    throw new ValidationError(`지원하지 않는 HTTP 메서드입니다: ${req.method}`);
  }
}

serve(withErrorHandling(handleRoutineDetail));
