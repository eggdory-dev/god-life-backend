-- ============================================================================
-- God Life Backend - Database Functions & Triggers
-- Migration: 20260114000003
-- Description: Streak calculation, stat updates, and atomic operations
-- ============================================================================

-- ============================================================================
-- STREAK CALCULATION FUNCTIONS
-- ============================================================================

-- Calculate current streak for a routine based on completion history
-- This function counts consecutive completed days backwards from a given date
CREATE OR REPLACE FUNCTION calculate_streak(
  p_routine_id UUID,
  p_completion_date DATE
) RETURNS INT AS $$
DECLARE
  v_streak INT := 1;
  v_check_date DATE := p_completion_date - 1;
  v_exists BOOLEAN;
BEGIN
  -- Start with 1 (the current completion)
  -- Loop backwards checking for consecutive completions
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM routine_completions
      WHERE routine_id = p_routine_id
      AND completion_date = v_check_date
    ) INTO v_exists;

    -- Exit if no completion found on this date
    EXIT WHEN NOT v_exists;

    -- Increment streak and check previous day
    v_streak := v_streak + 1;
    v_check_date := v_check_date - 1;

    -- Safety limit to prevent infinite loops
    EXIT WHEN v_streak > 10000;
  END LOOP;

  RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_streak IS 'Calculates current streak by counting consecutive completions backwards from date';


-- ============================================================================
-- ROUTINE UPDATE TRIGGERS
-- ============================================================================

-- Update routine streaks after completion insert
-- This trigger fires AFTER a completion is inserted to update the routine's streak fields
CREATE OR REPLACE FUNCTION update_routine_streak()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE routines
  SET
    current_streak = NEW.streak_at_completion,
    longest_streak = GREATEST(longest_streak, NEW.streak_at_completion),
    last_completed_at = NEW.completion_date,
    updated_at = NOW()
  WHERE id = NEW.routine_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_routine_streak
  AFTER INSERT ON routine_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_routine_streak();

COMMENT ON FUNCTION update_routine_streak IS 'Automatically updates routine streak after completion';


-- Reset routine streak after completion delete (undo)
CREATE OR REPLACE FUNCTION reset_routine_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_new_streak INT;
  v_last_date DATE;
BEGIN
  -- Find the most recent completion for this routine
  SELECT completion_date INTO v_last_date
  FROM routine_completions
  WHERE routine_id = OLD.routine_id
  ORDER BY completion_date DESC
  LIMIT 1;

  -- If no completions left, reset to 0
  IF v_last_date IS NULL THEN
    UPDATE routines
    SET
      current_streak = 0,
      last_completed_at = NULL,
      updated_at = NOW()
    WHERE id = OLD.routine_id;
  ELSE
    -- Recalculate streak from the last completion
    v_new_streak := calculate_streak(OLD.routine_id, v_last_date);

    UPDATE routines
    SET
      current_streak = v_new_streak,
      last_completed_at = v_last_date,
      updated_at = NOW()
    WHERE id = OLD.routine_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_reset_routine_streak
  AFTER DELETE ON routine_completions
  FOR EACH ROW
  EXECUTE FUNCTION reset_routine_streak();

COMMENT ON FUNCTION reset_routine_streak IS 'Recalculates routine streak after completion delete';


-- ============================================================================
-- PROFILE STATS UPDATE TRIGGERS
-- ============================================================================

-- Update profile stats after routine completion
-- This denormalizes stats to the profile for fast dashboard queries
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET
    total_completions = total_completions + 1,
    current_streak = (
      SELECT COALESCE(MAX(current_streak), 0)
      FROM routines
      WHERE user_id = NEW.user_id AND status = 'active'
    ),
    longest_streak = (
      SELECT COALESCE(MAX(longest_streak), 0)
      FROM routines
      WHERE user_id = NEW.user_id
    ),
    updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_profile_stats
  AFTER INSERT ON routine_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_stats();

COMMENT ON FUNCTION update_profile_stats IS 'Updates profile denormalized stats after completion';


-- Decrement profile stats after completion delete
CREATE OR REPLACE FUNCTION decrement_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET
    total_completions = GREATEST(0, total_completions - 1),
    current_streak = (
      SELECT COALESCE(MAX(current_streak), 0)
      FROM routines
      WHERE user_id = OLD.user_id AND status = 'active'
    ),
    longest_streak = (
      SELECT COALESCE(MAX(longest_streak), 0)
      FROM routines
      WHERE user_id = OLD.user_id
    ),
    updated_at = NOW()
  WHERE id = OLD.user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_decrement_profile_stats
  AFTER DELETE ON routine_completions
  FOR EACH ROW
  EXECUTE FUNCTION decrement_profile_stats();


-- Update total_routines count when routine status changes
CREATE OR REPLACE FUNCTION update_profile_routine_count()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Determine user_id (could be from NEW or OLD depending on operation)
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  -- Update total active routines count
  UPDATE profiles
  SET
    total_routines = (
      SELECT COUNT(*)
      FROM routines
      WHERE user_id = v_user_id AND status = 'active'
    ),
    updated_at = NOW()
  WHERE id = v_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_profile_routine_count_insert
  AFTER INSERT ON routines
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_routine_count();

CREATE TRIGGER trigger_update_profile_routine_count_update
  AFTER UPDATE ON routines
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_profile_routine_count();

CREATE TRIGGER trigger_update_profile_routine_count_delete
  AFTER DELETE ON routines
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_routine_count();


-- ============================================================================
-- TIMESTAMP UPDATE TRIGGERS
-- ============================================================================

-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON routines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON coaching_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- AI USAGE TRACKING FUNCTIONS
-- ============================================================================

-- Atomic increment of AI usage (for rate limiting)
-- This function safely increments usage counters without race conditions
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_user_id UUID,
  p_usage_date DATE DEFAULT CURRENT_DATE,
  p_message_tokens INT DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_usage_tracking (
    user_id,
    usage_date,
    conversation_count,
    message_count,
    tokens_used
  )
  VALUES (
    p_user_id,
    p_usage_date,
    1,
    1,
    p_message_tokens
  )
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    conversation_count = ai_usage_tracking.conversation_count + 1,
    message_count = ai_usage_tracking.message_count + 1,
    tokens_used = ai_usage_tracking.tokens_used + p_message_tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_ai_usage IS 'Atomically increments AI usage for rate limiting';


-- Check AI usage limit (returns true if within limit)
CREATE OR REPLACE FUNCTION check_ai_limit(
  p_user_id UUID,
  p_check_date DATE DEFAULT CURRENT_DATE
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
  v_plan TEXT;
  v_expires_at TIMESTAMPTZ;
  v_limit INT;
BEGIN
  -- Get user subscription plan
  SELECT subscription_plan, subscription_expires_at
  INTO v_plan, v_expires_at
  FROM profiles
  WHERE id = p_user_id;

  -- Determine limit based on plan
  IF v_plan = 'pro' AND v_expires_at > NOW() THEN
    -- Pro users: 500 per month
    SELECT COALESCE(SUM(conversation_count), 0)
    INTO v_count
    FROM ai_usage_tracking
    WHERE user_id = p_user_id
    AND usage_date >= DATE_TRUNC('month', p_check_date)::DATE;

    v_limit := 500;
  ELSE
    -- Free users: 3 per day
    SELECT COALESCE(conversation_count, 0)
    INTO v_count
    FROM ai_usage_tracking
    WHERE user_id = p_user_id
    AND usage_date = p_check_date;

    v_limit := 3;
  END IF;

  RETURN v_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_ai_limit IS 'Check if user is within AI usage limit (3/day free, 500/month pro)';


-- ============================================================================
-- CONVERSATION MESSAGE COUNT UPDATE
-- ============================================================================

-- Update message_count in coaching_conversations
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coaching_conversations
  SET
    message_count = message_count + 1,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_conversation_message_count
  AFTER INSERT ON coaching_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_message_count();


-- ============================================================================
-- GROUP MEMBER COUNT UPDATE
-- ============================================================================

-- Update member_count in groups
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id UUID;
BEGIN
  -- Determine group_id
  IF TG_OP = 'DELETE' THEN
    v_group_id := OLD.group_id;
  ELSE
    v_group_id := NEW.group_id;
  END IF;

  -- Update count
  UPDATE groups
  SET
    member_count = (
      SELECT COUNT(*) FROM group_members WHERE group_id = v_group_id
    ),
    updated_at = NOW()
  WHERE id = v_group_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_group_member_count_insert
  AFTER INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_group_member_count();

CREATE TRIGGER trigger_update_group_member_count_delete
  AFTER DELETE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_group_member_count();


-- ============================================================================
-- CHALLENGE PARTICIPANT COUNT UPDATE
-- ============================================================================

-- Update participant_count in challenges
CREATE OR REPLACE FUNCTION update_challenge_participant_count()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_challenge_id := OLD.challenge_id;
  ELSE
    v_challenge_id := NEW.challenge_id;
  END IF;

  UPDATE challenges
  SET participant_count = (
    SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = v_challenge_id
  )
  WHERE id = v_challenge_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_challenge_participant_count_insert
  AFTER INSERT ON challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_participant_count();

CREATE TRIGGER trigger_update_challenge_participant_count_delete
  AFTER DELETE ON challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_participant_count();


-- ============================================================================
-- CHALLENGE VERIFICATION TRIGGERS
-- ============================================================================

-- Update challenge participant stats after verification
CREATE OR REPLACE FUNCTION update_challenge_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_completed_days INT;
  v_streak INT;
BEGIN
  -- Count total completed days
  SELECT COUNT(*)
  INTO v_completed_days
  FROM challenge_verifications
  WHERE challenge_id = NEW.challenge_id
  AND user_id = NEW.user_id;

  -- Calculate current streak (similar to routine streaks)
  v_streak := 1;
  FOR i IN 1..v_completed_days LOOP
    IF NOT EXISTS(
      SELECT 1 FROM challenge_verifications
      WHERE challenge_id = NEW.challenge_id
      AND user_id = NEW.user_id
      AND verification_date = NEW.verification_date - i
    ) THEN
      EXIT;
    END IF;
    v_streak := v_streak + 1;
  END LOOP;

  -- Update participant stats
  UPDATE challenge_participants
  SET
    completed_days = v_completed_days,
    current_streak = v_streak
  WHERE challenge_id = NEW.challenge_id
  AND user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_challenge_stats
  AFTER INSERT ON challenge_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_stats();


-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Get user's active routine limit based on subscription
CREATE OR REPLACE FUNCTION get_routine_limit(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_plan TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT subscription_plan, subscription_expires_at
  INTO v_plan, v_expires_at
  FROM profiles
  WHERE id = p_user_id;

  -- Pro users: unlimited (return 999)
  IF v_plan = 'pro' AND v_expires_at > NOW() THEN
    RETURN 999;
  END IF;

  -- Free users: 5 routines
  RETURN 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_routine_limit IS 'Returns routine limit: 5 for free, 999 for pro';


-- Check if user can create more routines
CREATE OR REPLACE FUNCTION can_create_routine(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_count INT;
  v_limit INT;
BEGIN
  -- Get current active routine count
  SELECT COUNT(*)
  INTO v_current_count
  FROM routines
  WHERE user_id = p_user_id AND status = 'active';

  -- Get limit
  v_limit := get_routine_limit(p_user_id);

  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_create_routine IS 'Check if user can create more routines (5 free, unlimited pro)';


-- Generate random invite code (6 uppercase alphanumeric characters)
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character code
    v_code := upper(substring(md5(random()::TEXT) from 1 for 6));

    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM group_invites
      WHERE invite_code = v_code
      AND expires_at > NOW()
    ) INTO v_exists;

    -- Exit if unique
    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_invite_code IS 'Generates unique 6-character invite code for groups';


-- ============================================================================
-- COMPLETION
-- ============================================================================

-- Insert function migration version
INSERT INTO schema_version (version, description) VALUES
  ('20260114000003', 'Database functions and triggers for streaks, stats, and automation');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully created database functions and triggers';
  RAISE NOTICE '✓ Streak calculation: calculate_streak()';
  RAISE NOTICE '✓ Auto-update triggers: routine streaks, profile stats';
  RAISE NOTICE '✓ AI rate limiting: check_ai_limit(), increment_ai_usage()';
  RAISE NOTICE '✓ Utility functions: can_create_routine(), generate_invite_code()';
  RAISE NOTICE 'Next steps: Seed initial data (migration 20260114000004)';
END $$;
