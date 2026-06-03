-- ============================================
-- SMART RIDE - COMPLETE RLS SETUP (Safe Version)
-- Copy this ENTIRE file and paste into Supabase SQL Editor
-- ============================================
--
-- This version checks if each table exists before
-- applying RLS, so it works even with missing tables.
--
-- WHAT THIS DOES:
-- 1. Enables RLS on all tables that exist (locks them down)
-- 2. Creates policies so the API server can still access all tables
-- 3. Creates user-scoped policies (defense in depth)
-- 4. Creates admin read policies for dashboard
-- 5. Creates public read policies for browsing
-- 6. Creates the smart_ride_api role
--
-- ROLLBACK: Run rls_cleanup.sql to remove everything
-- ============================================

-- ============================================
-- PART 1: ENABLE RLS ON ALL EXISTING TABLES
-- ============================================
-- Each ALTER TABLE is wrapped in a DO block that checks existence

DO $$
BEGIN
  -- Core Auth tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
    ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on User';
  ELSE RAISE NOTICE 'SKIPPED User (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Session') THEN
    ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Session';
  ELSE RAISE NOTICE 'SKIPPED Session (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'OTP') THEN
    ALTER TABLE "OTP" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on OTP';
  ELSE RAISE NOTICE 'SKIPPED OTP (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PasswordResetToken') THEN
    ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on PasswordResetToken';
  ELSE RAISE NOTICE 'SKIPPED PasswordResetToken (does not exist)'; END IF;

  -- Rider/Vehicle tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Rider') THEN
    ALTER TABLE "Rider" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Rider';
  ELSE RAISE NOTICE 'SKIPPED Rider (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Vehicle') THEN
    ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Vehicle';
  ELSE RAISE NOTICE 'SKIPPED Vehicle (does not exist)'; END IF;

  -- Merchant/Food tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Merchant') THEN
    ALTER TABLE "Merchant" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Merchant';
  ELSE RAISE NOTICE 'SKIPPED Merchant (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MenuItem') THEN
    ALTER TABLE "MenuItem" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on MenuItem';
  ELSE RAISE NOTICE 'SKIPPED MenuItem (does not exist)'; END IF;

  -- Order tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Order') THEN
    ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Order';
  ELSE RAISE NOTICE 'SKIPPED Order (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'OrderItem') THEN
    ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on OrderItem';
  ELSE RAISE NOTICE 'SKIPPED OrderItem (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'KOT') THEN
    ALTER TABLE "KOT" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on KOT';
  ELSE RAISE NOTICE 'SKIPPED KOT (does not exist)'; END IF;

  -- Task/Dispatch tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Task') THEN
    ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Task';
  ELSE RAISE NOTICE 'SKIPPED Task (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'TaskStateTransition') THEN
    ALTER TABLE "TaskStateTransition" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on TaskStateTransition';
  ELSE RAISE NOTICE 'SKIPPED TaskStateTransition (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'DispatchMatch') THEN
    ALTER TABLE "DispatchMatch" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on DispatchMatch';
  ELSE RAISE NOTICE 'SKIPPED DispatchMatch (does not exist)'; END IF;

  -- Payment/Finance tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
    ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Payment';
  ELSE RAISE NOTICE 'SKIPPED Payment (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PaymentStateTransition') THEN
    ALTER TABLE "PaymentStateTransition" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on PaymentStateTransition';
  ELSE RAISE NOTICE 'SKIPPED PaymentStateTransition (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RiderPayout') THEN
    ALTER TABLE "RiderPayout" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on RiderPayout';
  ELSE RAISE NOTICE 'SKIPPED RiderPayout (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CashCollection') THEN
    ALTER TABLE "CashCollection" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on CashCollection';
  ELSE RAISE NOTICE 'SKIPPED CashCollection (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'FinanceLog') THEN
    ALTER TABLE "FinanceLog" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on FinanceLog';
  ELSE RAISE NOTICE 'SKIPPED FinanceLog (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Transaction') THEN
    ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Transaction';
  ELSE RAISE NOTICE 'SKIPPED Transaction (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Settlement') THEN
    ALTER TABLE "Settlement" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Settlement';
  ELSE RAISE NOTICE 'SKIPPED Settlement (does not exist)'; END IF;

  -- Rating table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Rating') THEN
    ALTER TABLE "Rating" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Rating';
  ELSE RAISE NOTICE 'SKIPPED Rating (does not exist)'; END IF;

  -- Audit/Logging tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'AuditLog') THEN
    ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on AuditLog';
  ELSE RAISE NOTICE 'SKIPPED AuditLog (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'NotificationLog') THEN
    ALTER TABLE "NotificationLog" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on NotificationLog';
  ELSE RAISE NOTICE 'SKIPPED NotificationLog (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'DocumentExpiry') THEN
    ALTER TABLE "DocumentExpiry" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on DocumentExpiry';
  ELSE RAISE NOTICE 'SKIPPED DocumentExpiry (does not exist)'; END IF;

  -- Notification tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Notification') THEN
    ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Notification';
  ELSE RAISE NOTICE 'SKIPPED Notification (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'NotificationPreference') THEN
    ALTER TABLE "NotificationPreference" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on NotificationPreference';
  ELSE RAISE NOTICE 'SKIPPED NotificationPreference (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'NotificationBroadcast') THEN
    ALTER TABLE "NotificationBroadcast" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on NotificationBroadcast';
  ELSE RAISE NOTICE 'SKIPPED NotificationBroadcast (does not exist)'; END IF;

  -- SOS table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SOSAlert') THEN
    ALTER TABLE "SOSAlert" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on SOSAlert';
  ELSE RAISE NOTICE 'SKIPPED SOSAlert (does not exist)'; END IF;

  -- Config tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SystemConfig') THEN
    ALTER TABLE "SystemConfig" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on SystemConfig';
  ELSE RAISE NOTICE 'SKIPPED SystemConfig (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SLAConfig') THEN
    ALTER TABLE "SLAConfig" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on SLAConfig';
  ELSE RAISE NOTICE 'SKIPPED SLAConfig (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PricingConfig') THEN
    ALTER TABLE "PricingConfig" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on PricingConfig';
  ELSE RAISE NOTICE 'SKIPPED PricingConfig (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'AdminPermission') THEN
    ALTER TABLE "AdminPermission" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on AdminPermission';
  ELSE RAISE NOTICE 'SKIPPED AdminPermission (does not exist)'; END IF;

  -- Heartbeat/Connection tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HeartbeatLog') THEN
    ALTER TABLE "HeartbeatLog" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on HeartbeatLog';
  ELSE RAISE NOTICE 'SKIPPED HeartbeatLog (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ConnectionAlert') THEN
    ALTER TABLE "ConnectionAlert" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on ConnectionAlert';
  ELSE RAISE NOTICE 'SKIPPED ConnectionAlert (does not exist)'; END IF;

  -- Health/Pharmacy tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthOrder') THEN
    ALTER TABLE "HealthOrder" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on HealthOrder';
  ELSE RAISE NOTICE 'SKIPPED HealthOrder (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthOrderItem') THEN
    ALTER TABLE "HealthOrderItem" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on HealthOrderItem';
  ELSE RAISE NOTICE 'SKIPPED HealthOrderItem (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Prescription') THEN
    ALTER TABLE "Prescription" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Prescription';
  ELSE RAISE NOTICE 'SKIPPED Prescription (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthProvider') THEN
    ALTER TABLE "HealthProvider" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on HealthProvider';
  ELSE RAISE NOTICE 'SKIPPED HealthProvider (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ProviderDocument') THEN
    ALTER TABLE "ProviderDocument" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on ProviderDocument';
  ELSE RAISE NOTICE 'SKIPPED ProviderDocument (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ProviderOrder') THEN
    ALTER TABLE "ProviderOrder" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on ProviderOrder';
  ELSE RAISE NOTICE 'SKIPPED ProviderOrder (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Pharmacy') THEN
    ALTER TABLE "Pharmacy" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Pharmacy';
  ELSE RAISE NOTICE 'SKIPPED Pharmacy (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MedicineCatalog') THEN
    ALTER TABLE "MedicineCatalog" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on MedicineCatalog';
  ELSE RAISE NOTICE 'SKIPPED MedicineCatalog (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PharmacyOrderTicket') THEN
    ALTER TABLE "PharmacyOrderTicket" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on PharmacyOrderTicket';
  ELSE RAISE NOTICE 'SKIPPED PharmacyOrderTicket (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PrescriptionAccessLog') THEN
    ALTER TABLE "PrescriptionAccessLog" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on PrescriptionAccessLog';
  ELSE RAISE NOTICE 'SKIPPED PrescriptionAccessLog (does not exist)'; END IF;

  -- Fraud/Security tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'FraudAlert') THEN
    ALTER TABLE "FraudAlert" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on FraudAlert';
  ELSE RAISE NOTICE 'SKIPPED FraudAlert (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ApiRateLimit') THEN
    ALTER TABLE "ApiRateLimit" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on ApiRateLimit';
  ELSE RAISE NOTICE 'SKIPPED ApiRateLimit (does not exist)'; END IF;

  -- Messaging tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Conversation') THEN
    ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Conversation';
  ELSE RAISE NOTICE 'SKIPPED Conversation (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ConversationParticipant') THEN
    ALTER TABLE "ConversationParticipant" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on ConversationParticipant';
  ELSE RAISE NOTICE 'SKIPPED ConversationParticipant (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Message') THEN
    ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Message';
  ELSE RAISE NOTICE 'SKIPPED Message (does not exist)'; END IF;

  -- Document tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Document') THEN
    ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Document';
  ELSE RAISE NOTICE 'SKIPPED Document (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MerchantDocument') THEN
    ALTER TABLE "MerchantDocument" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on MerchantDocument';
  ELSE RAISE NOTICE 'SKIPPED MerchantDocument (does not exist)'; END IF;

  -- Rider extension tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RiderCapability') THEN
    ALTER TABLE "RiderCapability" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on RiderCapability';
  ELSE RAISE NOTICE 'SKIPPED RiderCapability (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RiderMetrics') THEN
    ALTER TABLE "RiderMetrics" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on RiderMetrics';
  ELSE RAISE NOTICE 'SKIPPED RiderMetrics (does not exist)'; END IF;

  -- Dispute table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Dispute') THEN
    ALTER TABLE "Dispute" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Dispute';
  ELSE RAISE NOTICE 'SKIPPED Dispute (does not exist)'; END IF;

  -- Offline table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'OfflineAction') THEN
    ALTER TABLE "OfflineAction" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on OfflineAction';
  ELSE RAISE NOTICE 'SKIPPED OfflineAction (does not exist)'; END IF;

  -- Analytics tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'TaskAnalytics') THEN
    ALTER TABLE "TaskAnalytics" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on TaskAnalytics';
  ELSE RAISE NOTICE 'SKIPPED TaskAnalytics (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PlatformMetrics') THEN
    ALTER TABLE "PlatformMetrics" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on PlatformMetrics';
  ELSE RAISE NOTICE 'SKIPPED PlatformMetrics (does not exist)'; END IF;

  -- Wallet tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Wallet') THEN
    ALTER TABLE "Wallet" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Wallet';
  ELSE RAISE NOTICE 'SKIPPED Wallet (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'WalletTransaction') THEN
    ALTER TABLE "WalletTransaction" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on WalletTransaction';
  ELSE RAISE NOTICE 'SKIPPED WalletTransaction (does not exist)'; END IF;

  -- Cart tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Cart') THEN
    ALTER TABLE "Cart" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on Cart';
  ELSE RAISE NOTICE 'SKIPPED Cart (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CartItem') THEN
    ALTER TABLE "CartItem" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on CartItem';
  ELSE RAISE NOTICE 'SKIPPED CartItem (does not exist)'; END IF;

  -- Inventory tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ProductVariant') THEN
    ALTER TABLE "ProductVariant" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on ProductVariant';
  ELSE RAISE NOTICE 'SKIPPED ProductVariant (does not exist)'; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'InventoryReservation') THEN
    ALTER TABLE "InventoryReservation" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on InventoryReservation';
  ELSE RAISE NOTICE 'SKIPPED InventoryReservation (does not exist)'; END IF;

  RAISE NOTICE 'Part 1 complete - RLS enabled on all existing tables';
END
$$;


-- ============================================
-- PART 2: SERVICE ROLE POLICIES (ALL TABLES)
-- ============================================
-- Each CREATE POLICY is wrapped to check table existence first.
-- The API sets app.is_service_role = 'true' via Prisma middleware.

DO $$
BEGIN
  -- Core User tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "User" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Session') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Session" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'OTP') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "OTP" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PasswordResetToken') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "PasswordResetToken" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Rider') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Rider" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Order') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Order" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'OrderItem') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "OrderItem" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Task') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Task" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Payment" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Notification') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Notification" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'NotificationPreference') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "NotificationPreference" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Wallet') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Wallet" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'WalletTransaction') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "WalletTransaction" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Cart') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Cart" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CartItem') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "CartItem" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Rating') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Rating" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SOSAlert') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "SOSAlert" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Conversation') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Conversation" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ConversationParticipant') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "ConversationParticipant" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Message') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Message" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Prescription') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Prescription" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthOrder') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "HealthOrder" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthOrderItem') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "HealthOrderItem" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Dispute') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Dispute" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  -- Business/merchant tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Merchant') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Merchant" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MenuItem') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "MenuItem" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'KOT') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "KOT" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Pharmacy') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Pharmacy" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MedicineCatalog') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "MedicineCatalog" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PharmacyOrderTicket') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "PharmacyOrderTicket" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthProvider') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "HealthProvider" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ProviderDocument') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "ProviderDocument" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ProviderOrder') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "ProviderOrder" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ProductVariant') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "ProductVariant" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'InventoryReservation') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "InventoryReservation" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MerchantDocument') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "MerchantDocument" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  -- Rider/vehicle tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Vehicle') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Vehicle" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RiderPayout') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "RiderPayout" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CashCollection') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "CashCollection" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HeartbeatLog') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "HeartbeatLog" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ConnectionAlert') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "ConnectionAlert" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RiderCapability') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "RiderCapability" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RiderMetrics') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "RiderMetrics" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'DispatchMatch') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "DispatchMatch" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'TaskStateTransition') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "TaskStateTransition" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  -- Finance tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'FinanceLog') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "FinanceLog" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Transaction') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Transaction" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Settlement') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Settlement" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  -- Audit/logging tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'AuditLog') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "AuditLog" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PrescriptionAccessLog') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "PrescriptionAccessLog" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'FraudAlert') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "FraudAlert" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'NotificationLog') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "NotificationLog" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'NotificationBroadcast') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "NotificationBroadcast" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PaymentStateTransition') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "PaymentStateTransition" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Document') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "Document" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'DocumentExpiry') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "DocumentExpiry" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'OfflineAction') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "OfflineAction" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  -- Config tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SystemConfig') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "SystemConfig" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SLAConfig') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "SLAConfig" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PricingConfig') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "PricingConfig" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'AdminPermission') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "AdminPermission" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'TaskAnalytics') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "TaskAnalytics" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PlatformMetrics') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "PlatformMetrics" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ApiRateLimit') THEN
    EXECUTE 'CREATE POLICY "service_role_access" ON "ApiRateLimit" FOR ALL USING (current_setting(''app.is_service_role'', true) = ''true'') WITH CHECK (current_setting(''app.is_service_role'', true) = ''true'')';
  END IF;

  RAISE NOTICE 'Part 2 complete - service_role_access policies created';
END
$$;


-- ============================================
-- PART 3: USER-SCOPED POLICIES (Defense in Depth)
-- ============================================
-- These policies let users access ONLY their own data.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
    EXECUTE 'CREATE POLICY "users_read_own" ON "User" FOR SELECT USING (id = current_setting(''app.current_user_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Session') THEN
    EXECUTE 'CREATE POLICY "users_read_own_sessions" ON "Session" FOR SELECT USING ("userId" = current_setting(''app.current_user_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Rider') THEN
    EXECUTE 'CREATE POLICY "riders_read_own" ON "Rider" FOR SELECT USING ("userId" = current_setting(''app.current_user_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Order') THEN
    EXECUTE 'CREATE POLICY "clients_read_own_orders" ON "Order" FOR SELECT USING ("clientId" = current_setting(''app.current_user_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Task') THEN
    EXECUTE 'CREATE POLICY "clients_read_own_tasks" ON "Task" FOR SELECT USING ("clientId" = current_setting(''app.current_user_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
    EXECUTE 'CREATE POLICY "users_read_own_payments" ON "Payment" FOR SELECT USING ("userId" = current_setting(''app.current_user_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Notification') THEN
    EXECUTE 'CREATE POLICY "users_read_own_notifications" ON "Notification" FOR SELECT USING ("userId" = current_setting(''app.current_user_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'NotificationPreference') THEN
    EXECUTE 'CREATE POLICY "users_read_own_notif_prefs" ON "NotificationPreference" FOR SELECT USING ("userId" = current_setting(''app.current_user_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Wallet') THEN
    EXECUTE 'CREATE POLICY "users_read_own_wallet" ON "Wallet" FOR SELECT USING ("ownerId" = current_setting(''app.current_user_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Cart') THEN
    EXECUTE 'CREATE POLICY "users_read_own_cart" ON "Cart" FOR SELECT USING ("userId" = current_setting(''app.current_user_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Rating') THEN
    EXECUTE 'CREATE POLICY "users_read_own_ratings" ON "Rating" FOR SELECT USING ("fromUserId" = current_setting(''app.current_user_id'', true) OR "toUserId" = current_setting(''app.current_user_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SOSAlert') THEN
    EXECUTE 'CREATE POLICY "users_read_own_sos" ON "SOSAlert" FOR SELECT USING ("userId" = current_setting(''app.current_user_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ConversationParticipant') THEN
    EXECUTE 'CREATE POLICY "users_read_own_conversations" ON "ConversationParticipant" FOR SELECT USING ("userId" = current_setting(''app.current_user_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Prescription') THEN
    EXECUTE 'CREATE POLICY "clients_read_own_prescriptions" ON "Prescription" FOR SELECT USING ("clientId" = current_setting(''app.current_user_id'', true))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthOrder') THEN
    EXECUTE 'CREATE POLICY "clients_read_own_health_orders" ON "HealthOrder" FOR SELECT USING ("clientId" = current_setting(''app.current_user_id'', true))';
  END IF;

  RAISE NOTICE 'Part 3 complete - user-scoped policies created';
END
$$;


-- ============================================
-- PART 4: ADMIN READ POLICIES
-- ============================================
-- Admin users can read all data for the dashboard.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
    EXECUTE 'CREATE POLICY "admin_read_users" ON "User" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''OPERATIONS_ADMIN'', ''COMPLIANCE_ADMIN'', ''FINANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Rider') THEN
    EXECUTE 'CREATE POLICY "admin_read_riders" ON "Rider" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''OPERATIONS_ADMIN'', ''COMPLIANCE_ADMIN'', ''FINANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Vehicle') THEN
    EXECUTE 'CREATE POLICY "admin_read_vehicles" ON "Vehicle" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''OPERATIONS_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Order') THEN
    EXECUTE 'CREATE POLICY "admin_read_orders" ON "Order" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''OPERATIONS_ADMIN'', ''FINANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Task') THEN
    EXECUTE 'CREATE POLICY "admin_read_tasks" ON "Task" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''OPERATIONS_ADMIN'', ''COMPLIANCE_ADMIN'', ''FINANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
    EXECUTE 'CREATE POLICY "admin_read_payments" ON "Payment" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''FINANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RiderPayout') THEN
    EXECUTE 'CREATE POLICY "admin_read_payouts" ON "RiderPayout" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''FINANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CashCollection') THEN
    EXECUTE 'CREATE POLICY "admin_read_cash" ON "CashCollection" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''FINANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'FinanceLog') THEN
    EXECUTE 'CREATE POLICY "admin_read_finance" ON "FinanceLog" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''FINANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'AuditLog') THEN
    EXECUTE 'CREATE POLICY "admin_read_audit" ON "AuditLog" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''COMPLIANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SOSAlert') THEN
    EXECUTE 'CREATE POLICY "admin_read_sos" ON "SOSAlert" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''OPERATIONS_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Merchant') THEN
    EXECUTE 'CREATE POLICY "admin_read_merchants" ON "Merchant" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''OPERATIONS_ADMIN'', ''COMPLIANCE_ADMIN'', ''FINANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Transaction') THEN
    EXECUTE 'CREATE POLICY "admin_read_transactions" ON "Transaction" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''FINANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Settlement') THEN
    EXECUTE 'CREATE POLICY "admin_read_settlements" ON "Settlement" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''FINANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Dispute') THEN
    EXECUTE 'CREATE POLICY "admin_read_disputes" ON "Dispute" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''OPERATIONS_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'FraudAlert') THEN
    EXECUTE 'CREATE POLICY "admin_read_fraud" ON "FraudAlert" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''COMPLIANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Prescription') THEN
    EXECUTE 'CREATE POLICY "admin_read_prescriptions" ON "Prescription" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''COMPLIANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthOrder') THEN
    EXECUTE 'CREATE POLICY "admin_read_health_orders" ON "HealthOrder" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''COMPLIANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthProvider') THEN
    EXECUTE 'CREATE POLICY "admin_read_health_providers" ON "HealthProvider" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''COMPLIANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ProviderDocument') THEN
    EXECUTE 'CREATE POLICY "admin_read_provider_docs" ON "ProviderDocument" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''COMPLIANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PrescriptionAccessLog') THEN
    EXECUTE 'CREATE POLICY "admin_read_prescription_logs" ON "PrescriptionAccessLog" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''COMPLIANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Wallet') THEN
    EXECUTE 'CREATE POLICY "admin_read_wallets" ON "Wallet" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''FINANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'WalletTransaction') THEN
    EXECUTE 'CREATE POLICY "admin_read_wallet_txns" ON "WalletTransaction" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''FINANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HeartbeatLog') THEN
    EXECUTE 'CREATE POLICY "admin_read_heartbeats" ON "HeartbeatLog" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''OPERATIONS_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RiderMetrics') THEN
    EXECUTE 'CREATE POLICY "admin_read_rider_metrics" ON "RiderMetrics" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''OPERATIONS_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'TaskAnalytics') THEN
    EXECUTE 'CREATE POLICY "admin_read_task_analytics" ON "TaskAnalytics" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''OPERATIONS_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PlatformMetrics') THEN
    EXECUTE 'CREATE POLICY "admin_read_platform_metrics" ON "PlatformMetrics" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''OPERATIONS_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SystemConfig') THEN
    EXECUTE 'CREATE POLICY "admin_read_system_config" ON "SystemConfig" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SLAConfig') THEN
    EXECUTE 'CREATE POLICY "admin_read_sla_config" ON "SLAConfig" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''OPERATIONS_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PricingConfig') THEN
    EXECUTE 'CREATE POLICY "admin_read_pricing_config" ON "PricingConfig" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''OPERATIONS_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MerchantDocument') THEN
    EXECUTE 'CREATE POLICY "admin_read_merchant_docs" ON "MerchantDocument" FOR SELECT USING (current_setting(''app.current_user_role'', true) IN (''ADMIN'', ''SUPER_ADMIN'', ''COMPLIANCE_ADMIN''))';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'AdminPermission') THEN
    EXECUTE 'CREATE POLICY "admin_read_own_perms" ON "AdminPermission" FOR SELECT USING ("userId" = current_setting(''app.current_user_id'', true))';
  END IF;

  RAISE NOTICE 'Part 4 complete - admin read policies created';
END
$$;


-- ============================================
-- PART 5: PUBLIC READ POLICIES
-- ============================================
-- These allow unauthenticated browsing of public-facing data.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Merchant') THEN
    EXECUTE 'CREATE POLICY "public_read_active_merchants" ON "Merchant" FOR SELECT USING (status = ''APPROVED'' AND "isOpen" = true)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MenuItem') THEN
    EXECUTE 'CREATE POLICY "public_read_available_items" ON "MenuItem" FOR SELECT USING ("isAvailable" = true)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MedicineCatalog') THEN
    EXECUTE 'CREATE POLICY "public_read_available_medicine" ON "MedicineCatalog" FOR SELECT USING ("isAvailable" = true)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Pharmacy') THEN
    EXECUTE 'CREATE POLICY "public_read_approved_pharmacies" ON "Pharmacy" FOR SELECT USING (status = ''APPROVED'' AND "isOpen" = true)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthProvider') THEN
    EXECUTE 'CREATE POLICY "public_read_verified_providers" ON "HealthProvider" FOR SELECT USING ("verificationStatus" = ''VERIFIED'' AND "isOpenNow" = true)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'NotificationBroadcast') THEN
    EXECUTE 'CREATE POLICY "public_read_broadcasts" ON "NotificationBroadcast" FOR SELECT USING (status = ''SENT'')';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ProductVariant') THEN
    EXECUTE 'CREATE POLICY "public_read_variants" ON "ProductVariant" FOR SELECT USING (true)';
  END IF;

  RAISE NOTICE 'Part 5 complete - public read policies created';
END
$$;


-- ============================================
-- PART 6: CREATE API ROLE (for true RLS enforcement)
-- ============================================
-- The postgres superuser BYPASSES RLS. To make RLS actually work,
-- connect as smart_ride_api instead.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'smart_ride_api') THEN
    CREATE ROLE smart_ride_api LOGIN NOBYPASSRLS NOCREATEDB NOCREATEROLE NOSUPERUSER;
    RAISE NOTICE 'Created smart_ride_api role';
  ELSE
    RAISE NOTICE 'smart_ride_api role already exists';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO smart_ride_api;
GRANT ALL ON ALL TABLES IN SCHEMA public TO smart_ride_api;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO smart_ride_api;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO smart_ride_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO smart_ride_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO smart_ride_api;

-- ============================================
-- DONE! Verify with these queries:
-- ============================================
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- SELECT tablename, COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename ORDER BY policy_count DESC;
-- SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'smart_ride_api';
