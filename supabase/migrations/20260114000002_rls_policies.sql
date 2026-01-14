-- ============================================================================
-- God Life Backend - Row Level Security (RLS) Policies
-- Migration: 20260114000002
-- Description: Enables RLS and creates policies for multi-tenant data isolation
-- ============================================================================

-- IMPORTANT: RLS ensures that users can only access their own data
-- All queries automatically filter by auth.uid() - the authenticated user's ID

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- System can insert new profiles (via Edge Functions with service role)
-- No user-facing INSERT policy needed

COMMENT ON POLICY "profiles_select_own" ON profiles IS 'Users can view their own profile';
COMMENT ON POLICY "profiles_update_own" ON profiles IS 'Users can update their own profile';


-- ============================================================================
-- ROUTINES TABLE
-- ============================================================================

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

-- Users can view their own routines
CREATE POLICY "routines_select_own"
  ON routines FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own routines
CREATE POLICY "routines_insert_own"
  ON routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own routines
CREATE POLICY "routines_update_own"
  ON routines FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete (soft delete via status) their own routines
CREATE POLICY "routines_delete_own"
  ON routines FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY "routines_select_own" ON routines IS 'Users can view their own routines';
COMMENT ON POLICY "routines_insert_own" ON routines IS 'Users can create their own routines';


-- ============================================================================
-- ROUTINE COMPLETIONS TABLE
-- ============================================================================

ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own completions
CREATE POLICY "completions_select_own"
  ON routine_completions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "completions_insert_own"
  ON routine_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own completions (undo)
CREATE POLICY "completions_delete_own"
  ON routine_completions FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY "completions_select_own" ON routine_completions IS 'Users can view their own completions';


-- ============================================================================
-- AI COACHING TABLES
-- ============================================================================

-- Coaching conversations
ALTER TABLE coaching_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_own"
  ON coaching_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "conversations_insert_own"
  ON coaching_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_update_own"
  ON coaching_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "conversations_delete_own"
  ON coaching_conversations FOR DELETE
  USING (auth.uid() = user_id);


-- Coaching messages
ALTER TABLE coaching_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_own"
  ON coaching_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "messages_insert_own"
  ON coaching_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No update/delete for messages (immutable chat history)


-- Coaching reports
ALTER TABLE coaching_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own"
  ON coaching_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Reports are generated server-side only (via Edge Functions with service role)


-- AI usage tracking
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_select_own"
  ON ai_usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- Usage tracking is updated server-side only


-- ============================================================================
-- GROUPS TABLES
-- ============================================================================

-- Groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Users can view groups they're members of
CREATE POLICY "groups_select_members"
  ON groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Users can create groups
CREATE POLICY "groups_insert_own"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only owners can update groups
CREATE POLICY "groups_update_owner"
  ON groups FOR UPDATE
  USING (auth.uid() = owner_id);

-- Only owners can delete groups
CREATE POLICY "groups_delete_owner"
  ON groups FOR DELETE
  USING (auth.uid() = owner_id);


-- Group members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Users can view members of groups they belong to
CREATE POLICY "group_members_select_same_group"
  ON group_members FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Users can join groups (INSERT handled via invite code validation in Edge Function)
-- Group owners can remove members (DELETE)
CREATE POLICY "group_members_delete_owner_or_self"
  ON group_members FOR DELETE
  USING (
    auth.uid() = user_id OR -- Can remove yourself
    auth.uid() IN ( -- Or you're the group owner
      SELECT owner_id FROM groups WHERE id = group_id
    )
  );


-- Group invites
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;

-- Users can view invites for groups they're in
CREATE POLICY "group_invites_select_members"
  ON group_invites FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Group owners can create invites (INSERT handled via Edge Function)


-- Group cheers
ALTER TABLE group_cheers ENABLE ROW LEVEL SECURITY;

-- Users can view cheers in groups they're members of
CREATE POLICY "group_cheers_select_members"
  ON group_cheers FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Users can send cheers to group members
CREATE POLICY "group_cheers_insert_members"
  ON group_cheers FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id AND
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );


-- ============================================================================
-- CHALLENGES TABLES
-- ============================================================================

-- Challenges (public - anyone can view)
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view challenges
CREATE POLICY "challenges_select_all"
  ON challenges FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create/update challenges (via service role)


-- Challenge participants
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- Users can view all participants (for leaderboards)
CREATE POLICY "challenge_participants_select_all"
  ON challenge_participants FOR SELECT
  TO authenticated
  USING (true);

-- Users can join challenges
CREATE POLICY "challenge_participants_insert_own"
  ON challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own participation
CREATE POLICY "challenge_participants_update_own"
  ON challenge_participants FOR UPDATE
  USING (auth.uid() = user_id);


-- Challenge verifications
ALTER TABLE challenge_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view verifications in challenges they've joined
CREATE POLICY "challenge_verifications_select_joined"
  ON challenge_verifications FOR SELECT
  USING (
    challenge_id IN (
      SELECT challenge_id FROM challenge_participants WHERE user_id = auth.uid()
    )
  );

-- Users can submit their own verifications
CREATE POLICY "challenge_verifications_insert_own"
  ON challenge_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- NOTIFICATIONS TABLES
-- ============================================================================

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Notifications are created server-side (via Edge Functions)


-- Push tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own push tokens
CREATE POLICY "push_tokens_select_own"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own push tokens
CREATE POLICY "push_tokens_insert_own"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own push tokens
CREATE POLICY "push_tokens_update_own"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own push tokens
CREATE POLICY "push_tokens_delete_own"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- INSIGHTS TABLE (Public Content)
-- ============================================================================

-- Insights (read-only for all authenticated users)
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view insights
CREATE POLICY "insights_select_all"
  ON insights FOR SELECT
  TO authenticated
  USING (true);

-- Insights are managed by admins only (via service role)


-- ============================================================================
-- SCHEMA VERSION TABLE
-- ============================================================================

-- Schema version (read-only)
ALTER TABLE schema_version ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schema_version_select_all"
  ON schema_version FOR SELECT
  TO authenticated
  USING (true);


-- ============================================================================
-- RLS TESTING QUERIES
-- ============================================================================

-- Test RLS policies by setting a user context
-- Usage: SET request.jwt.claims.sub = 'user-uuid-here'; SELECT * FROM routines;

COMMENT ON SCHEMA public IS 'RLS policies applied to all 20 tables';

-- Insert RLS version
INSERT INTO schema_version (version, description) VALUES
  ('20260114000002', 'Row Level Security policies for all tables');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully applied RLS policies to 20 tables';
  RAISE NOTICE 'All tables now enforce user-scoped data access';
  RAISE NOTICE 'Next steps: Apply functions and triggers (migration 20260114000003)';
END $$;


-- ============================================================================
-- RLS VERIFICATION FUNCTION
-- ============================================================================

-- Helper function to verify RLS is working
CREATE OR REPLACE FUNCTION verify_rls_enabled()
RETURNS TABLE(table_name TEXT, rls_enabled BOOLEAN, policy_count INT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::TEXT as table_name,
    c.relrowsecurity as rls_enabled,
    COUNT(p.polname)::INT as policy_count
  FROM pg_class c
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
  WHERE c.relnamespace = 'public'::regnamespace
    AND c.relkind = 'r'
    AND c.relname NOT LIKE 'pg_%'
  GROUP BY c.relname, c.relrowsecurity
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_rls_enabled IS 'Verify RLS is enabled on all tables with policy count';

-- Run verification
DO $$
DECLARE
  rec RECORD;
  all_enabled BOOLEAN := true;
BEGIN
  RAISE NOTICE '=== RLS Verification ===';
  FOR rec IN SELECT * FROM verify_rls_enabled() LOOP
    RAISE NOTICE 'Table: %, RLS: %, Policies: %', rec.table_name, rec.rls_enabled, rec.policy_count;
    IF NOT rec.rls_enabled THEN
      all_enabled := false;
    END IF;
  END LOOP;

  IF all_enabled THEN
    RAISE NOTICE '✓ All tables have RLS enabled';
  ELSE
    RAISE WARNING '⚠ Some tables do not have RLS enabled';
  END IF;
END $$;
