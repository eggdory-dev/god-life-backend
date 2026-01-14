-- ============================================================================
-- God Life Backend - Initial Database Schema
-- Migration: 20260114000001
-- Description: Creates all core tables for the God Life planner application
-- ============================================================================

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USER MANAGEMENT
-- ============================================================================

-- Profiles table (extends auth.users)
-- Stores user profile, settings, subscription, and denormalized stats
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  profile_image_url TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'kakao')),

  -- Onboarding preferences
  interests TEXT[], -- e.g., ['prayer', 'bible', 'exercise', 'reading']
  is_faith_user BOOLEAN DEFAULT true,
  coaching_style TEXT CHECK (coaching_style IN ('F', 'T')), -- Feeling vs Thinking
  theme_mode TEXT CHECK (theme_mode IN ('faith', 'universal')) DEFAULT 'faith',
  onboarding_completed BOOLEAN DEFAULT false,

  -- User settings
  notification_enabled BOOLEAN DEFAULT true,
  preferred_notification_time TIME DEFAULT '07:00',
  dark_mode TEXT CHECK (dark_mode IN ('light', 'dark', 'system')) DEFAULT 'system',
  language TEXT DEFAULT 'ko',

  -- Subscription management
  subscription_plan TEXT CHECK (subscription_plan IN ('basic', 'pro')) DEFAULT 'basic',
  subscription_expires_at TIMESTAMPTZ,
  subscription_auto_renew BOOLEAN DEFAULT false,
  subscription_platform TEXT CHECK (subscription_platform IN ('ios', 'android')),
  subscription_transaction_id TEXT,

  -- Denormalized stats for performance
  total_routines INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  total_completions INT DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes for profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_subscription ON profiles(subscription_plan, subscription_expires_at);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- Comments for profiles
COMMENT ON TABLE profiles IS 'User profiles with settings, subscription, and denormalized stats';
COMMENT ON COLUMN profiles.coaching_style IS 'F = Feeling (empathetic), T = Thinking (logical)';
COMMENT ON COLUMN profiles.theme_mode IS 'faith = Christian themed, universal = secular themed';


-- ============================================================================
-- ROUTINE SYSTEM
-- ============================================================================

-- Routines table
-- Stores user-created habits/routines with scheduling and streak information
CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic information
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
  description TEXT,
  icon TEXT NOT NULL,
  color TEXT NOT NULL CHECK (color ~* '^#[0-9A-Fa-f]{6}$'), -- Hex color validation
  category TEXT NOT NULL CHECK (category IN ('spiritual', 'health', 'learning', 'productivity', 'custom')),

  -- Scheduling configuration
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'custom')),
  schedule_time TIME NOT NULL,
  schedule_days INT[] NOT NULL CHECK (array_length(schedule_days, 1) > 0), -- [1,2,3,4,5,6,7] for Mon-Sun
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_minutes_before INT DEFAULT 10 CHECK (reminder_minutes_before >= 0 AND reminder_minutes_before <= 1440),

  -- Status management
  status TEXT NOT NULL CHECK (status IN ('active', 'archived', 'deleted')) DEFAULT 'active',

  -- Streak tracking (denormalized for performance)
  current_streak INT DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INT DEFAULT 0 CHECK (longest_streak >= 0),
  last_completed_at DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for routines
CREATE INDEX idx_routines_user_status ON routines(user_id, status);
CREATE INDEX idx_routines_user_active ON routines(user_id) WHERE status = 'active';
CREATE INDEX idx_routines_schedule ON routines(schedule_time, schedule_days);
CREATE INDEX idx_routines_last_completed ON routines(last_completed_at DESC);

-- Comments for routines
COMMENT ON TABLE routines IS 'User-created routines/habits with schedules and streaks';
COMMENT ON COLUMN routines.schedule_days IS 'Array of integers 1-7 representing Mon-Sun';
COMMENT ON COLUMN routines.current_streak IS 'Consecutive days the routine has been completed';


-- Routine completions table
-- Tracks each completion of a routine with streak information
CREATE TABLE IF NOT EXISTS routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Completion information
  completion_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,

  -- Streak snapshot at time of completion
  streak_at_completion INT NOT NULL CHECK (streak_at_completion > 0),
  is_new_record BOOLEAN DEFAULT false,

  -- Prevent duplicate completions on same date
  UNIQUE(routine_id, completion_date)
);

-- Indexes for routine_completions
CREATE INDEX idx_completions_routine_date ON routine_completions(routine_id, completion_date DESC);
CREATE INDEX idx_completions_user_date ON routine_completions(user_id, completion_date DESC);
CREATE INDEX idx_completions_date ON routine_completions(completion_date DESC);
CREATE INDEX idx_completions_completed_at ON routine_completions(completed_at DESC);

-- Comments for routine_completions
COMMENT ON TABLE routine_completions IS 'History of routine completions with streak snapshots';
COMMENT ON COLUMN routine_completions.streak_at_completion IS 'Streak value at the time of this completion';


-- ============================================================================
-- AI COACHING SYSTEM
-- ============================================================================

-- Coaching conversations table
-- Stores conversation sessions between user and AI coach
CREATE TABLE IF NOT EXISTS coaching_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL DEFAULT '새로운 상담',
  message_count INT DEFAULT 0 CHECK (message_count >= 0),
  has_report BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for coaching_conversations
CREATE INDEX idx_conversations_user_updated ON coaching_conversations(user_id, updated_at DESC);
CREATE INDEX idx_conversations_has_report ON coaching_conversations(has_report, updated_at DESC);

-- Comments
COMMENT ON TABLE coaching_conversations IS 'AI coaching conversation sessions';


-- Coaching messages table
-- Stores individual messages in conversations (user and assistant)
CREATE TABLE IF NOT EXISTS coaching_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES coaching_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (length(content) > 0),

  -- AI metadata
  tokens_used INT CHECK (tokens_used >= 0),
  model TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for coaching_messages
CREATE INDEX idx_messages_conversation_created ON coaching_messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_user_created ON coaching_messages(user_id, created_at DESC);
CREATE INDEX idx_messages_role ON coaching_messages(role, created_at DESC);

-- Comments
COMMENT ON TABLE coaching_messages IS 'Messages in AI coaching conversations';
COMMENT ON COLUMN coaching_messages.role IS 'user = human message, assistant = AI response';


-- Coaching reports table
-- Stores generated coaching reports with diagnosis and recommendations
CREATE TABLE IF NOT EXISTS coaching_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES coaching_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Diagnosis section
  diagnosis_summary TEXT NOT NULL,
  diagnosis_details JSONB NOT NULL, -- [{category, issue, severity}]

  -- Recommendations section
  recommendations JSONB NOT NULL, -- [{id, type, title, description, suggestedRoutine, priority}]

  generated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Validation
  CONSTRAINT diagnosis_details_format CHECK (jsonb_typeof(diagnosis_details) = 'array'),
  CONSTRAINT recommendations_format CHECK (jsonb_typeof(recommendations) = 'array')
);

-- Indexes for coaching_reports
CREATE INDEX idx_reports_conversation ON coaching_reports(conversation_id);
CREATE INDEX idx_reports_user_generated ON coaching_reports(user_id, generated_at DESC);

-- Comments
COMMENT ON TABLE coaching_reports IS 'AI-generated coaching reports with recommendations';


-- AI usage tracking table
-- Tracks AI usage for rate limiting (daily for free, monthly for pro)
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  usage_date DATE NOT NULL,
  conversation_count INT DEFAULT 0 CHECK (conversation_count >= 0),
  message_count INT DEFAULT 0 CHECK (message_count >= 0),
  tokens_used INT DEFAULT 0 CHECK (tokens_used >= 0),

  UNIQUE(user_id, usage_date)
);

-- Indexes for ai_usage_tracking
CREATE INDEX idx_ai_usage_user_date ON ai_usage_tracking(user_id, usage_date DESC);
CREATE INDEX idx_ai_usage_date ON ai_usage_tracking(usage_date DESC);

-- Comments
COMMENT ON TABLE ai_usage_tracking IS 'Tracks AI usage for rate limiting';


-- ============================================================================
-- SOCIAL FEATURES - GROUPS
-- ============================================================================

-- Groups table
-- Small accountability groups for habit tracking
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
  description TEXT,
  max_members INT NOT NULL DEFAULT 10 CHECK (max_members >= 2 AND max_members <= 30),
  is_private BOOLEAN DEFAULT true,

  member_count INT DEFAULT 1 CHECK (member_count >= 0 AND member_count <= max_members),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for groups
CREATE INDEX idx_groups_owner ON groups(owner_id);
CREATE INDEX idx_groups_created ON groups(created_at DESC);

-- Comments
COMMENT ON TABLE groups IS 'Small accountability groups (2-30 members)';


-- Group members table
-- Tracks membership in groups
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  role TEXT NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, user_id)
);

-- Indexes for group_members
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_joined ON group_members(joined_at DESC);

-- Comments
COMMENT ON TABLE group_members IS 'Group membership relationships';


-- Group invites table
-- Temporary invite codes for joining groups
CREATE TABLE IF NOT EXISTS group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  invite_code TEXT NOT NULL UNIQUE CHECK (length(invite_code) = 6),
  expires_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for group_invites
CREATE INDEX idx_invites_code ON group_invites(invite_code);
CREATE INDEX idx_invites_group ON group_invites(group_id);
CREATE INDEX idx_invites_expires ON group_invites(expires_at DESC);

-- Comments
COMMENT ON TABLE group_invites IS 'Temporary invite codes for groups (6 chars, 7-day expiry)';


-- Group cheers table
-- Encouragement messages between group members
CREATE TABLE IF NOT EXISTS group_cheers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  message TEXT NOT NULL CHECK (length(message) >= 1 AND length(message) <= 500),
  type TEXT NOT NULL CHECK (type IN ('text', 'emoji')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Can't cheer yourself
  CHECK (from_user_id != to_user_id)
);

-- Indexes for group_cheers
CREATE INDEX idx_cheers_to_user_created ON group_cheers(to_user_id, created_at DESC);
CREATE INDEX idx_cheers_group_created ON group_cheers(group_id, created_at DESC);
CREATE INDEX idx_cheers_from_user ON group_cheers(from_user_id, created_at DESC);

-- Comments
COMMENT ON TABLE group_cheers IS 'Encouragement messages between group members';


-- ============================================================================
-- CHALLENGES
-- ============================================================================

-- Challenges table
-- Time-bound challenges for users to join
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title TEXT NOT NULL CHECK (length(title) >= 1 AND length(title) <= 200),
  description TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),
  total_days INT GENERATED ALWAYS AS (end_date - start_date + 1) STORED,

  status TEXT NOT NULL CHECK (status IN ('upcoming', 'active', 'completed')) DEFAULT 'upcoming',

  -- Rewards
  reward_type TEXT CHECK (reward_type IN ('badge', 'points', 'none')),
  reward_title TEXT,

  participant_count INT DEFAULT 0 CHECK (participant_count >= 0),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for challenges
CREATE INDEX idx_challenges_status_start ON challenges(status, start_date DESC);
CREATE INDEX idx_challenges_start_date ON challenges(start_date DESC);
CREATE INDEX idx_challenges_end_date ON challenges(end_date DESC);

-- Comments
COMMENT ON TABLE challenges IS 'Time-bound challenges (e.g., 21-day gratitude challenge)';


-- Challenge participants table
-- Tracks user participation in challenges
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  completed_days INT DEFAULT 0 CHECK (completed_days >= 0),
  current_streak INT DEFAULT 0 CHECK (current_streak >= 0),

  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(challenge_id, user_id)
);

-- Indexes for challenge_participants
CREATE INDEX idx_participants_challenge_completed ON challenge_participants(challenge_id, completed_days DESC);
CREATE INDEX idx_participants_user ON challenge_participants(user_id);
CREATE INDEX idx_participants_joined ON challenge_participants(joined_at DESC);

-- Comments
COMMENT ON TABLE challenge_participants IS 'User participation in challenges';


-- Challenge verifications table
-- Daily check-ins/verifications for challenge completion
CREATE TABLE IF NOT EXISTS challenge_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  verification_date DATE NOT NULL,
  content TEXT,
  image_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(challenge_id, user_id, verification_date)
);

-- Indexes for challenge_verifications
CREATE INDEX idx_verifications_challenge_date ON challenge_verifications(challenge_id, verification_date DESC);
CREATE INDEX idx_verifications_user ON challenge_verifications(user_id, verification_date DESC);

-- Comments
COMMENT ON TABLE challenge_verifications IS 'Daily check-ins for challenge completion';


-- ============================================================================
-- NOTIFICATIONS SYSTEM
-- ============================================================================

-- Notifications table
-- In-app notifications for users
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('routine_reminder', 'group_cheer', 'challenge_update', 'achievement', 'system')),
  title TEXT NOT NULL CHECK (length(title) >= 1 AND length(title) <= 200),
  body TEXT NOT NULL CHECK (length(body) >= 1 AND length(body) <= 1000),
  data JSONB, -- Additional data (e.g., routine_id, group_id)

  is_read BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_type_created ON notifications(type, created_at DESC);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Comments
COMMENT ON TABLE notifications IS 'In-app notifications for users';


-- Push tokens table
-- FCM push notification tokens for devices
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id TEXT NOT NULL,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, device_id)
);

-- Indexes for push_tokens
CREATE INDEX idx_push_tokens_user_active ON push_tokens(user_id, is_active);
CREATE INDEX idx_push_tokens_device ON push_tokens(device_id);

-- Comments
COMMENT ON TABLE push_tokens IS 'Firebase Cloud Messaging tokens for push notifications';


-- ============================================================================
-- INSIGHTS & CONTENT
-- ============================================================================

-- Insights table
-- Daily inspirational content (faith-based verses or universal quotes)
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  type TEXT NOT NULL CHECK (type IN ('verse', 'quote')),
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 1000),
  source TEXT, -- Bible reference (e.g., "시편 23:1") or author name
  author TEXT,
  reflection TEXT, -- Optional reflection/commentary
  image_url TEXT,

  theme_mode TEXT NOT NULL CHECK (theme_mode IN ('faith', 'universal')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for insights
CREATE INDEX idx_insights_theme ON insights(theme_mode);
CREATE INDEX idx_insights_type ON insights(type);
CREATE INDEX idx_insights_created ON insights(created_at DESC);

-- Comments
COMMENT ON TABLE insights IS 'Daily inspirational content (verses for faith mode, quotes for universal mode)';


-- ============================================================================
-- COMPLETION
-- ============================================================================

-- Add table count comment
COMMENT ON SCHEMA public IS 'God Life Backend - 20 core tables created successfully';

-- Insert initial schema version
CREATE TABLE IF NOT EXISTS schema_version (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

INSERT INTO schema_version (version, description) VALUES
  ('20260114000001', 'Initial schema with 20 core tables');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully created 20 tables for God Life Backend';
  RAISE NOTICE 'Next steps: Apply RLS policies (migration 20260114000002)';
END $$;
