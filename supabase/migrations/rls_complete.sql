-- ============================================
-- SMART RIDE — COMPLETE RLS SETUP
-- Copy this ENTIRE file and paste into Supabase SQL Editor
-- ============================================
--
-- WHAT THIS DOES:
-- 1. Enables RLS on ALL 64 tables (locks them down)
-- 2. Creates policies so the API server can still access all tables
-- 3. Creates user-scoped policies (defense in depth)
-- 4. Creates admin read policies for dashboard
-- 5. Creates public read policies for browsing
--
-- IMPORTANT: Run this as a SINGLE query in Supabase SQL Editor.
-- If it fails, RLS may be partially enabled — see the rollback note below.
--
-- ROLLBACK (if something goes wrong):
--   ALTER TABLE "TableName" DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "policy_name" ON "TableName";
-- ============================================

-- ============================================
-- PART 1: ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OTP" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Merchant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenuItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KOT" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiderPayout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashCollection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinanceLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rating" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationBroadcast" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SOSAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SLAConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PricingConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HeartbeatLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConnectionAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HealthOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HealthOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prescription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HealthProvider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProviderDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProviderOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pharmacy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedicineCatalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PharmacyOrderTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrescriptionAccessLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FraudAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiRateLimit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiderCapability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaskStateTransition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DispatchMatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Settlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminPermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dispute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentExpiry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OfflineAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaskAnalytics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformMetrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalletTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CartItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryReservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiderMetrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MerchantDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentStateTransition" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: SERVICE ROLE POLICIES (ALL TABLES)
-- ============================================
-- These policies allow the API server to access all tables.
-- The API sets app.is_service_role = 'true' via Prisma middleware.
-- This is the PRIMARY access path — your API routes handle auth/authorization.

-- User-own tables
CREATE POLICY "service_role_access" ON "User" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Session" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Rider" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Order" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "OrderItem" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Task" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Payment" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Notification" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "NotificationPreference" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Wallet" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "WalletTransaction" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Cart" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "CartItem" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Rating" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "SOSAlert" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Conversation" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "ConversationParticipant" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Message" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Prescription" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "HealthOrder" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "HealthOrderItem" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Dispute" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- Sensitive/auth-only tables
CREATE POLICY "service_role_access" ON "OTP" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "PasswordResetToken" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "ApiRateLimit" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- Business/merchant tables
CREATE POLICY "service_role_access" ON "Merchant" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "MenuItem" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "KOT" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Pharmacy" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "MedicineCatalog" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "PharmacyOrderTicket" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "HealthProvider" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "ProviderDocument" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "ProviderOrder" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "ProductVariant" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "InventoryReservation" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "MerchantDocument" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- Rider/vehicle tables
CREATE POLICY "service_role_access" ON "Vehicle" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "RiderPayout" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "CashCollection" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "HeartbeatLog" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "ConnectionAlert" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "RiderCapability" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "RiderMetrics" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "DispatchMatch" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "TaskStateTransition" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- Finance tables
CREATE POLICY "service_role_access" ON "FinanceLog" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Transaction" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Settlement" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- Audit/logging tables
CREATE POLICY "service_role_access" ON "AuditLog" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "PrescriptionAccessLog" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "FraudAlert" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "NotificationLog" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "NotificationBroadcast" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "PaymentStateTransition" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "Document" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "DocumentExpiry" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "OfflineAction" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- Config tables
CREATE POLICY "service_role_access" ON "SystemConfig" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "SLAConfig" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "PricingConfig" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "AdminPermission" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "TaskAnalytics" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');
CREATE POLICY "service_role_access" ON "PlatformMetrics" FOR ALL USING (current_setting('app.is_service_role', true) = 'true') WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- PART 3: USER-SCOPED POLICIES (Defense in Depth)
-- ============================================
-- These policies let users access ONLY their own data.
-- They use app.current_user_id set by the Prisma middleware.

-- Users can read their own profile
CREATE POLICY "users_read_own" ON "User" FOR SELECT USING (id = current_setting('app.current_user_id', true));

-- Users can read their own sessions
CREATE POLICY "users_read_own_sessions" ON "Session" FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

-- Riders can read their own profile
CREATE POLICY "riders_read_own" ON "Rider" FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

-- Users can read their own orders
CREATE POLICY "clients_read_own_orders" ON "Order" FOR SELECT USING ("clientId" = current_setting('app.current_user_id', true));

-- Users can read their own tasks
CREATE POLICY "clients_read_own_tasks" ON "Task" FOR SELECT USING ("clientId" = current_setting('app.current_user_id', true));

-- Users can read their own payments
CREATE POLICY "users_read_own_payments" ON "Payment" FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

-- Users can read their own notifications
CREATE POLICY "users_read_own_notifications" ON "Notification" FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

-- Users can read their own notification preferences
CREATE POLICY "users_read_own_notif_prefs" ON "NotificationPreference" FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

-- Users can read their own wallet
CREATE POLICY "users_read_own_wallet" ON "Wallet" FOR SELECT USING ("ownerId" = current_setting('app.current_user_id', true));

-- Users can read their own cart
CREATE POLICY "users_read_own_cart" ON "Cart" FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

-- Users can read their own ratings (given or received)
CREATE POLICY "users_read_own_ratings" ON "Rating" FOR SELECT USING ("fromUserId" = current_setting('app.current_user_id', true) OR "toUserId" = current_setting('app.current_user_id', true));

-- Users can read their own SOS alerts
CREATE POLICY "users_read_own_sos" ON "SOSAlert" FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

-- Users can read conversations they're part of
CREATE POLICY "users_read_own_conversations" ON "ConversationParticipant" FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

-- Users can read their own prescriptions (PHI)
CREATE POLICY "clients_read_own_prescriptions" ON "Prescription" FOR SELECT USING ("clientId" = current_setting('app.current_user_id', true));

-- Users can read their own health orders
CREATE POLICY "clients_read_own_health_orders" ON "HealthOrder" FOR SELECT USING ("clientId" = current_setting('app.current_user_id', true));

-- ============================================
-- PART 4: ADMIN READ POLICIES
-- ============================================
-- Admin users can read all data for the dashboard.

CREATE POLICY "admin_read_users" ON "User" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'));
CREATE POLICY "admin_read_riders" ON "Rider" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'));
CREATE POLICY "admin_read_vehicles" ON "Vehicle" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));
CREATE POLICY "admin_read_orders" ON "Order" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN'));
CREATE POLICY "admin_read_tasks" ON "Task" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'));
CREATE POLICY "admin_read_payments" ON "Payment" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));
CREATE POLICY "admin_read_payouts" ON "RiderPayout" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));
CREATE POLICY "admin_read_cash" ON "CashCollection" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));
CREATE POLICY "admin_read_finance" ON "FinanceLog" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));
CREATE POLICY "admin_read_audit" ON "AuditLog" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));
CREATE POLICY "admin_read_sos" ON "SOSAlert" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));
CREATE POLICY "admin_read_merchants" ON "Merchant" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'));
CREATE POLICY "admin_read_transactions" ON "Transaction" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));
CREATE POLICY "admin_read_settlements" ON "Settlement" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));
CREATE POLICY "admin_read_disputes" ON "Dispute" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));
CREATE POLICY "admin_read_fraud" ON "FraudAlert" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));
CREATE POLICY "admin_read_prescriptions" ON "Prescription" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));
CREATE POLICY "admin_read_health_orders" ON "HealthOrder" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));
CREATE POLICY "admin_read_health_providers" ON "HealthProvider" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));
CREATE POLICY "admin_read_provider_docs" ON "ProviderDocument" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));
CREATE POLICY "admin_read_prescription_logs" ON "PrescriptionAccessLog" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));
CREATE POLICY "admin_read_wallets" ON "Wallet" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));
CREATE POLICY "admin_read_wallet_txns" ON "WalletTransaction" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));
CREATE POLICY "admin_read_heartbeats" ON "HeartbeatLog" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));
CREATE POLICY "admin_read_rider_metrics" ON "RiderMetrics" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));
CREATE POLICY "admin_read_task_analytics" ON "TaskAnalytics" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));
CREATE POLICY "admin_read_platform_metrics" ON "PlatformMetrics" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));
CREATE POLICY "admin_read_system_config" ON "SystemConfig" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN'));
CREATE POLICY "admin_read_sla_config" ON "SLAConfig" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));
CREATE POLICY "admin_read_pricing_config" ON "PricingConfig" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));
CREATE POLICY "admin_read_merchant_docs" ON "MerchantDocument" FOR SELECT USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));
CREATE POLICY "admin_read_own_perms" ON "AdminPermission" FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

-- ============================================
-- PART 5: PUBLIC READ POLICIES
-- ============================================
-- These allow unauthenticated browsing of public-facing data.

-- Anyone can browse approved & open merchants
CREATE POLICY "public_read_active_merchants" ON "Merchant" FOR SELECT USING (status = 'APPROVED' AND "isOpen" = true);

-- Anyone can browse available menu items
CREATE POLICY "public_read_available_items" ON "MenuItem" FOR SELECT USING ("isAvailable" = true);

-- Anyone can browse available medicine
CREATE POLICY "public_read_available_medicine" ON "MedicineCatalog" FOR SELECT USING ("isAvailable" = true);

-- Anyone can browse approved & open pharmacies
CREATE POLICY "public_read_approved_pharmacies" ON "Pharmacy" FOR SELECT USING (status = 'APPROVED' AND "isOpen" = true);

-- Anyone can browse verified health providers
CREATE POLICY "public_read_verified_providers" ON "HealthProvider" FOR SELECT USING ("verificationStatus" = 'VERIFIED' AND "isOpenNow" = true);

-- Anyone can read sent broadcasts
CREATE POLICY "public_read_broadcasts" ON "NotificationBroadcast" FOR SELECT USING (status = 'SENT');

-- Anyone can browse product variants
CREATE POLICY "public_read_variants" ON "ProductVariant" FOR SELECT USING (true);

-- ============================================
-- PART 6: CREATE API ROLE (for true RLS enforcement)
-- ============================================
-- The postgres superuser BYPASSES RLS. To make RLS actually work,
-- connect as smart_ride_api instead.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'smart_ride_api') THEN
    CREATE ROLE smart_ride_api LOGIN NOBYPASSRLS NOCREATEDB NOCREATEROLE NOSUPERUSER;
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
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- SELECT tablename, COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename ORDER BY policy_count DESC;
-- SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'smart_ride_api';
