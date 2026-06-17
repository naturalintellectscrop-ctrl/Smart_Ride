-- ============================================
-- Smart Ride - Fix RLS for Conversation, ConversationParticipant,
-- HeartbeatLog, ConnectionAlert, and Message tables
-- ============================================
-- Problem: These tables were missed by migrations 007/008 which fixed
-- RLS INSERT policies for TaskStateTransition/AuditLog/Notification/DispatchMatch.
--
-- Symptom:
--   POST /api/messages → 500 "new row violates row-level security
--   policy for table \"Conversation\"" at src/app/api/messages/route.ts:219
--   POST /api/rider/heartbeat → 500 (HeartbeatLog INSERT rejected)
--
-- Root cause: The messages route calls setRLSContext({ userId, role: 'CLIENT' })
-- which sets app.is_service_role = 'false' for non-admin users. The
-- "service_role_all_access" policy then rejects the INSERT because the
-- Conversation table has no policy allowing authenticated client-side writes.
--
-- Fix: Add TWO policies per table (matching the pattern from migration 008):
--   1. service_role_all_access — full access when app.is_service_role = 'true'
--      (admins and system/webhook calls)
--   2. authenticated_server_write — INSERT/UPDATE/DELETE allowed when
--      app.current_user_id is set (regular authenticated users, since
--      these tables are written by trusted server-side code on behalf
--      of the user, never directly by the client)
-- ============================================

-- ============================================
-- Conversation
-- ============================================
DROP POLICY IF EXISTS "service_role_all_access" ON "Conversation";
CREATE POLICY "service_role_all_access" ON "Conversation"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

DROP POLICY IF EXISTS "authenticated_server_write" ON "Conversation";
CREATE POLICY "authenticated_server_write" ON "Conversation"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.current_user_id', true) IS NOT NULL
         AND current_setting('app.current_user_id', true) <> '')
  WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL
              AND current_setting('app.current_user_id', true) <> '');

-- ============================================
-- ConversationParticipant
-- ============================================
DROP POLICY IF EXISTS "service_role_all_access" ON "ConversationParticipant";
CREATE POLICY "service_role_all_access" ON "ConversationParticipant"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

DROP POLICY IF EXISTS "authenticated_server_write" ON "ConversationParticipant";
CREATE POLICY "authenticated_server_write" ON "ConversationParticipant"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.current_user_id', true) IS NOT NULL
         AND current_setting('app.current_user_id', true) <> '')
  WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL
              AND current_setting('app.current_user_id', true) <> '');

-- ============================================
-- Message
-- ============================================
DROP POLICY IF EXISTS "service_role_all_access" ON "Message";
CREATE POLICY "service_role_all_access" ON "Message"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

DROP POLICY IF EXISTS "authenticated_server_write" ON "Message";
CREATE POLICY "authenticated_server_write" ON "Message"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.current_user_id', true) IS NOT NULL
         AND current_setting('app.current_user_id', true) <> '')
  WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL
              AND current_setting('app.current_user_id', true) <> '');

-- ============================================
-- HeartbeatLog
-- ============================================
DROP POLICY IF EXISTS "service_role_all_access" ON "HeartbeatLog";
CREATE POLICY "service_role_all_access" ON "HeartbeatLog"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

DROP POLICY IF EXISTS "authenticated_server_write" ON "HeartbeatLog";
CREATE POLICY "authenticated_server_write" ON "HeartbeatLog"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.current_user_id', true) IS NOT NULL
         AND current_setting('app.current_user_id', true) <> '')
  WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL
              AND current_setting('app.current_user_id', true) <> '');

-- ============================================
-- ConnectionAlert
-- ============================================
DROP POLICY IF EXISTS "service_role_all_access" ON "ConnectionAlert";
CREATE POLICY "service_role_all_access" ON "ConnectionAlert"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

DROP POLICY IF EXISTS "authenticated_server_write" ON "ConnectionAlert";
CREATE POLICY "authenticated_server_write" ON "ConnectionAlert"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.current_user_id', true) IS NOT NULL
         AND current_setting('app.current_user_id', true) <> '')
  WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL
              AND current_setting('app.current_user_id', true) <> '');

-- ============================================
-- Verify policies
-- ============================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('Conversation', 'ConversationParticipant', 'Message', 'HeartbeatLog', 'ConnectionAlert')
ORDER BY tablename, policyname;
