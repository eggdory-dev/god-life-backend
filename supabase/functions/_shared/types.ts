// ============================================================================
// God Life Backend - Shared TypeScript Types
// ============================================================================

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta: ResponseMeta;
  pagination?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  timestamp: string;
  requestId: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================================================
// User & Profile Types
// ============================================================================

export interface Profile {
  id: string;
  email: string;
  name: string;
  profile_image_url: string | null;
  provider: 'google' | 'apple' | 'kakao';

  // Onboarding
  interests: string[];
  is_faith_user: boolean;
  coaching_style: 'F' | 'T';
  theme_mode: 'faith' | 'universal';
  onboarding_completed: boolean;

  // Settings
  notification_enabled: boolean;
  preferred_notification_time: string;
  dark_mode: 'light' | 'dark' | 'system';
  language: string;

  // Subscription
  subscription_plan: 'basic' | 'pro';
  subscription_expires_at: string | null;
  subscription_auto_renew: boolean;
  subscription_platform: 'ios' | 'android' | null;
  subscription_transaction_id: string | null;

  // Stats
  total_routines: number;
  current_streak: number;
  longest_streak: number;
  total_completions: number;

  created_at: string;
  updated_at: string;
}

export interface OnboardingData {
  interests: string[];
  is_faith_user: boolean;
  coaching_style: 'F' | 'T';
  theme_mode: 'faith' | 'universal';
  notification_enabled: boolean;
  preferred_notification_time: string;
}

// ============================================================================
// Routine Types
// ============================================================================

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  category: 'spiritual' | 'health' | 'learning' | 'productivity' | 'custom';

  schedule_type: 'daily' | 'weekly' | 'custom';
  schedule_time: string;
  schedule_days: number[];
  reminder_enabled: boolean;
  reminder_minutes_before: number;

  status: 'active' | 'archived' | 'deleted';

  current_streak: number;
  longest_streak: number;
  last_completed_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface RoutineCompletion {
  id: string;
  routine_id: string;
  user_id: string;
  completion_date: string;
  completed_at: string;
  note: string | null;
  streak_at_completion: number;
  is_new_record: boolean;
}

export interface RoutineWithTodayStatus extends Routine {
  today_status: {
    is_scheduled: boolean;
    is_completed: boolean;
    completed_at: string | null;
  };
}

// ============================================================================
// AI Coaching Types
// ============================================================================

export interface CoachingConversation {
  id: string;
  user_id: string;
  title: string;
  message_count: number;
  has_report: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoachingMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens_used: number | null;
  model: string | null;
  created_at: string;
}

export interface CoachingReport {
  id: string;
  conversation_id: string;
  user_id: string;
  diagnosis_summary: string;
  diagnosis_details: DiagnosisDetail[];
  recommendations: Recommendation[];
  generated_at: string;
}

export interface DiagnosisDetail {
  category: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Recommendation {
  id: string;
  type: 'routine' | 'advice' | 'resource';
  title: string;
  description: string;
  suggested_routine?: SuggestedRoutine;
  priority: 'high' | 'medium' | 'low';
}

export interface SuggestedRoutine {
  name: string;
  time: string;
  category: 'spiritual' | 'health' | 'learning' | 'productivity';
  description?: string;
}

export interface AIUsageTracking {
  id: string;
  user_id: string;
  usage_date: string;
  conversation_count: number;
  message_count: number;
  tokens_used: number;
}

export interface CoachingContext {
  theme_mode: 'faith' | 'universal';
  coaching_style: 'F' | 'T';
  user_routines: Array<{
    name: string;
    category: string;
    current_streak: number;
  }>;
  recent_completions: Array<{
    routine_name: string;
    completion_date: string;
  }>;
}

// ============================================================================
// Group Types
// ============================================================================

export interface Group {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  max_members: number;
  is_private: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface GroupInvite {
  id: string;
  group_id: string;
  created_by: string;
  invite_code: string;
  expires_at: string;
  created_at: string;
}

export interface GroupCheer {
  id: string;
  group_id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  type: 'text' | 'emoji';
  created_at: string;
}

// ============================================================================
// Challenge Types
// ============================================================================

export interface Challenge {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: 'upcoming' | 'active' | 'completed';
  reward_type: 'badge' | 'points' | 'none' | null;
  reward_title: string | null;
  participant_count: number;
  created_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  completed_days: number;
  current_streak: number;
  joined_at: string;
}

export interface ChallengeVerification {
  id: string;
  challenge_id: string;
  user_id: string;
  verification_date: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface Notification {
  id: string;
  user_id: string;
  type: 'routine_reminder' | 'group_cheer' | 'challenge_update' | 'achievement' | 'system';
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  device_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Insight Types
// ============================================================================

export interface Insight {
  id: string;
  type: 'verse' | 'quote';
  content: string;
  source: string | null;
  author: string | null;
  reflection: string | null;
  image_url: string | null;
  theme_mode: 'faith' | 'universal';
  created_at: string;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface WeeklyStats {
  period: {
    start: string;
    end: string;
  };
  overview: {
    total_completions: number;
    total_routines: number;
    completion_rate: number;
    average_streak: number;
  };
  daily: DailyStats[];
  by_category: CategoryStats[];
  comparison: {
    previous_week_rate: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface DailyStats {
  date: string;
  completed: number;
  total: number;
  rate: number;
}

export interface CategoryStats {
  category: string;
  completed: number;
  total: number;
  rate: number;
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  type: 'ai_daily' | 'ai_monthly' | 'api_minute';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  aud: string;
  exp: number;
}

export interface SocialLoginRequest {
  provider: 'google' | 'apple' | 'kakao';
  token: string;
  deviceInfo?: {
    deviceId: string;
    platform: 'ios' | 'android';
    pushToken?: string;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    name: string;
    profileImage: string | null;
    provider: string;
    isNewUser: boolean;
    subscription: {
      plan: 'basic' | 'pro';
      expiresAt: string | null;
    };
  };
}

// ============================================================================
// Subscription Types
// ============================================================================

export interface SubscriptionVerification {
  platform: 'ios' | 'android';
  receipt: string;
  productId: string;
}

export interface SubscriptionStatus {
  plan: 'basic' | 'pro';
  status: 'active' | 'expired' | 'cancelled';
  startDate: string | null;
  expiresAt: string | null;
  autoRenew: boolean;
  paymentMethod: 'apple_iap' | 'google_play' | null;
  features: {
    aiCoachingLimit: string;
    routineLimit: string;
    groupLimit: number;
    advancedStats: boolean;
  };
}

// ============================================================================
// Error Code Types
// ============================================================================

export type ErrorCode =
  // Authentication errors
  | 'AUTH_001' // Token expired
  | 'AUTH_002' // Invalid token
  | 'AUTH_003' // Login required
  | 'AUTH_004' // Access denied
  | 'AUTH_005' // Social auth failed
  | 'AUTH_006' // Refresh token expired
  | 'AUTH_007' // Rate limit exceeded
  // Validation errors
  | 'VALID_001' // Required field missing
  | 'VALID_002' // Invalid format
  | 'VALID_003' // Out of range
  | 'VALID_004' // Duplicate value
  | 'VALID_005' // File size exceeded
  // Business logic errors
  | 'BIZ_001' // Free tier limit exceeded
  | 'BIZ_002' // Pro subscription required
  | 'BIZ_003' // Resource not found
  | 'BIZ_004' // Resource already exists
  | 'BIZ_005' // Group member limit
  | 'BIZ_006' // Routine limit exceeded
  // System errors
  | 'SYS_001' // Internal error
  | 'SYS_002' // Maintenance
  | 'SYS_003' // Timeout
  | 'SYS_004'; // External service error
