-- ============================================
-- SMART RIDE — Enable Row-Level Security
-- Migration 001: Enable RLS on ALL tables
-- ============================================
--
-- IMPORTANT: After running this migration, ALL tables become inaccessible
-- unless a policy explicitly grants access. You MUST run migration 002
-- immediately after this one to restore API server access.
--
-- Architecture note:
--   This project uses custom JWT auth (not Supabase Auth).
--   RLS policies use PostgreSQL session variables set by Prisma middleware:
--     - app.current_user_id  → the authenticated user's ID
--     - app.current_user_role → the authenticated user's role
--     - app.is_service_role  → 'true' when the API server is making the query
--
--   The API server sets app.is_service_role = 'true' for all requests
--   (since it already enforces auth/authorization at the API layer).
--   User-scoped policies provide defense-in-depth for any direct DB access.
-- ============================================

-- Enable RLS on all tables
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

-- Verification: List all tables with RLS enabled
-- Run this query after migration to confirm:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
