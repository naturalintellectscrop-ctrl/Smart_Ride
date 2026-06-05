-- ============================================
-- SMART RIDE - COMPLETE RLS SETUP (v3 - Fully Idempotent)
-- Copy this ENTIRE file and paste into Supabase SQL Editor
-- ============================================
--
-- WHAT THIS DOES:
-- 1. Enables RLS on ALL existing public tables (locks them down)
-- 2. Creates service_role_access policy on ALL tables (if not exists)
-- 3. Creates user-scoped policies on relevant tables (if not exists)
-- 4. Creates admin read policies (if not exists)
-- 5. Creates public read policies for browsing (if not exists)
-- 6. Creates the smart_ride_api role with GRANTs
--
-- IDEMPOTENT: Safe to run unlimited times. Every operation checks
-- existence before creating, so re-running is a no-op for anything
-- that already exists.
--
-- ROLLBACK: Run rls_cleanup.sql to remove everything
-- ============================================


-- ============================================
-- PART 1: ENABLE RLS ON ALL EXISTING TABLES
-- ============================================
-- Dynamically enables RLS on every table in public schema that
-- does not already have it enabled.

DO $$
DECLARE
  tbl RECORD;
  already_enabled BOOLEAN;
  count_updated INTEGER := 0;
  count_skipped INTEGER := 0;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    SELECT relrowsecurity INTO already_enabled
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = tbl.tablename;

    IF NOT already_enabled THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
      count_updated := count_updated + 1;
      RAISE NOTICE 'RLS enabled on %', tbl.tablename;
    ELSE
      count_skipped := count_skipped + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Part 1 complete - RLS enabled on % tables, % already had RLS', count_updated, count_skipped;
END
$$;


-- ============================================
-- PART 2: SERVICE ROLE POLICIES (ALL TABLES)
-- ============================================
-- Creates "service_role_access" policy on every table that exists
-- and does not already have this policy.
-- The API sets app.is_service_role = 'true' via Prisma middleware.

DO $$
DECLARE
  tbl RECORD;
  policy_exists BOOLEAN;
  count_created INTEGER := 0;
  count_skipped INTEGER := 0;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl.tablename AND policyname = 'service_role_access'
    ) INTO policy_exists;

    IF NOT policy_exists THEN
      EXECUTE format(
        'CREATE POLICY "service_role_access" ON %I FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')',
        tbl.tablename
      );
      count_created := count_created + 1;
      RAISE NOTICE 'Created service_role_access on %', tbl.tablename;
    ELSE
      count_skipped := count_skipped + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Part 2 complete - service_role_access: % created, % already existed', count_created, count_skipped;
END
$$;


-- ============================================
-- PART 3: USER-SCOPED POLICIES
-- ============================================
-- Users can only see/modify their own data.
-- Each policy checks for existence before creating.

DO $$
DECLARE
  policy_exists BOOLEAN;
  count_created INTEGER := 0;
  count_skipped INTEGER := 0;
BEGIN
  -- Helper function: create a user-scoped SELECT policy if table + policy don't exist
  -- User table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'User' AND policyname = 'users_read_own') THEN
      CREATE POLICY "users_read_own" ON "User" FOR SELECT USING ("id" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'User' AND policyname = 'users_update_own') THEN
      CREATE POLICY "users_update_own" ON "User" FOR UPDATE USING ("id" = current_setting('app.current_user_id')::text) WITH CHECK ("id" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Session
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Session') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Session' AND policyname = 'users_read_own_sessions') THEN
      CREATE POLICY "users_read_own_sessions" ON "Session" FOR SELECT USING ("userId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Session' AND policyname = 'users_delete_own_sessions') THEN
      CREATE POLICY "users_delete_own_sessions" ON "Session" FOR DELETE USING ("userId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Notification
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Notification') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Notification' AND policyname = 'users_read_own_notifications') THEN
      CREATE POLICY "users_read_own_notifications" ON "Notification" FOR SELECT USING ("userId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Notification' AND policyname = 'users_update_own_notifications') THEN
      CREATE POLICY "users_update_own_notifications" ON "Notification" FOR UPDATE USING ("userId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- NotificationPreference
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'NotificationPreference') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'NotificationPreference' AND policyname = 'users_read_own_notif_prefs') THEN
      CREATE POLICY "users_read_own_notif_prefs" ON "NotificationPreference" FOR SELECT USING ("userId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'NotificationPreference' AND policyname = 'users_update_own_notif_prefs') THEN
      CREATE POLICY "users_update_own_notif_prefs" ON "NotificationPreference" FOR UPDATE USING ("userId" = current_setting('app.current_user_id')::text) WITH CHECK ("userId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Task (user is client)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Task') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Task' AND policyname = 'users_read_own_tasks') THEN
      CREATE POLICY "users_read_own_tasks" ON "Task" FOR SELECT USING ("clientId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Order (user is client)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Order') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Order' AND policyname = 'users_read_own_orders') THEN
      CREATE POLICY "users_read_own_orders" ON "Order" FOR SELECT USING ("clientId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Payment (user is the payer)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Payment') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Payment' AND policyname = 'users_read_own_payments') THEN
      CREATE POLICY "users_read_own_payments" ON "Payment" FOR SELECT USING ("userId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Rating (user gave the rating)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Rating') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Rating' AND policyname = 'users_read_own_ratings') THEN
      CREATE POLICY "users_read_own_ratings" ON "Rating" FOR SELECT USING ("fromUserId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ConversationParticipant (user is participant)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ConversationParticipant') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ConversationParticipant' AND policyname = 'users_read_own_conversations') THEN
      CREATE POLICY "users_read_own_conversations" ON "ConversationParticipant" FOR SELECT USING ("userId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Wallet (owner is user)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Wallet') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Wallet' AND policyname = 'users_read_own_wallet') THEN
      CREATE POLICY "users_read_own_wallet" ON "Wallet" FOR SELECT USING ("ownerId" = current_setting('app.current_user_id')::text AND "ownerType" = 'USER');
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Cart (user's cart)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Cart') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Cart' AND policyname = 'users_read_own_cart') THEN
      CREATE POLICY "users_read_own_cart" ON "Cart" FOR SELECT USING ("userId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- HealthOrder (user is client)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'HealthOrder') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'HealthOrder' AND policyname = 'users_read_own_health_orders') THEN
      CREATE POLICY "users_read_own_health_orders" ON "HealthOrder" FOR SELECT USING ("clientId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Prescription (user is client)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Prescription') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Prescription' AND policyname = 'users_read_own_prescriptions') THEN
      CREATE POLICY "users_read_own_prescriptions" ON "Prescription" FOR SELECT USING ("clientId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Dispute (user is client)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Dispute') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Dispute' AND policyname = 'users_read_own_disputes') THEN
      CREATE POLICY "users_read_own_disputes" ON "Dispute" FOR SELECT USING ("clientId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- NotificationLog
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'NotificationLog') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'NotificationLog' AND policyname = 'users_read_own_notif_logs') THEN
      CREATE POLICY "users_read_own_notif_logs" ON "NotificationLog" FOR SELECT USING ("userId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- OfflineAction
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'OfflineAction') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'OfflineAction' AND policyname = 'users_read_own_offline_actions') THEN
      CREATE POLICY "users_read_own_offline_actions" ON "OfflineAction" FOR SELECT USING ("userId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- SOSAlert (user is reporter)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'SOSAlert') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'SOSAlert' AND policyname = 'users_read_own_sos_alerts') THEN
      CREATE POLICY "users_read_own_sos_alerts" ON "SOSAlert" FOR SELECT USING ("userId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Rider: riders can read/update their own profile
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Rider') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Rider' AND policyname = 'riders_read_own') THEN
      CREATE POLICY "riders_read_own" ON "Rider" FOR SELECT USING ("userId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Rider' AND policyname = 'riders_update_own') THEN
      CREATE POLICY "riders_update_own" ON "Rider" FOR UPDATE USING ("userId" = current_setting('app.current_user_id')::text) WITH CHECK ("userId" = current_setting('app.current_user_id')::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  RAISE NOTICE 'Part 3 complete - user-scoped policies: % created, % already existed', count_created, count_skipped;
END
$$;


-- ============================================
-- PART 4: ADMIN READ POLICIES
-- ============================================
-- Admins (SUPER_ADMIN, ADMIN) can read all data.
-- Uses app.current_user_role session variable.

DO $$
DECLARE
  count_created INTEGER := 0;
  count_skipped INTEGER := 0;
BEGIN
  -- User
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'User' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "User" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Rider
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Rider') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Rider' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "Rider" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Task
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Task') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Task' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "Task" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Order
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Order') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Order' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "Order" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Payment
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Payment') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Payment' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "Payment" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Merchant
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Merchant') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Merchant' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "Merchant" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Dispute
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Dispute') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Dispute' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "Dispute" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- SOSAlert
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'SOSAlert') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'SOSAlert' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "SOSAlert" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- FraudAlert
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'FraudAlert') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'FraudAlert' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "FraudAlert" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- AuditLog
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'AuditLog') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'AuditLog' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "AuditLog" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- HealthOrder
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'HealthOrder') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'HealthOrder' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "HealthOrder" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Transaction
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Transaction') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Transaction' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "Transaction" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Wallet
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Wallet') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Wallet' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "Wallet" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Settlement
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Settlement') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Settlement' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "Settlement" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- HealthProvider
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'HealthProvider') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'HealthProvider' AND policyname = 'admin_read') THEN
      CREATE POLICY "admin_read" ON "HealthProvider" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('SUPER_ADMIN', 'ADMIN'));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  RAISE NOTICE 'Part 4 complete - admin_read policies: % created, % already existed', count_created, count_skipped;
END
$$;


-- ============================================
-- PART 5: PUBLIC READ POLICIES
-- ============================================
-- Certain data should be publicly readable (no auth required)
-- for browsing/discovery purposes.

DO $$
DECLARE
  count_created INTEGER := 0;
  count_skipped INTEGER := 0;
BEGIN
  -- HealthProvider: only APPROVED providers are publicly visible
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'HealthProvider') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'HealthProvider' AND policyname = 'public_read_verified') THEN
      CREATE POLICY "public_read_verified" ON "HealthProvider" FOR SELECT USING ("verificationStatus" = 'APPROVED');
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Merchant: only approved/open merchants are publicly visible
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Merchant') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Merchant' AND policyname = 'public_read_approved') THEN
      CREATE POLICY "public_read_approved" ON "Merchant" FOR SELECT USING ("status" = 'APPROVED');
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- MenuItem: publicly readable (so users can browse menus)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'MenuItem') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'MenuItem' AND policyname = 'public_read') THEN
      CREATE POLICY "public_read" ON "MenuItem" FOR SELECT USING (true);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- MedicineCatalog: publicly readable (so users can browse medicines)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'MedicineCatalog') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'MedicineCatalog' AND policyname = 'public_read') THEN
      CREATE POLICY "public_read" ON "MedicineCatalog" FOR SELECT USING (true);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ProductVariant: publicly readable
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ProductVariant') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ProductVariant' AND policyname = 'public_read') THEN
      CREATE POLICY "public_read" ON "ProductVariant" FOR SELECT USING (true);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- PricingConfig: publicly readable (so users can see pricing)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'PricingConfig') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'PricingConfig' AND policyname = 'public_read') THEN
      CREATE POLICY "public_read" ON "PricingConfig" FOR SELECT USING (true);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- Pharmacy: publicly readable (so users can find pharmacies)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Pharmacy') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Pharmacy' AND policyname = 'public_read') THEN
      CREATE POLICY "public_read" ON "Pharmacy" FOR SELECT USING (true);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  RAISE NOTICE 'Part 5 complete - public_read policies: % created, % already existed', count_created, count_skipped;
END
$$;


-- ============================================
-- PART 6: CREATE smart_ride_api ROLE AND GRANT PERMISSIONS
-- ============================================
-- This role will be used by the API server (without BYPASSRLS,
-- so RLS policies actually enforce).
-- If the role already exists, skip creation.

DO $$
BEGIN
  -- Create role if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'smart_ride_api') THEN
    CREATE ROLE smart_ride_api WITH LOGIN PASSWORD 'smart_ride_secure_2024';
    RAISE NOTICE 'Created smart_ride_api role';
  ELSE
    RAISE NOTICE 'smart_ride_api role already exists, skipping creation';
  END IF;

  -- Grant USAGE on all enum types in public schema
  EXECUTE (
    SELECT string_agg(
      format('GRANT USAGE ON TYPE %I.%I TO smart_ride_api', n.nspname, t.typname),
      '; '
    )
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
  );

  -- Grant ALL on all existing tables
  EXECUTE (
    SELECT string_agg(
      format('GRANT ALL ON TABLE %I.%I TO smart_ride_api', schemaname, tablename),
      '; '
    )
    FROM pg_tables WHERE schemaname = 'public'
  );

  -- Grant USAGE on all sequences (in case any exist)
  EXECUTE (
    SELECT string_agg(
      format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO smart_ride_api', n.nspname),
      '; '
    )
    FROM pg_namespace n WHERE n.nspname = 'public'
    LIMIT 1
  );

  -- Set default privileges so future tables also get grants
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO smart_ride_api;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON TYPES TO smart_ride_api;

  RAISE NOTICE 'Part 6 complete - smart_ride_api role configured with GRANTs';
END
$$;


-- ============================================
-- DONE!
-- ============================================
-- All tables now have:
--   - RLS enabled (locked down by default)
--   - service_role_access policy (API can do everything when is_service_role=true)
--   - User-scoped policies (users see their own data)
--   - Admin read policies (admins can read all data)
--   - Public read policies (browsing data visible to everyone)
--   - smart_ride_api role with full table access
--
-- To verify, run in SQL Editor:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--   SELECT * FROM pg_policies WHERE schemaname = 'public';
-- ============================================
