-- ============================================
-- Smart Ride - Enable RLS on Receipt + ReceiptSequence
-- ============================================
-- Problem: Supabase security advisor flagged "Table publicly accessible"
-- (rls_disabled_in_public). Receipt and ReceiptSequence were created via
-- `prisma db push` AFTER migrations 001/002 ran, so RLS was never enabled
-- on them — anyone with the project URL + anon key could read/write all
-- receipt data through Supabase's auto-generated REST API.
--
-- Policies (matching the 008/009 pattern):
--   1. service_role_access — full access when app.is_service_role = 'true'
--      (admins and system/webhook calls)
--   2. users_read_own_receipts — the receipt's owner (the client) can
--      read their own receipts (Receipt only)
--   3. authenticated_server_write — writes allowed when app.current_user_id
--      is set. Needed because receipts are issued server-side during task
--      completion, which is typically performed by the RIDER while the
--      receipt's userId is the CLIENT (ensureReceiptForTask), and the
--      numbering sequence is read+incremented in the same context.
--
-- Anonymous PostgREST requests never have app.* settings, so every
-- policy evaluates false for them → no access.
--
-- NOTE on spatial_ref_sys: the advisor also flags this PostGIS extension
-- table. It is owned by the postgis extension (not alterable by the
-- postgres role on Supabase) and contains only public spatial reference
-- data. This is a documented lint exception and safe to ignore; the DO
-- block below enables RLS on it only if we happen to have the privilege.
-- ============================================

-- ============================================
-- Receipt
-- ============================================
ALTER TABLE "Receipt" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_access" ON "Receipt";
CREATE POLICY "service_role_access" ON "Receipt"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

DROP POLICY IF EXISTS "users_read_own_receipts" ON "Receipt";
CREATE POLICY "users_read_own_receipts" ON "Receipt"
  FOR SELECT
  TO PUBLIC
  USING ("userId" = current_setting('app.current_user_id', true)::text);

DROP POLICY IF EXISTS "authenticated_server_write" ON "Receipt";
CREATE POLICY "authenticated_server_write" ON "Receipt"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.current_user_id', true) IS NOT NULL
         AND current_setting('app.current_user_id', true) <> '')
  WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL
              AND current_setting('app.current_user_id', true) <> '');

-- ============================================
-- ReceiptSequence (internal numbering — no direct user reads)
-- ============================================
ALTER TABLE "ReceiptSequence" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_access" ON "ReceiptSequence";
CREATE POLICY "service_role_access" ON "ReceiptSequence"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

DROP POLICY IF EXISTS "authenticated_server_write" ON "ReceiptSequence";
CREATE POLICY "authenticated_server_write" ON "ReceiptSequence"
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.current_user_id', true) IS NOT NULL
         AND current_setting('app.current_user_id', true) <> '')
  WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL
              AND current_setting('app.current_user_id', true) <> '');

-- ============================================
-- spatial_ref_sys (best effort — owned by the postgis extension)
-- ============================================
DO $$
BEGIN
  ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'RLS enabled on spatial_ref_sys';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Cannot enable RLS on spatial_ref_sys (owned by postgis extension) — documented Supabase lint exception, safe to ignore';
END $$;

-- Verify
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false
ORDER BY tablename;
