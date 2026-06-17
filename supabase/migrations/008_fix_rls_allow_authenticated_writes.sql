-- ============================================
-- Smart Ride - Fix RLS for server-side state machine writes
-- ============================================
-- Problem: The EnhancedTaskStateMachine runs server-side after the route
-- has called setRLSContext({ userId, role: 'CLIENT' }). That sets
-- app.is_service_role = 'false' for non-admin users, which causes the
-- "service_role_all_access" policy to reject INSERTs into
-- TaskStateTransition / AuditLog / Notification / DispatchMatch.
--
-- Fix: Add a SECOND policy that allows INSERT/UPDATE/DELETE when the
-- request is authenticated (app.current_user_id is set) — these tables
-- are only ever written by trusted server-side services on behalf of a
-- user, never directly by the client.
-- ============================================

-- TaskStateTransition: allow authenticated server-side writes.
DROP POLICY IF EXISTS "authenticated_server_write" ON "TaskStateTransition";
CREATE POLICY "authenticated_server_write" ON "TaskStateTransition"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.current_user_id', true) IS NOT NULL
         AND current_setting('app.current_user_id', true) <> '')
  WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL
              AND current_setting('app.current_user_id', true) <> '');

-- AuditLog: allow authenticated server-side writes.
DROP POLICY IF EXISTS "authenticated_server_write" ON "AuditLog";
CREATE POLICY "authenticated_server_write" ON "AuditLog"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.current_user_id', true) IS NOT NULL
         AND current_setting('app.current_user_id', true) <> '')
  WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL
              AND current_setting('app.current_user_id', true) <> '');

-- Notification: allow authenticated server-side writes.
DROP POLICY IF EXISTS "authenticated_server_write" ON "Notification";
CREATE POLICY "authenticated_server_write" ON "Notification"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.current_user_id', true) IS NOT NULL
         AND current_setting('app.current_user_id', true) <> '')
  WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL
              AND current_setting('app.current_user_id', true) <> '');

-- DispatchMatch: allow authenticated server-side writes.
DROP POLICY IF EXISTS "authenticated_server_write" ON "DispatchMatch";
CREATE POLICY "authenticated_server_write" ON "DispatchMatch"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.current_user_id', true) IS NOT NULL
         AND current_setting('app.current_user_id', true) <> '')
  WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL
              AND current_setting('app.current_user_id', true) <> '');

-- Verify policies.
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('TaskStateTransition', 'AuditLog', 'Notification', 'DispatchMatch')
ORDER BY tablename, policyname;
