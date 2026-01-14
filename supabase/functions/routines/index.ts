// ============================================================================
// God Life Backend - Routines Edge Function
// GET /routines - List user's routines
// POST /routines - Create new routine
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getUserFromRequest, hasProSubscription } from '../_shared/auth.ts';
import { getSupabaseAdmin } from '../_shared/database.ts';
import {
  parseRequestBody,
  successResponse,
  withErrorHandling,
  createPaginationMeta,
} from '../_shared/response.ts';
import { routineCreateSchema, validate } from '../_shared/validators.ts';
import { FreeTierLimitError, ValidationError } from '../_shared/errors.ts';

/**
 * Get user's routines with optional filtering
 */
async function getRoutines(
  userId: string,
  req: Request,
  requestId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || 'active';
  const category = url.searchParams.get('category');
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const cursor = url.searchParams.get('cursor');

  const supabase = getSupabaseAdmin();

  // Build query
  let query = supabase
    .from('routines')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (category) {
    query = query.eq('category', category);
  }

  // Apply cursor pagination
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('_');
    query = query.lt('created_at', cursorDate).limit(limit);
  } else {
    query = query.limit(limit);
  }

  const { data: routines, error, count } = await query;

  if (error) {
    console.error('Failed to fetch routines:', error);
    throw new ValidationError('루틴 목록을 불러오는데 실패했습니다');
  }

  // Create pagination metadata
  const hasMore = routines.length === limit;
  const nextCursor = hasMore && routines.length > 0
    ? `${routines[routines.length - 1].created_at}_${routines[routines.length - 1].id}`
    : null;

  const pagination = createPaginationMeta({
    total: count || 0,
    limit,
    hasMore,
    nextCursor,
  });

  return successResponse(
    routines.map((routine) => ({
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
    })),
    requestId,
    pagination,
  );
}

/**
 * Create new routine
 *
 * Free users: Max 5 active routines
 * Pro users: Unlimited routines
 */
async function createRoutine(
  userId: string,
  req: Request,
  requestId: string,
): Promise<Response> {
  const supabase = getSupabaseAdmin();

  // Get user profile to check subscription
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_plan, subscription_expires_at')
    .eq('id', userId)
    .single();

  if (profileError) {
    throw new ValidationError('사용자 프로필을 찾을 수 없습니다');
  }

  // Check if user has Pro subscription
  const isPro = hasProSubscription(profile.subscription_plan, profile.subscription_expires_at);

  // If not Pro, check active routine limit
  if (!isPro) {
    const { count, error: countError } = await supabase
      .from('routines')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (countError) {
      console.error('Failed to count routines:', countError);
      throw new ValidationError('루틴 개수 확인에 실패했습니다');
    }

    if (count !== null && count >= 5) {
      throw new FreeTierLimitError('routine', {
        currentCount: count,
        maxCount: 5,
      });
    }
  }

  // Parse and validate request body
  const body = await parseRequestBody(req);
  const data = validate(routineCreateSchema, body);

  // Create routine
  const { data: routine, error: insertError } = await supabase
    .from('routines')
    .insert({
      user_id: userId,
      name: data.name,
      description: data.description || null,
      icon: data.icon,
      color: data.color,
      category: data.category,
      schedule: data.schedule,
      status: 'active',
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to create routine:', insertError);
    throw new ValidationError('루틴 생성에 실패했습니다');
  }

  // Update profile total_routines count
  await supabase.rpc('increment', {
    table_name: 'profiles',
    row_id: userId,
    column_name: 'total_routines',
  });

  return successResponse(
    {
      message: '루틴이 생성되었습니다',
      routine: {
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
    },
    requestId,
  );
}

/**
 * Main handler - routes GET and POST requests
 */
async function handleRoutines(req: Request, requestId: string): Promise<Response> {
  // Get authenticated user
  const user = await getUserFromRequest(req);

  // Route based on HTTP method
  if (req.method === 'GET') {
    return await getRoutines(user.id, req, requestId);
  } else if (req.method === 'POST') {
    return await createRoutine(user.id, req, requestId);
  } else {
    throw new ValidationError(`지원하지 않는 HTTP 메서드입니다: ${req.method}`);
  }
}

serve(withErrorHandling(handleRoutines));
