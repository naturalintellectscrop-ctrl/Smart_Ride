-- ============================================
-- SMART RIDE - RLS CLIENT WRITE POLICIES (v1)
-- ============================================
-- PROBLEM:
--   rls_complete.sql only defines SELECT policies for clients (e.g.
--   "users_read_own_tasks"). The service_role_access policy (FOR ALL)
--   requires app.is_service_role = 'true', but setRLSContext() for a
--   non-admin user sets app.is_service_role = 'false'. As a result,
--   every authenticated-client write (POST /api/tasks, POST /api/orders,
--   POST /api/prescriptions, POST /api/health-orders, etc.) fails with
--   PostgreSQL error 42501 "new row violates row-level security policy".
--
-- FIX:
--   Add INSERT (and where applicable UPDATE/DELETE) WITH CHECK policies
--   for clients on the tables they need to write to. The WITH CHECK
--   clause ensures the row's owner field matches
--   current_setting('app.current_user_id'). This preserves the existing
--   defense-in-depth model: even if the API layer has an IDOR bug, RLS
--   still prevents a client from inserting a row that claims to belong
--   to another user.
--
-- IDEMPOTENT: every CREATE POLICY checks for existence first.
-- ============================================

DO $$
DECLARE
  count_created INTEGER := 0;
  count_skipped INTEGER := 0;
BEGIN
  -- ===== Task =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='Task') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Task' AND policyname='users_insert_own_tasks') THEN
      CREATE POLICY "users_insert_own_tasks" ON "Task" FOR INSERT WITH CHECK ("clientId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Task' AND policyname='users_update_own_tasks') THEN
      CREATE POLICY "users_update_own_tasks" ON "Task" FOR UPDATE USING ("clientId" = current_setting('app.current_user_id', true)::text) WITH CHECK ("clientId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ===== Order =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='Order') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Order' AND policyname='users_insert_own_orders') THEN
      CREATE POLICY "users_insert_own_orders" ON "Order" FOR INSERT WITH CHECK ("clientId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Order' AND policyname='users_update_own_orders') THEN
      CREATE POLICY "users_update_own_orders" ON "Order" FOR UPDATE USING ("clientId" = current_setting('app.current_user_id', true)::text) WITH CHECK ("clientId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ===== OrderItem — allow insert if user owns parent Order =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='OrderItem') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='OrderItem' AND policyname='users_insert_own_order_items') THEN
      CREATE POLICY "users_insert_own_order_items" ON "OrderItem" FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM "Order" o WHERE o.id = "OrderItem"."orderId" AND o."clientId" = current_setting('app.current_user_id', true)::text));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ===== HealthOrder =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='HealthOrder') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='HealthOrder' AND policyname='users_insert_own_health_orders') THEN
      CREATE POLICY "users_insert_own_health_orders" ON "HealthOrder" FOR INSERT WITH CHECK ("clientId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='HealthOrder' AND policyname='users_update_own_health_orders') THEN
      CREATE POLICY "users_update_own_health_orders" ON "HealthOrder" FOR UPDATE USING ("clientId" = current_setting('app.current_user_id', true)::text) WITH CHECK ("clientId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ===== HealthOrderItem =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='HealthOrderItem') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='HealthOrderItem' AND policyname='users_insert_own_health_order_items') THEN
      CREATE POLICY "users_insert_own_health_order_items" ON "HealthOrderItem" FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM "HealthOrder" h WHERE h.id = "HealthOrderItem"."healthOrderId" AND h."clientId" = current_setting('app.current_user_id', true)::text));
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ===== Prescription =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='Prescription') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Prescription' AND policyname='users_insert_own_prescriptions') THEN
      CREATE POLICY "users_insert_own_prescriptions" ON "Prescription" FOR INSERT WITH CHECK ("clientId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Prescription' AND policyname='users_update_own_prescriptions') THEN
      CREATE POLICY "users_update_own_prescriptions" ON "Prescription" FOR UPDATE USING ("clientId" = current_setting('app.current_user_id', true)::text) WITH CHECK ("clientId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ===== Cart =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='Cart') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Cart' AND policyname='users_insert_own_cart') THEN
      CREATE POLICY "users_insert_own_cart" ON "Cart" FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Cart' AND policyname='users_update_own_cart') THEN
      CREATE POLICY "users_update_own_cart" ON "Cart" FOR UPDATE USING ("userId" = current_setting('app.current_user_id', true)::text) WITH CHECK ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Cart' AND policyname='users_delete_own_cart') THEN
      CREATE POLICY "users_delete_own_cart" ON "Cart" FOR DELETE USING ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ===== Rating =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='Rating') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Rating' AND policyname='users_insert_own_ratings') THEN
      CREATE POLICY "users_insert_own_ratings" ON "Rating" FOR INSERT WITH CHECK ("fromUserId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ===== NotificationLog =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='NotificationLog') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='NotificationLog' AND policyname='users_insert_own_notif_logs') THEN
      CREATE POLICY "users_insert_own_notif_logs" ON "NotificationLog" FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='NotificationLog' AND policyname='users_update_own_notif_logs') THEN
      CREATE POLICY "users_update_own_notif_logs" ON "NotificationLog" FOR UPDATE USING ("userId" = current_setting('app.current_user_id', true)::text) WITH CHECK ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ===== SOSAlert =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='SOSAlert') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='SOSAlert' AND policyname='users_insert_own_sos_alerts') THEN
      CREATE POLICY "users_insert_own_sos_alerts" ON "SOSAlert" FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='SOSAlert' AND policyname='users_update_own_sos_alerts') THEN
      CREATE POLICY "users_update_own_sos_alerts" ON "SOSAlert" FOR UPDATE USING ("userId" = current_setting('app.current_user_id', true)::text) WITH CHECK ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ===== EmergencyContact =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='EmergencyContact') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='EmergencyContact' AND policyname='users_insert_own_emergency_contacts') THEN
      CREATE POLICY "users_insert_own_emergency_contacts" ON "EmergencyContact" FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='EmergencyContact' AND policyname='users_update_own_emergency_contacts') THEN
      CREATE POLICY "users_update_own_emergency_contacts" ON "EmergencyContact" FOR UPDATE USING ("userId" = current_setting('app.current_user_id', true)::text) WITH CHECK ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='EmergencyContact' AND policyname='users_delete_own_emergency_contacts') THEN
      CREATE POLICY "users_delete_own_emergency_contacts" ON "EmergencyContact" FOR DELETE USING ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ===== SavedAddress =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='SavedAddress') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='SavedAddress' AND policyname='users_insert_own_addresses') THEN
      CREATE POLICY "users_insert_own_addresses" ON "SavedAddress" FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='SavedAddress' AND policyname='users_update_own_addresses') THEN
      CREATE POLICY "users_update_own_addresses" ON "SavedAddress" FOR UPDATE USING ("userId" = current_setting('app.current_user_id', true)::text) WITH CHECK ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='SavedAddress' AND policyname='users_delete_own_addresses') THEN
      CREATE POLICY "users_delete_own_addresses" ON "SavedAddress" FOR DELETE USING ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ===== OfflineAction =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='OfflineAction') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='OfflineAction' AND policyname='users_insert_own_offline_actions') THEN
      CREATE POLICY "users_insert_own_offline_actions" ON "OfflineAction" FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='OfflineAction' AND policyname='users_update_own_offline_actions') THEN
      CREATE POLICY "users_update_own_offline_actions" ON "OfflineAction" FOR UPDATE USING ("userId" = current_setting('app.current_user_id', true)::text) WITH CHECK ("userId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ===== Dispute =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='Dispute') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Dispute' AND policyname='users_insert_own_disputes') THEN
      CREATE POLICY "users_insert_own_disputes" ON "Dispute" FOR INSERT WITH CHECK ("clientId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  -- ===== Message (chat) =====
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='Message') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Message' AND policyname='users_insert_own_messages') THEN
      CREATE POLICY "users_insert_own_messages" ON "Message" FOR INSERT WITH CHECK ("senderId" = current_setting('app.current_user_id', true)::text);
      count_created := count_created + 1;
    ELSE count_skipped := count_skipped + 1; END IF;
  END IF;

  RAISE NOTICE 'RLS client write policies: % created, % already existed', count_created, count_skipped;
END $$;
