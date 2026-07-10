-- ============================================
-- Smart Ride - RLS for SOSLocationUpdate (new table)
-- ============================================
-- The SOSLocationUpdate table stores the live location trail streamed by
-- the SOS reporter's device while an alert is active (~every 10 seconds
-- via POST /api/sos-live-location).
--
-- Run AFTER the table has been created (bun run db:push:prod).
--
-- Policies:
--   1. service_role_access — full access for admins/system
--      (app.is_service_role = 'true')
--   2. users_read_own_sos_locations — the alert owner can read their
--      own alert's location trail
--   3. users_insert_own_sos_locations — the alert owner can append
--      location updates to their own alert
-- ============================================

ALTER TABLE "SOSLocationUpdate" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_access" ON "SOSLocationUpdate";
CREATE POLICY "service_role_access" ON "SOSLocationUpdate"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

DROP POLICY IF EXISTS "users_read_own_sos_locations" ON "SOSLocationUpdate";
CREATE POLICY "users_read_own_sos_locations" ON "SOSLocationUpdate"
  FOR SELECT
  TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM "SOSAlert" a
      WHERE a.id = "SOSLocationUpdate"."sosAlertId"
        AND a."userId" = current_setting('app.current_user_id', true)::text
    )
  );

DROP POLICY IF EXISTS "users_insert_own_sos_locations" ON "SOSLocationUpdate";
CREATE POLICY "users_insert_own_sos_locations" ON "SOSLocationUpdate"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "SOSAlert" a
      WHERE a.id = "SOSLocationUpdate"."sosAlertId"
        AND a."userId" = current_setting('app.current_user_id', true)::text
    )
  );

-- Verify
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'SOSLocationUpdate'
ORDER BY policyname;
