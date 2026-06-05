-- ============================================
-- SMART RIDE — Service Role & User-Scoped RLS Policies
-- Migration 002: Create policies for all tables
-- ============================================
--
-- POLICY HIERARCHY:
--   1. "Service role full access" — Allows the API server (which sets
--      app.is_service_role = 'true') full read/write access to all tables.
--      This is the PRIMARY access path since all DB access goes through
--      the Next.js API routes that enforce their own auth/authorization.
--
--   2. "Users can read own data" — Defense-in-depth: users can only
--      read rows that belong to them. These policies use the
--      app.current_user_id session variable set by Prisma middleware.
--
--   3. "Admin full read access" — Admin users can read all data.
--      Uses app.current_user_role session variable.
--
-- HOW IT WORKS:
--   - The Prisma middleware (src/lib/db-rls.ts) sets session variables
--     BEFORE each query:
--       SET LOCAL app.is_service_role = 'true';
--       SET LOCAL app.current_user_id = '<user_id>';
--       SET LOCAL app.current_user_role = '<role>';
--   - RLS policies check these variables using current_setting()
--   - The "LOCAL" keyword ensures variables reset at transaction end
--
-- SECURITY NOTES:
--   - The API server ALWAYS sets app.is_service_role = 'true' because
--     it handles authorization at the application layer
--   - User-scoped policies are defense-in-depth for the scenario where
--     someone gains direct database access (e.g., leaked connection string)
--   - Admin users get read access to all tables for dashboard functionality
-- ============================================

-- ============================================
-- HELPER: Check if service role is active
-- ============================================
-- This is used by all policies as the primary access gate.
-- When the API server makes a query, it sets app.is_service_role = 'true'.

-- ============================================
-- TABLE: User
-- ============================================
CREATE POLICY "service_role_access" ON "User"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "users_read_own" ON "User"
  FOR SELECT
  USING (id = current_setting('app.current_user_id', true));

CREATE POLICY "admin_read_all" ON "User"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'));

-- ============================================
-- TABLE: Session
-- ============================================
CREATE POLICY "service_role_access" ON "Session"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "users_read_own_sessions" ON "Session"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', true));

-- ============================================
-- TABLE: OTP
-- ============================================
-- OTP is only accessible via service role (no user-scoped access)
CREATE POLICY "service_role_access" ON "OTP"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: PasswordResetToken
-- ============================================
-- Password reset tokens are only accessible via service role
CREATE POLICY "service_role_access" ON "PasswordResetToken"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: Rider
-- ============================================
CREATE POLICY "service_role_access" ON "Rider"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "riders_read_own" ON "Rider"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "admin_read_all" ON "Rider"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'));

-- ============================================
-- TABLE: Vehicle
-- ============================================
CREATE POLICY "service_role_access" ON "Vehicle"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "Vehicle"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));

-- ============================================
-- TABLE: Merchant
-- ============================================
CREATE POLICY "service_role_access" ON "Merchant"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "public_read_active" ON "Merchant"
  FOR SELECT
  USING (status = 'APPROVED' AND "isOpen" = true);

CREATE POLICY "admin_read_all" ON "Merchant"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'));

-- ============================================
-- TABLE: MenuItem
-- ============================================
CREATE POLICY "service_role_access" ON "MenuItem"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "public_read_available" ON "MenuItem"
  FOR SELECT
  USING ("isAvailable" = true);

-- ============================================
-- TABLE: Order
-- ============================================
CREATE POLICY "service_role_access" ON "Order"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "clients_read_own_orders" ON "Order"
  FOR SELECT
  USING ("clientId" = current_setting('app.current_user_id', true));

CREATE POLICY "admin_read_all" ON "Order"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN'));

-- ============================================
-- TABLE: OrderItem
-- ============================================
CREATE POLICY "service_role_access" ON "OrderItem"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: KOT
-- ============================================
CREATE POLICY "service_role_access" ON "KOT"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: Task
-- ============================================
CREATE POLICY "service_role_access" ON "Task"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "clients_read_own_tasks" ON "Task"
  FOR SELECT
  USING ("clientId" = current_setting('app.current_user_id', true));

CREATE POLICY "admin_read_all" ON "Task"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'));

-- ============================================
-- TABLE: Payment
-- ============================================
CREATE POLICY "service_role_access" ON "Payment"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "users_read_own_payments" ON "Payment"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "admin_read_all" ON "Payment"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));

-- ============================================
-- TABLE: RiderPayout
-- ============================================
CREATE POLICY "service_role_access" ON "RiderPayout"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "RiderPayout"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));

-- ============================================
-- TABLE: CashCollection
-- ============================================
CREATE POLICY "service_role_access" ON "CashCollection"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "CashCollection"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));

-- ============================================
-- TABLE: FinanceLog
-- ============================================
CREATE POLICY "service_role_access" ON "FinanceLog"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "FinanceLog"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));

-- ============================================
-- TABLE: Rating
-- ============================================
CREATE POLICY "service_role_access" ON "Rating"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "users_read_own" ON "Rating"
  FOR SELECT
  USING ("fromUserId" = current_setting('app.current_user_id', true)
      OR "toUserId" = current_setting('app.current_user_id', true));

-- ============================================
-- TABLE: AuditLog
-- ============================================
CREATE POLICY "service_role_access" ON "AuditLog"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "AuditLog"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));

-- ============================================
-- TABLE: Notification
-- ============================================
CREATE POLICY "service_role_access" ON "Notification"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "users_read_own" ON "Notification"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', true));

-- ============================================
-- TABLE: NotificationPreference
-- ============================================
CREATE POLICY "service_role_access" ON "NotificationPreference"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "users_read_own" ON "NotificationPreference"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', true));

-- ============================================
-- TABLE: NotificationBroadcast
-- ============================================
CREATE POLICY "service_role_access" ON "NotificationBroadcast"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "public_read_active" ON "NotificationBroadcast"
  FOR SELECT
  USING (status = 'SENT');

-- ============================================
-- TABLE: SOSAlert
-- ============================================
CREATE POLICY "service_role_access" ON "SOSAlert"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "users_read_own" ON "SOSAlert"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "admin_read_all" ON "SOSAlert"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));

-- ============================================
-- TABLE: SystemConfig (service role + admin only)
-- ============================================
CREATE POLICY "service_role_access" ON "SystemConfig"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "SystemConfig"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN'));

-- ============================================
-- TABLE: SLAConfig (service role + admin only)
-- ============================================
CREATE POLICY "service_role_access" ON "SLAConfig"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "SLAConfig"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));

-- ============================================
-- TABLE: PricingConfig (service role + admin + public read for fare calculation)
-- ============================================
CREATE POLICY "service_role_access" ON "PricingConfig"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "PricingConfig"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));

-- ============================================
-- TABLE: HeartbeatLog
-- ============================================
CREATE POLICY "service_role_access" ON "HeartbeatLog"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "HeartbeatLog"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));

-- ============================================
-- TABLE: ConnectionAlert
-- ============================================
CREATE POLICY "service_role_access" ON "ConnectionAlert"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: HealthOrder
-- ============================================
CREATE POLICY "service_role_access" ON "HealthOrder"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "clients_read_own" ON "HealthOrder"
  FOR SELECT
  USING ("clientId" = current_setting('app.current_user_id', true));

CREATE POLICY "admin_read_all" ON "HealthOrder"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));

-- ============================================
-- TABLE: HealthOrderItem
-- ============================================
CREATE POLICY "service_role_access" ON "HealthOrderItem"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: Prescription (PHI - Protected Health Information)
-- ============================================
CREATE POLICY "service_role_access" ON "Prescription"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "clients_read_own" ON "Prescription"
  FOR SELECT
  USING ("clientId" = current_setting('app.current_user_id', true));

CREATE POLICY "admin_read_all" ON "Prescription"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));

-- ============================================
-- TABLE: HealthProvider
-- ============================================
CREATE POLICY "service_role_access" ON "HealthProvider"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "public_read_verified" ON "HealthProvider"
  FOR SELECT
  USING ("verificationStatus" = 'VERIFIED' AND "isOpenNow" = true);

CREATE POLICY "admin_read_all" ON "HealthProvider"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));

-- ============================================
-- TABLE: ProviderDocument
-- ============================================
CREATE POLICY "service_role_access" ON "ProviderDocument"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "ProviderDocument"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));

-- ============================================
-- TABLE: ProviderOrder
-- ============================================
CREATE POLICY "service_role_access" ON "ProviderOrder"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: Pharmacy
-- ============================================
CREATE POLICY "service_role_access" ON "Pharmacy"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "public_read_approved" ON "Pharmacy"
  FOR SELECT
  USING (status = 'APPROVED' AND "isOpen" = true);

-- ============================================
-- TABLE: MedicineCatalog
-- ============================================
CREATE POLICY "service_role_access" ON "MedicineCatalog"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "public_read_available" ON "MedicineCatalog"
  FOR SELECT
  USING ("isAvailable" = true);

-- ============================================
-- TABLE: PharmacyOrderTicket
-- ============================================
CREATE POLICY "service_role_access" ON "PharmacyOrderTicket"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: PrescriptionAccessLog (PHI audit trail)
-- ============================================
CREATE POLICY "service_role_access" ON "PrescriptionAccessLog"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "PrescriptionAccessLog"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));

-- ============================================
-- TABLE: FraudAlert
-- ============================================
CREATE POLICY "service_role_access" ON "FraudAlert"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "FraudAlert"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));

-- ============================================
-- TABLE: ApiRateLimit (service role only)
-- ============================================
CREATE POLICY "service_role_access" ON "ApiRateLimit"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: Conversation
-- ============================================
CREATE POLICY "service_role_access" ON "Conversation"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: ConversationParticipant
-- ============================================
CREATE POLICY "service_role_access" ON "ConversationParticipant"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "users_read_own" ON "ConversationParticipant"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', true));

-- ============================================
-- TABLE: Message
-- ============================================
CREATE POLICY "service_role_access" ON "Message"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: Document
-- ============================================
CREATE POLICY "service_role_access" ON "Document"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: RiderCapability
-- ============================================
CREATE POLICY "service_role_access" ON "RiderCapability"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: TaskStateTransition
-- ============================================
CREATE POLICY "service_role_access" ON "TaskStateTransition"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: DispatchMatch
-- ============================================
CREATE POLICY "service_role_access" ON "DispatchMatch"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: Transaction
-- ============================================
CREATE POLICY "service_role_access" ON "Transaction"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "Transaction"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));

-- ============================================
-- TABLE: Settlement
-- ============================================
CREATE POLICY "service_role_access" ON "Settlement"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "Settlement"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));

-- ============================================
-- TABLE: AdminPermission
-- ============================================
CREATE POLICY "service_role_access" ON "AdminPermission"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_own" ON "AdminPermission"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', true));

-- ============================================
-- TABLE: Dispute
-- ============================================
CREATE POLICY "service_role_access" ON "Dispute"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "Dispute"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));

-- ============================================
-- TABLE: DocumentExpiry
-- ============================================
CREATE POLICY "service_role_access" ON "DocumentExpiry"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: NotificationLog
-- ============================================
CREATE POLICY "service_role_access" ON "NotificationLog"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: OfflineAction
-- ============================================
CREATE POLICY "service_role_access" ON "OfflineAction"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: TaskAnalytics
-- ============================================
CREATE POLICY "service_role_access" ON "TaskAnalytics"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "TaskAnalytics"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));

-- ============================================
-- TABLE: PlatformMetrics
-- ============================================
CREATE POLICY "service_role_access" ON "PlatformMetrics"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "PlatformMetrics"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));

-- ============================================
-- TABLE: Wallet
-- ============================================
CREATE POLICY "service_role_access" ON "Wallet"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "users_read_own" ON "Wallet"
  FOR SELECT
  USING ("ownerId" = current_setting('app.current_user_id', true));

CREATE POLICY "admin_read_all" ON "Wallet"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));

-- ============================================
-- TABLE: WalletTransaction
-- ============================================
CREATE POLICY "service_role_access" ON "WalletTransaction"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "WalletTransaction"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'));

-- ============================================
-- TABLE: Cart
-- ============================================
CREATE POLICY "service_role_access" ON "Cart"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "users_read_own" ON "Cart"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', true));

-- ============================================
-- TABLE: CartItem
-- ============================================
CREATE POLICY "service_role_access" ON "CartItem"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: ProductVariant
-- ============================================
CREATE POLICY "service_role_access" ON "ProductVariant"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "public_read_available" ON "ProductVariant"
  FOR SELECT
  USING (true);  -- Product variants are public for browsing

-- ============================================
-- TABLE: InventoryReservation
-- ============================================
CREATE POLICY "service_role_access" ON "InventoryReservation"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

-- ============================================
-- TABLE: RiderMetrics
-- ============================================
CREATE POLICY "service_role_access" ON "RiderMetrics"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "RiderMetrics"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'));

-- ============================================
-- TABLE: MerchantDocument
-- ============================================
CREATE POLICY "service_role_access" ON "MerchantDocument"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');

CREATE POLICY "admin_read_all" ON "MerchantDocument"
  FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'));

-- ============================================
-- TABLE: PaymentStateTransition
-- ============================================
CREATE POLICY "service_role_access" ON "PaymentStateTransition"
  FOR ALL
  USING (current_setting('app.is_service_role', true) = 'true')
  WITH CHECK (current_setting('app.is_service_role', true) = 'true');
