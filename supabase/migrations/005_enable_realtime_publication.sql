-- ============================================
-- SMART RIDE — Enable Supabase Realtime Publication
-- Migration 005: Add tables to supabase_realtime publication
-- ============================================
--
-- WHY: Supabase Realtime Postgres Changes only fires for tables
-- that are part of the `supabase_realtime` publication. Without this,
-- .on('postgres_changes', ...) listeners on the mobile client will
-- never receive INSERT/UPDATE/DELETE events.
--
-- NOTE: Broadcast and Presence channels work WITHOUT this publication.
-- This is only needed for Postgres Changes (direct DB change listening).
--
-- IDEMPOTENT: Safe to run multiple times. Uses ALTER PUBLICATION ... ADD
-- which will error silently if the table is already in the publication,
-- so we wrap each in a DO block to handle that gracefully.
-- ============================================


-- ============================================
-- CRITICAL TABLES FOR REALTIME
-- ============================================
-- These are the tables that mobile/web clients listen to
-- for real-time updates via Postgres Changes.

DO $$
BEGIN
  -- Task: THE most critical table — ride/delivery status, rider assignment,
  -- location tracking, state transitions. Both client and rider apps listen.
  ALTER PUBLICATION supabase_realtime ADD TABLE "Task";
  RAISE NOTICE 'Added "Task" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"Task" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- Order: Food/order status updates for client and merchant
  ALTER PUBLICATION supabase_realtime ADD TABLE "Order";
  RAISE NOTICE 'Added "Order" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"Order" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- Rider: Online/offline status, location, connection status
  ALTER PUBLICATION supabase_realtime ADD TABLE "Rider";
  RAISE NOTICE 'Added "Rider" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"Rider" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- Payment: Payment status updates (critical for checkout flow)
  ALTER PUBLICATION supabase_realtime ADD TABLE "Payment";
  RAISE NOTICE 'Added "Payment" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"Payment" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- Notification: Real-time notification delivery
  ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";
  RAISE NOTICE 'Added "Notification" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"Notification" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- Message: In-app chat between rider and client
  ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
  RAISE NOTICE 'Added "Message" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"Message" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- Conversation: Chat conversation state (active/inactive)
  ALTER PUBLICATION supabase_realtime ADD TABLE "Conversation";
  RAISE NOTICE 'Added "Conversation" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"Conversation" already in supabase_realtime publication, skipping';
END;
$$;


-- ============================================
-- SUPPORTING TABLES FOR REALTIME
-- ============================================
-- These support real-time features on secondary screens.

DO $$
BEGIN
  -- HeartbeatLog: Rider GPS tracking / live location breadcrumbs
  ALTER PUBLICATION supabase_realtime ADD TABLE "HeartbeatLog";
  RAISE NOTICE 'Added "HeartbeatLog" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"HeartbeatLog" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- SOSAlert: Emergency alert monitoring (admin dashboard + rider/client)
  ALTER PUBLICATION supabase_realtime ADD TABLE "SOSAlert";
  RAISE NOTICE 'Added "SOSAlert" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"SOSAlert" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- DispatchMatch: Rider matching/dispatch events
  ALTER PUBLICATION supabase_realtime ADD TABLE "DispatchMatch";
  RAISE NOTICE 'Added "DispatchMatch" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"DispatchMatch" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- TaskStateTransition: Task lifecycle audit trail
  ALTER PUBLICATION supabase_realtime ADD TABLE "TaskStateTransition";
  RAISE NOTICE 'Added "TaskStateTransition" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"TaskStateTransition" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- HealthOrder: Health/medical order tracking
  ALTER PUBLICATION supabase_realtime ADD TABLE "HealthOrder";
  RAISE NOTICE 'Added "HealthOrder" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"HealthOrder" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- Rating: Rating submission events
  ALTER PUBLICATION supabase_realtime ADD TABLE "Rating";
  RAISE NOTICE 'Added "Rating" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"Rating" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- Dispute: Dispute updates
  ALTER PUBLICATION supabase_realtime ADD TABLE "Dispute";
  RAISE NOTICE 'Added "Dispute" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"Dispute" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- KOT: Kitchen Order Ticket status (merchant real-time)
  ALTER PUBLICATION supabase_realtime ADD TABLE "KOT";
  RAISE NOTICE 'Added "KOT" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"KOT" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- FraudAlert: Real-time fraud monitoring
  ALTER PUBLICATION supabase_realtime ADD TABLE "FraudAlert";
  RAISE NOTICE 'Added "FraudAlert" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"FraudAlert" already in supabase_realtime publication, skipping';
END;
$$;

DO $$
BEGIN
  -- CashCollection: Cash collection tracking
  ALTER PUBLICATION supabase_realtime ADD TABLE "CashCollection";
  RAISE NOTICE 'Added "CashCollection" to supabase_realtime publication';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '"CashCollection" already in supabase_realtime publication, skipping';
END;
$$;


-- ============================================
-- VERIFICATION
-- ============================================
-- Run this query after migration to confirm which tables are in the publication:
--
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime'
-- ORDER BY tablename;
--
-- Expected output should include:
--   Task, Order, Rider, Payment, Notification, Message, Conversation,
--   HeartbeatLog, SOSAlert, DispatchMatch, TaskStateTransition,
--   HealthOrder, Rating, Dispute, KOT, FraudAlert, CashCollection
-- ============================================
