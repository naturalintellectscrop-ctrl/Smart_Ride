-- ============================================
-- Smart Ride - Fix RLS for TaskStateTransition
-- ============================================
-- Problem: TaskStateTransition only had a USING clause (no WITH CHECK),
-- which means INSERTs were being rejected by RLS even when the service
-- role context was set. The state machine runs inside db.$transaction()
-- which may use a fresh connection where the app.is_service_role setting
-- is not yet propagated.
--
-- Fix: Add explicit INSERT + WITH CHECK policies so the service role
-- can write state transitions reliably.
-- ============================================

-- Drop the old broad policy (we'll recreate it with explicit WITH CHECK).
DROP POLICY IF EXISTS "service_role_access" ON "TaskStateTransition";

-- Allow the service role full access (read + write) WITH CHECK on writes.
CREATE POLICY "service_role_all_access" ON "TaskStateTransition"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- Same fix for AuditLog (also written by the state machine in the same tx).
DROP POLICY IF EXISTS "service_role_access" ON "AuditLog";
CREATE POLICY "service_role_all_access" ON "AuditLog"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- Same fix for Notification (written by dispatch service).
DROP POLICY IF EXISTS "service_role_access" ON "Notification";
CREATE POLICY "service_role_all_access" ON "Notification"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- Same fix for DispatchMatch (written by dispatch service).
DROP POLICY IF EXISTS "service_role_access" ON "DispatchMatch";
DROP POLICY IF EXISTS "service_role_all_access" ON "DispatchMatch";
CREATE POLICY "service_role_all_access" ON "DispatchMatch"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- Verify policies.
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('TaskStateTransition', 'AuditLog', 'Notification', 'DispatchMatch')
ORDER BY tablename, policyname;
