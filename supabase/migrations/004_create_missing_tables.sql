-- ============================================================================
-- Migration: 004_create_missing_tables.sql
-- Description: Creates 24 missing tables that are defined in the Prisma schema
--              but were never pushed to the production Supabase (PostgreSQL) database.
-- Safety: Uses DO blocks with IF NOT EXISTS checks for idempotency.
--         Enum types use DO blocks with pg_type checks (CREATE TYPE does not
--         support IF NOT EXISTS in PostgreSQL).
--         Uses CREATE INDEX IF NOT EXISTS for indexes.
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUM TYPES
-- These enums are used ONLY by the 24 missing tables and may not exist yet.
-- If they were already created by a previous migration, the DO block skips them.
-- NOTE: PostgreSQL does NOT support "CREATE TYPE IF NOT EXISTS" for enums.
--       We must use DO blocks with pg_type existence checks instead.
-- ============================================================================

-- DispatchMatchStatus: Status of a dispatch match attempt
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DispatchMatchStatus') THEN
    CREATE TYPE "DispatchMatchStatus" AS ENUM (
      'PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'
    );
  END IF;
END $$;

-- TransactionStatus: Status of a financial transaction
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionStatus') THEN
    CREATE TYPE "TransactionStatus" AS ENUM (
      'PENDING', 'COMPLETED', 'FAILED', 'REVERSED'
    );
  END IF;
END $$;

-- SettlementRecipientType: Who receives a settlement payout
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SettlementRecipientType') THEN
    CREATE TYPE "SettlementRecipientType" AS ENUM (
      'RIDER', 'MERCHANT', 'PROVIDER'
    );
  END IF;
END $$;

-- SettlementStatus: Status of a settlement
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SettlementStatus') THEN
    CREATE TYPE "SettlementStatus" AS ENUM (
      'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'
    );
  END IF;
END $$;

-- DisputeType: Type/category of a dispute
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeType') THEN
    CREATE TYPE "DisputeType" AS ENUM (
      'ITEM_NOT_RECEIVED', 'ITEM_DAMAGED', 'WRONG_ITEM', 'LATE_DELIVERY',
      'RIDER_MISCONDUCT', 'PRICE_DISPUTE', 'PAYMENT_ISSUE',
      'SERVICE_QUALITY', 'SAFETY_CONCERN', 'OTHER'
    );
  END IF;
END $$;

-- DisputeStatus: Current status of a dispute
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeStatus') THEN
    CREATE TYPE "DisputeStatus" AS ENUM (
      'OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'ESCALATED', 'CLOSED'
    );
  END IF;
END $$;

-- DisputePriority: Priority level of a dispute
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputePriority') THEN
    CREATE TYPE "DisputePriority" AS ENUM (
      'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    );
  END IF;
END $$;

-- NotificationChannel: Channel used to deliver a notification
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationChannel') THEN
    CREATE TYPE "NotificationChannel" AS ENUM (
      'PUSH', 'SMS', 'EMAIL', 'IN_APP'
    );
  END IF;
END $$;

-- NotificationDeliveryStatus: Delivery status of a notification
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationDeliveryStatus') THEN
    CREATE TYPE "NotificationDeliveryStatus" AS ENUM (
      'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED'
    );
  END IF;
END $$;

-- OfflineActionStatus: Sync status of an offline action
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OfflineActionStatus') THEN
    CREATE TYPE "OfflineActionStatus" AS ENUM (
      'PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT'
    );
  END IF;
END $$;

-- WalletOwnerType: Type of entity that owns a wallet
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletOwnerType') THEN
    CREATE TYPE "WalletOwnerType" AS ENUM (
      'USER', 'RIDER', 'MERCHANT', 'PROVIDER'
    );
  END IF;
END $$;

-- WalletStatus: Status of a digital wallet
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletStatus') THEN
    CREATE TYPE "WalletStatus" AS ENUM (
      'ACTIVE', 'FROZEN', 'CLOSED'
    );
  END IF;
END $$;

-- WalletTransactionType: Type of wallet balance change
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletTransactionType') THEN
    CREATE TYPE "WalletTransactionType" AS ENUM (
      'DEPOSIT', 'WITHDRAWAL', 'PAYMENT', 'REFUND', 'REWARD',
      'CASHBACK', 'COMMISSION', 'PAYOUT', 'ADJUSTMENT'
    );
  END IF;
END $$;

-- WalletTransactionStatus: Status of a wallet transaction
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletTransactionStatus') THEN
    CREATE TYPE "WalletTransactionStatus" AS ENUM (
      'PENDING', 'COMPLETED', 'FAILED', 'REVERSED'
    );
  END IF;
END $$;

-- InventoryReservationStatus: Status of an inventory reservation
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryReservationStatus') THEN
    CREATE TYPE "InventoryReservationStatus" AS ENUM (
      'RESERVED', 'CONFIRMED', 'RELEASED', 'EXPIRED'
    );
  END IF;
END $$;


-- ============================================================================
-- SECTION 2: TABLE CREATION
-- Tables are ordered to respect foreign key dependencies.
-- Referenced tables (User, Task, Rider, MenuItem, Payment) are assumed to
-- already exist from prior migrations.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 1: PasswordResetToken
-- Supports forgot password flow for admin users.
-- No foreign key dependencies.
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'PasswordResetToken') THEN
    CREATE TABLE "PasswordResetToken" (
      "id"        TEXT NOT NULL PRIMARY KEY,
      "email"     TEXT NOT NULL,
      "token"     TEXT NOT NULL UNIQUE,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "used"      BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Indexes for PasswordResetToken
CREATE INDEX IF NOT EXISTS "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- ----------------------------------------------------------------------------
-- Table 2: NotificationPreference
-- Per-user notification channel and category preferences.
-- FK: userId -> User.id (ON DELETE CASCADE)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'NotificationPreference') THEN
    CREATE TABLE "NotificationPreference" (
      "id"                    TEXT NOT NULL PRIMARY KEY,
      "userId"                TEXT NOT NULL UNIQUE,
      "surgeAlerts"           BOOLEAN NOT NULL DEFAULT true,
      "highDemandAlerts"      BOOLEAN NOT NULL DEFAULT true,
      "incentiveAlerts"       BOOLEAN NOT NULL DEFAULT true,
      "earningsOpportunities" BOOLEAN NOT NULL DEFAULT true,
      "repositionRequests"    BOOLEAN NOT NULL DEFAULT true,
      "surgeWarnings"         BOOLEAN NOT NULL DEFAULT true,
      "promoAlerts"           BOOLEAN NOT NULL DEFAULT true,
      "discountOffers"        BOOLEAN NOT NULL DEFAULT true,
      "taskUpdates"           BOOLEAN NOT NULL DEFAULT true,
      "orderUpdates"          BOOLEAN NOT NULL DEFAULT true,
      "paymentUpdates"        BOOLEAN NOT NULL DEFAULT true,
      "systemUpdates"         BOOLEAN NOT NULL DEFAULT true,
      "quietHoursEnabled"     BOOLEAN NOT NULL DEFAULT false,
      "quietHoursStart"       TEXT NOT NULL DEFAULT '22:00',
      "quietHoursEnd"         TEXT NOT NULL DEFAULT '07:00',
      "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  END IF;
END $$;

-- Indexes for NotificationPreference
CREATE INDEX IF NOT EXISTS "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- ----------------------------------------------------------------------------
-- Table 3: NotificationBroadcast
-- Zone-based notification broadcasts to target audiences.
-- No foreign key dependencies.
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'NotificationBroadcast') THEN
    CREATE TABLE "NotificationBroadcast" (
      "id"              TEXT NOT NULL PRIMARY KEY,
      "zoneId"          TEXT,
      "broadcastType"   TEXT NOT NULL,
      "title"           TEXT NOT NULL,
      "message"         TEXT NOT NULL,
      "targetAudience"  TEXT NOT NULL,
      "referenceId"     TEXT,
      "referenceType"   TEXT,
      "metadata"        TEXT,
      "expiresAt"       TIMESTAMP(3),
      "status"          TEXT NOT NULL DEFAULT 'PENDING',
      "sentAt"          TIMESTAMP(3),
      "recipientsCount" INTEGER NOT NULL DEFAULT 0,
      "deliveredCount"  INTEGER NOT NULL DEFAULT 0,
      "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Indexes for NotificationBroadcast
CREATE INDEX IF NOT EXISTS "NotificationBroadcast_broadcastType_idx" ON "NotificationBroadcast"("broadcastType");
CREATE INDEX IF NOT EXISTS "NotificationBroadcast_status_idx" ON "NotificationBroadcast"("status");
CREATE INDEX IF NOT EXISTS "NotificationBroadcast_createdAt_idx" ON "NotificationBroadcast"("createdAt");

-- ----------------------------------------------------------------------------
-- Table 4: RiderCapability
-- Defines which task types each rider role can handle.
-- No foreign key dependencies (riderRole/taskType are enums, not FKs).
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'RiderCapability') THEN
    CREATE TABLE "RiderCapability" (
      "id"                   TEXT NOT NULL PRIMARY KEY,
      "riderRole"            "RiderRole" NOT NULL,
      "taskType"             "TaskType" NOT NULL,
      "isAllowed"            BOOLEAN NOT NULL DEFAULT true,
      "requiresVehicle"      BOOLEAN NOT NULL DEFAULT false,
      "requiresInsulatedBox" BOOLEAN NOT NULL DEFAULT false,
      "maxDistance"          DOUBLE PRECISION,
      "notes"                TEXT,
      "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "RiderCapability_riderRole_taskType_key" UNIQUE ("riderRole", "taskType")
    );
  END IF;
END $$;

-- Indexes for RiderCapability
CREATE INDEX IF NOT EXISTS "RiderCapability_riderRole_idx" ON "RiderCapability"("riderRole");
CREATE INDEX IF NOT EXISTS "RiderCapability_taskType_idx" ON "RiderCapability"("taskType");

-- ----------------------------------------------------------------------------
-- Table 5: TaskStateTransition
-- Audit trail for all task state changes.
-- FK: taskId -> Task.id (ON DELETE CASCADE)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'TaskStateTransition') THEN
    CREATE TABLE "TaskStateTransition" (
      "id"              TEXT NOT NULL PRIMARY KEY,
      "taskId"          TEXT NOT NULL,
      "fromStatus"      "TaskStatus",
      "toStatus"        "TaskStatus" NOT NULL,
      "triggeredBy"     TEXT,
      "triggeredByType" TEXT,
      "reason"          TEXT,
      "metadata"        TEXT,
      "latitude"        DOUBLE PRECISION,
      "longitude"       DOUBLE PRECISION,
      "ipAddress"       TEXT,
      "userAgent"       TEXT,
      "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TaskStateTransition_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  END IF;
END $$;

-- Indexes for TaskStateTransition
CREATE INDEX IF NOT EXISTS "TaskStateTransition_taskId_idx" ON "TaskStateTransition"("taskId");
CREATE INDEX IF NOT EXISTS "TaskStateTransition_fromStatus_idx" ON "TaskStateTransition"("fromStatus");
CREATE INDEX IF NOT EXISTS "TaskStateTransition_toStatus_idx" ON "TaskStateTransition"("toStatus");
CREATE INDEX IF NOT EXISTS "TaskStateTransition_createdAt_idx" ON "TaskStateTransition"("createdAt");

-- ----------------------------------------------------------------------------
-- Table 6: DispatchMatch
-- Tracks dispatch attempts and outcomes for rider-task matching.
-- FK: taskId -> Task.id, riderId -> Rider.id
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'DispatchMatch') THEN
    CREATE TABLE "DispatchMatch" (
      "id"                 TEXT NOT NULL PRIMARY KEY,
      "taskId"             TEXT NOT NULL,
      "riderId"            TEXT NOT NULL,
      "matchScore"         DOUBLE PRECISION NOT NULL,
      "distanceKm"         DOUBLE PRECISION,
      "estimatedArrival"   INTEGER,
      "matchReason"        TEXT,
      "status"             "DispatchMatchStatus" NOT NULL DEFAULT 'PENDING',
      "expiresAt"          TIMESTAMP(3) NOT NULL,
      "acceptedAt"         TIMESTAMP(3),
      "rejectedAt"         TIMESTAMP(3),
      "expiredAt"          TIMESTAMP(3),
      "cancelledAt"        TIMESTAMP(3),
      "rejectionReason"    TEXT,
      "notificationSent"   BOOLEAN NOT NULL DEFAULT false,
      "notificationSentAt" TIMESTAMP(3),
      "retryCount"         INTEGER NOT NULL DEFAULT 0,
      "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DispatchMatch_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
      CONSTRAINT "DispatchMatch_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE NO ACTION ON UPDATE CASCADE
    );
  END IF;
END $$;

-- Indexes for DispatchMatch
CREATE INDEX IF NOT EXISTS "DispatchMatch_taskId_idx" ON "DispatchMatch"("taskId");
CREATE INDEX IF NOT EXISTS "DispatchMatch_riderId_idx" ON "DispatchMatch"("riderId");
CREATE INDEX IF NOT EXISTS "DispatchMatch_status_idx" ON "DispatchMatch"("status");
CREATE INDEX IF NOT EXISTS "DispatchMatch_expiresAt_idx" ON "DispatchMatch"("expiresAt");

-- ----------------------------------------------------------------------------
-- Table 7: Transaction
-- Financial transaction ledger for all monetary operations.
-- FK: riderId -> Rider.id, taskId -> Task.id (ON DELETE SET NULL)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Transaction') THEN
    CREATE TABLE "Transaction" (
      "id"               TEXT NOT NULL PRIMARY KEY,
      "transactionRef"   TEXT NOT NULL UNIQUE,
      "userId"           TEXT,
      "riderId"          TEXT,
      "merchantId"       TEXT,
      "taskId"           TEXT,
      "orderId"          TEXT,
      "type"             "TransactionType" NOT NULL,
      "amount"           DOUBLE PRECISION NOT NULL,
      "currency"         TEXT NOT NULL DEFAULT 'UGX',
      "balanceBefore"    DOUBLE PRECISION NOT NULL,
      "balanceAfter"     DOUBLE PRECISION NOT NULL,
      "status"           "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
      "paymentMethod"    TEXT,
      "paymentReference" TEXT,
      "description"      TEXT,
      "metadata"         TEXT,
      "processedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "reversedAt"       TIMESTAMP(3),
      "reversalReason"   TEXT,
      "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Transaction_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
      CONSTRAINT "Transaction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  END IF;
END $$;

-- Indexes for Transaction
CREATE INDEX IF NOT EXISTS "Transaction_userId_idx" ON "Transaction"("userId");
CREATE INDEX IF NOT EXISTS "Transaction_riderId_idx" ON "Transaction"("riderId");
CREATE INDEX IF NOT EXISTS "Transaction_merchantId_idx" ON "Transaction"("merchantId");
CREATE INDEX IF NOT EXISTS "Transaction_type_idx" ON "Transaction"("type");
CREATE INDEX IF NOT EXISTS "Transaction_status_idx" ON "Transaction"("status");
CREATE INDEX IF NOT EXISTS "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- ----------------------------------------------------------------------------
-- Table 8: Settlement
-- Payout settlements for riders, merchants, and providers.
-- No foreign key dependencies (recipientId is a polymorphic reference).
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Settlement') THEN
    CREATE TABLE "Settlement" (
      "id"                 TEXT NOT NULL PRIMARY KEY,
      "settlementRef"      TEXT NOT NULL UNIQUE,
      "recipientType"      "SettlementRecipientType" NOT NULL,
      "recipientId"        TEXT NOT NULL,
      "periodStart"        TIMESTAMP(3) NOT NULL,
      "periodEnd"          TIMESTAMP(3) NOT NULL,
      "taskCount"          INTEGER NOT NULL DEFAULT 0,
      "orderCount"         INTEGER NOT NULL DEFAULT 0,
      "grossAmount"        DOUBLE PRECISION NOT NULL,
      "platformCommission" DOUBLE PRECISION NOT NULL,
      "adjustments"        DOUBLE PRECISION NOT NULL DEFAULT 0,
      "netAmount"          DOUBLE PRECISION NOT NULL,
      "currency"           TEXT NOT NULL DEFAULT 'UGX',
      "status"             "SettlementStatus" NOT NULL DEFAULT 'PENDING',
      "paymentMethod"      TEXT,
      "paymentReference"   TEXT,
      "processedAt"        TIMESTAMP(3),
      "paidAt"             TIMESTAMP(3),
      "failedAt"           TIMESTAMP(3),
      "failureReason"      TEXT,
      "processedBy"        TEXT,
      "notes"              TEXT,
      "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Indexes for Settlement
CREATE INDEX IF NOT EXISTS "Settlement_recipientType_idx" ON "Settlement"("recipientType");
CREATE INDEX IF NOT EXISTS "Settlement_recipientId_idx" ON "Settlement"("recipientId");
CREATE INDEX IF NOT EXISTS "Settlement_status_idx" ON "Settlement"("status");
CREATE INDEX IF NOT EXISTS "Settlement_periodStart_idx" ON "Settlement"("periodStart");
CREATE INDEX IF NOT EXISTS "Settlement_createdAt_idx" ON "Settlement"("createdAt");

-- ----------------------------------------------------------------------------
-- Table 9: AdminPermission
-- Fine-grained RBAC permissions per role, resource, and action.
-- No foreign key dependencies (role is a UserRole enum).
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'AdminPermission') THEN
    CREATE TABLE "AdminPermission" (
      "id"         TEXT NOT NULL PRIMARY KEY,
      "role"       "UserRole" NOT NULL,
      "resource"   TEXT NOT NULL,
      "action"     TEXT NOT NULL,
      "isAllowed"  BOOLEAN NOT NULL DEFAULT true,
      "conditions" TEXT,
      "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AdminPermission_role_resource_action_key" UNIQUE ("role", "resource", "action")
    );
  END IF;
END $$;

-- Indexes for AdminPermission
CREATE INDEX IF NOT EXISTS "AdminPermission_role_idx" ON "AdminPermission"("role");
CREATE INDEX IF NOT EXISTS "AdminPermission_resource_idx" ON "AdminPermission"("resource");

-- ----------------------------------------------------------------------------
-- Table 10: Dispute
-- Dispute handling for tasks and orders.
-- FK: taskId -> Task.id, clientId -> User.id
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Dispute') THEN
    CREATE TABLE "Dispute" (
      "id"             TEXT NOT NULL PRIMARY KEY,
      "disputeNumber"  TEXT NOT NULL UNIQUE,
      "taskId"         TEXT UNIQUE,
      "orderId"        TEXT,
      "healthOrderId"  TEXT,
      "clientId"       TEXT NOT NULL,
      "riderId"        TEXT,
      "merchantId"     TEXT,
      "disputeType"    "DisputeType" NOT NULL,
      "category"       TEXT NOT NULL,
      "description"    TEXT NOT NULL,
      "status"         "DisputeStatus" NOT NULL DEFAULT 'OPEN',
      "priority"       "DisputePriority" NOT NULL DEFAULT 'MEDIUM',
      "resolution"     TEXT,
      "resolutionType" TEXT,
      "refundAmount"   DOUBLE PRECISION,
      "creditAmount"   DOUBLE PRECISION,
      "openedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "acknowledgedAt" TIMESTAMP(3),
      "acknowledgedBy" TEXT,
      "resolvedAt"     TIMESTAMP(3),
      "resolvedBy"     TEXT,
      "closedAt"       TIMESTAMP(3),
      "closedBy"       TEXT,
      "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Dispute_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
      CONSTRAINT "Dispute_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE
    );
  END IF;
END $$;

-- Indexes for Dispute
CREATE INDEX IF NOT EXISTS "Dispute_taskId_idx" ON "Dispute"("taskId");
CREATE INDEX IF NOT EXISTS "Dispute_orderId_idx" ON "Dispute"("orderId");
CREATE INDEX IF NOT EXISTS "Dispute_clientId_idx" ON "Dispute"("clientId");
CREATE INDEX IF NOT EXISTS "Dispute_riderId_idx" ON "Dispute"("riderId");
CREATE INDEX IF NOT EXISTS "Dispute_status_idx" ON "Dispute"("status");
CREATE INDEX IF NOT EXISTS "Dispute_priority_idx" ON "Dispute"("priority");
CREATE INDEX IF NOT EXISTS "Dispute_createdAt_idx" ON "Dispute"("createdAt");

-- ----------------------------------------------------------------------------
-- Table 11: DocumentExpiry
-- Tracks document expiration dates for compliance monitoring.
-- No foreign key dependencies (documentId is a standalone reference).
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'DocumentExpiry') THEN
    CREATE TABLE "DocumentExpiry" (
      "id"                 TEXT NOT NULL PRIMARY KEY,
      "documentId"         TEXT NOT NULL UNIQUE,
      "documentType"       TEXT NOT NULL,
      "ownerId"            TEXT NOT NULL,
      "ownerType"          TEXT NOT NULL,
      "expiryDate"         TIMESTAMP(3) NOT NULL,
      "reminderSentAt"     TIMESTAMP(3),
      "firstWarningSentAt" TIMESTAMP(3),
      "finalWarningSentAt" TIMESTAMP(3),
      "isExpired"          BOOLEAN NOT NULL DEFAULT false,
      "isActioned"         BOOLEAN NOT NULL DEFAULT false,
      "actionedAt"         TIMESTAMP(3),
      "actionedBy"         TEXT,
      "notes"              TEXT,
      "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Indexes for DocumentExpiry
CREATE INDEX IF NOT EXISTS "DocumentExpiry_ownerId_idx" ON "DocumentExpiry"("ownerId");
CREATE INDEX IF NOT EXISTS "DocumentExpiry_ownerType_idx" ON "DocumentExpiry"("ownerType");
CREATE INDEX IF NOT EXISTS "DocumentExpiry_expiryDate_idx" ON "DocumentExpiry"("expiryDate");
CREATE INDEX IF NOT EXISTS "DocumentExpiry_isExpired_idx" ON "DocumentExpiry"("isExpired");

-- ----------------------------------------------------------------------------
-- Table 12: NotificationLog
-- Tracks notification delivery attempts and outcomes per channel.
-- FK: userId -> User.id
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'NotificationLog') THEN
    CREATE TABLE "NotificationLog" (
      "id"             TEXT NOT NULL PRIMARY KEY,
      "userId"         TEXT NOT NULL,
      "notificationId" TEXT,
      "type"           "NotificationChannel" NOT NULL,
      "status"         "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
      "title"          TEXT NOT NULL,
      "message"        TEXT NOT NULL,
      "data"           TEXT,
      "provider"       TEXT,
      "providerRef"    TEXT,
      "sentAt"         TIMESTAMP(3),
      "deliveredAt"    TIMESTAMP(3),
      "failedAt"       TIMESTAMP(3),
      "failureReason"  TEXT,
      "retryCount"     INTEGER NOT NULL DEFAULT 0,
      "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE
    );
  END IF;
END $$;

-- Indexes for NotificationLog
CREATE INDEX IF NOT EXISTS "NotificationLog_userId_idx" ON "NotificationLog"("userId");
CREATE INDEX IF NOT EXISTS "NotificationLog_status_idx" ON "NotificationLog"("status");
CREATE INDEX IF NOT EXISTS "NotificationLog_type_idx" ON "NotificationLog"("type");
CREATE INDEX IF NOT EXISTS "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

-- ----------------------------------------------------------------------------
-- Table 13: OfflineAction
-- Offline action queue for synchronization when connectivity returns.
-- No foreign key dependencies.
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'OfflineAction') THEN
    CREATE TABLE "OfflineAction" (
      "id"             TEXT NOT NULL PRIMARY KEY,
      "userId"         TEXT NOT NULL,
      "actionType"     TEXT NOT NULL,
      "entityType"     TEXT NOT NULL,
      "entityId"       TEXT,
      "payload"        TEXT NOT NULL,
      "status"         "OfflineActionStatus" NOT NULL DEFAULT 'PENDING',
      "syncedAt"       TIMESTAMP(3),
      "syncedEntityId" TEXT,
      "conflictData"   TEXT,
      "resolvedAt"     TIMESTAMP(3),
      "retryCount"     INTEGER NOT NULL DEFAULT 0,
      "deviceId"       TEXT,
      "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Indexes for OfflineAction
CREATE INDEX IF NOT EXISTS "OfflineAction_userId_idx" ON "OfflineAction"("userId");
CREATE INDEX IF NOT EXISTS "OfflineAction_status_idx" ON "OfflineAction"("status");
CREATE INDEX IF NOT EXISTS "OfflineAction_actionType_idx" ON "OfflineAction"("actionType");
CREATE INDEX IF NOT EXISTS "OfflineAction_createdAt_idx" ON "OfflineAction"("createdAt");

-- ----------------------------------------------------------------------------
-- Table 14: TaskAnalytics
-- Daily aggregated task metrics by task type.
-- No foreign key dependencies.
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'TaskAnalytics') THEN
    CREATE TABLE "TaskAnalytics" (
      "id"                TEXT NOT NULL PRIMARY KEY,
      "date"              TIMESTAMP(3) NOT NULL,
      "taskType"          "TaskType" NOT NULL,
      "totalCreated"      INTEGER NOT NULL DEFAULT 0,
      "totalCompleted"    INTEGER NOT NULL DEFAULT 0,
      "totalCancelled"    INTEGER NOT NULL DEFAULT 0,
      "totalFailed"       INTEGER NOT NULL DEFAULT 0,
      "avgCompletionTime" INTEGER,
      "avgRating"         DOUBLE PRECISION,
      "totalRevenue"      DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalCommission"   DOUBLE PRECISION NOT NULL DEFAULT 0,
      "avgDistance"       DOUBLE PRECISION,
      "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TaskAnalytics_date_taskType_key" UNIQUE ("date", "taskType")
    );
  END IF;
END $$;

-- Indexes for TaskAnalytics
CREATE INDEX IF NOT EXISTS "TaskAnalytics_date_idx" ON "TaskAnalytics"("date");
CREATE INDEX IF NOT EXISTS "TaskAnalytics_taskType_idx" ON "TaskAnalytics"("taskType");

-- ----------------------------------------------------------------------------
-- Table 15: PlatformMetrics
-- System-wide daily metrics snapshot.
-- No foreign key dependencies.
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'PlatformMetrics') THEN
    CREATE TABLE "PlatformMetrics" (
      "id"                   TEXT NOT NULL PRIMARY KEY,
      "date"                 TIMESTAMP(3) NOT NULL UNIQUE,
      "activeRiders"         INTEGER NOT NULL DEFAULT 0,
      "activeClients"        INTEGER NOT NULL DEFAULT 0,
      "totalTasksCompleted"  INTEGER NOT NULL DEFAULT 0,
      "totalRevenue"         DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalCommission"      DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalPayouts"         DOUBLE PRECISION NOT NULL DEFAULT 0,
      "avgResponseTime"      INTEGER,
      "avgDispatchTime"      INTEGER,
      "customerSatisfaction" DOUBLE PRECISION,
      "newRegistrations"     INTEGER NOT NULL DEFAULT 0,
      "disputesOpened"       INTEGER NOT NULL DEFAULT 0,
      "disputesResolved"     INTEGER NOT NULL DEFAULT 0,
      "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Indexes for PlatformMetrics
CREATE INDEX IF NOT EXISTS "PlatformMetrics_date_idx" ON "PlatformMetrics"("date");

-- ----------------------------------------------------------------------------
-- Table 16: Wallet
-- Digital wallet for users, riders, merchants, and providers.
-- No foreign key dependencies (ownerId is a polymorphic reference).
-- Must be created before WalletTransaction.
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Wallet') THEN
    CREATE TABLE "Wallet" (
      "id"                TEXT NOT NULL PRIMARY KEY,
      "ownerId"           TEXT NOT NULL,
      "ownerType"         "WalletOwnerType" NOT NULL,
      "balance"           DOUBLE PRECISION NOT NULL DEFAULT 0,
      "pendingBalance"    DOUBLE PRECISION NOT NULL DEFAULT 0,
      "currency"          TEXT NOT NULL DEFAULT 'UGX',
      "status"            "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
      "totalDeposited"    DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalWithdrawn"    DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalSpent"        DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalReceived"     DOUBLE PRECISION NOT NULL DEFAULT 0,
      "lastDepositAt"     TIMESTAMP(3),
      "lastWithdrawalAt"  TIMESTAMP(3),
      "lastTransactionAt" TIMESTAMP(3),
      "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Wallet_ownerId_ownerType_key" UNIQUE ("ownerId", "ownerType")
    );
  END IF;
END $$;

-- Indexes for Wallet
CREATE INDEX IF NOT EXISTS "Wallet_ownerId_idx" ON "Wallet"("ownerId");
CREATE INDEX IF NOT EXISTS "Wallet_ownerType_idx" ON "Wallet"("ownerType");
CREATE INDEX IF NOT EXISTS "Wallet_status_idx" ON "Wallet"("status");

-- ----------------------------------------------------------------------------
-- Table 17: WalletTransaction
-- Tracks all wallet balance changes (deposits, withdrawals, payments, etc.).
-- FK: walletId -> Wallet.id (ON DELETE CASCADE)
-- Depends on: Wallet (must be created first)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'WalletTransaction') THEN
    CREATE TABLE "WalletTransaction" (
      "id"                TEXT NOT NULL PRIMARY KEY,
      "walletId"          TEXT NOT NULL,
      "transactionType"   "WalletTransactionType" NOT NULL,
      "amount"            DOUBLE PRECISION NOT NULL,
      "balanceBefore"     DOUBLE PRECISION NOT NULL,
      "balanceAfter"      DOUBLE PRECISION NOT NULL,
      "referenceId"       TEXT,
      "referenceType"     TEXT,
      "externalReference" TEXT,
      "externalProvider"  TEXT,
      "description"       TEXT,
      "status"            "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
      "metadata"          TEXT,
      "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  END IF;
END $$;

-- Indexes for WalletTransaction
CREATE INDEX IF NOT EXISTS "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");
CREATE INDEX IF NOT EXISTS "WalletTransaction_transactionType_idx" ON "WalletTransaction"("transactionType");
CREATE INDEX IF NOT EXISTS "WalletTransaction_referenceId_idx" ON "WalletTransaction"("referenceId");
CREATE INDEX IF NOT EXISTS "WalletTransaction_status_idx" ON "WalletTransaction"("status");
CREATE INDEX IF NOT EXISTS "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- ----------------------------------------------------------------------------
-- Table 18: Cart
-- Shopping cart for marketplace orders, one active cart per user.
-- No foreign key dependencies (userId has no @relation defined).
-- Must be created before CartItem.
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Cart') THEN
    CREATE TABLE "Cart" (
      "id"             TEXT NOT NULL PRIMARY KEY,
      "userId"         TEXT NOT NULL UNIQUE,
      "merchantId"     TEXT,
      "isActive"       BOOLEAN NOT NULL DEFAULT true,
      "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "abandonedAt"    TIMESTAMP(3),
      "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Indexes for Cart
CREATE INDEX IF NOT EXISTS "Cart_userId_idx" ON "Cart"("userId");
CREATE INDEX IF NOT EXISTS "Cart_merchantId_idx" ON "Cart"("merchantId");
CREATE INDEX IF NOT EXISTS "Cart_isActive_idx" ON "Cart"("isActive");
CREATE INDEX IF NOT EXISTS "Cart_abandonedAt_idx" ON "Cart"("abandonedAt");

-- ----------------------------------------------------------------------------
-- Table 19: CartItem
-- Individual items in a shopping cart with price snapshots.
-- FK: cartId -> Cart.id (ON DELETE CASCADE)
-- Depends on: Cart (must be created first)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'CartItem') THEN
    CREATE TABLE "CartItem" (
      "id"            TEXT NOT NULL PRIMARY KEY,
      "cartId"        TEXT NOT NULL,
      "menuItemId"    TEXT NOT NULL,
      "productName"   TEXT NOT NULL,
      "quantity"      INTEGER NOT NULL DEFAULT 1,
      "unitPrice"     DOUBLE PRECISION NOT NULL,
      "totalPrice"    DOUBLE PRECISION NOT NULL,
      "specialNotes"  TEXT,
      "priceSnapshot" DOUBLE PRECISION NOT NULL,
      "isActive"      BOOLEAN NOT NULL DEFAULT true,
      "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  END IF;
END $$;

-- Indexes for CartItem
CREATE INDEX IF NOT EXISTS "CartItem_cartId_idx" ON "CartItem"("cartId");
CREATE INDEX IF NOT EXISTS "CartItem_menuItemId_idx" ON "CartItem"("menuItemId");
CREATE INDEX IF NOT EXISTS "CartItem_isActive_idx" ON "CartItem"("isActive");

-- ----------------------------------------------------------------------------
-- Table 20: ProductVariant
-- Variants for menu items (size, color, add-ons, etc.).
-- FK: menuItemId -> MenuItem.id (ON DELETE CASCADE)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ProductVariant') THEN
    CREATE TABLE "ProductVariant" (
      "id"            TEXT NOT NULL PRIMARY KEY,
      "menuItemId"    TEXT NOT NULL,
      "variantName"   TEXT NOT NULL,
      "variantValue"  TEXT NOT NULL,
      "priceModifier" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "stockQuantity" INTEGER,
      "isAvailable"   BOOLEAN NOT NULL DEFAULT true,
      "sku"           TEXT,
      "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProductVariant_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  END IF;
END $$;

-- Indexes for ProductVariant
CREATE INDEX IF NOT EXISTS "ProductVariant_menuItemId_idx" ON "ProductVariant"("menuItemId");
CREATE INDEX IF NOT EXISTS "ProductVariant_isAvailable_idx" ON "ProductVariant"("isAvailable");

-- ----------------------------------------------------------------------------
-- Table 21: InventoryReservation
-- Temporary stock reservations during checkout to prevent overselling.
-- FK: menuItemId -> MenuItem.id (ON DELETE CASCADE)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'InventoryReservation') THEN
    CREATE TABLE "InventoryReservation" (
      "id"          TEXT NOT NULL PRIMARY KEY,
      "menuItemId"  TEXT NOT NULL,
      "variantId"   TEXT,
      "orderId"     TEXT,
      "taskId"      TEXT,
      "quantity"    INTEGER NOT NULL,
      "status"      "InventoryReservationStatus" NOT NULL DEFAULT 'RESERVED',
      "expiresAt"   TIMESTAMP(3) NOT NULL,
      "releasedAt"  TIMESTAMP(3),
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "InventoryReservation_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  END IF;
END $$;

-- Indexes for InventoryReservation
CREATE INDEX IF NOT EXISTS "InventoryReservation_menuItemId_idx" ON "InventoryReservation"("menuItemId");
CREATE INDEX IF NOT EXISTS "InventoryReservation_orderId_idx" ON "InventoryReservation"("orderId");
CREATE INDEX IF NOT EXISTS "InventoryReservation_status_idx" ON "InventoryReservation"("status");
CREATE INDEX IF NOT EXISTS "InventoryReservation_expiresAt_idx" ON "InventoryReservation"("expiresAt");

-- ----------------------------------------------------------------------------
-- Table 22: RiderMetrics
-- Operational metrics for rider performance tracking and scoring.
-- No foreign key dependencies (riderId has no @relation defined).
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'RiderMetrics') THEN
    CREATE TABLE "RiderMetrics" (
      "id"                  TEXT NOT NULL PRIMARY KEY,
      "riderId"             TEXT NOT NULL UNIQUE,
      "acceptanceRate"      DOUBLE PRECISION NOT NULL DEFAULT 0,
      "cancellationRate"    DOUBLE PRECISION NOT NULL DEFAULT 0,
      "completionRate"      DOUBLE PRECISION NOT NULL DEFAULT 0,
      "averageRating"       DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalOnlineHours"    DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalTasksOffered"   INTEGER NOT NULL DEFAULT 0,
      "totalTasksAccepted"  INTEGER NOT NULL DEFAULT 0,
      "totalTasksCompleted" INTEGER NOT NULL DEFAULT 0,
      "totalTasksCancelled" INTEGER NOT NULL DEFAULT 0,
      "lastCalculatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Indexes for RiderMetrics
CREATE INDEX IF NOT EXISTS "RiderMetrics_riderId_idx" ON "RiderMetrics"("riderId");
CREATE INDEX IF NOT EXISTS "RiderMetrics_acceptanceRate_idx" ON "RiderMetrics"("acceptanceRate");
CREATE INDEX IF NOT EXISTS "RiderMetrics_averageRating_idx" ON "RiderMetrics"("averageRating");

-- ----------------------------------------------------------------------------
-- Table 23: MerchantDocument
-- Document management for merchant verification and compliance.
-- No foreign key dependencies (merchantId has no @relation defined).
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'MerchantDocument') THEN
    CREATE TABLE "MerchantDocument" (
      "id"                TEXT NOT NULL PRIMARY KEY,
      "merchantId"        TEXT NOT NULL,
      "documentType"      TEXT NOT NULL,
      "documentName"      TEXT NOT NULL,
      "documentUrl"       TEXT NOT NULL,
      "documentSize"      INTEGER,
      "status"            "DocumentStatus" NOT NULL DEFAULT 'PENDING',
      "verifiedAt"        TIMESTAMP(3),
      "verifiedBy"        TEXT,
      "rejectionReason"   TEXT,
      "verificationNotes" TEXT,
      "uploadedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Indexes for MerchantDocument
CREATE INDEX IF NOT EXISTS "MerchantDocument_merchantId_idx" ON "MerchantDocument"("merchantId");
CREATE INDEX IF NOT EXISTS "MerchantDocument_documentType_idx" ON "MerchantDocument"("documentType");
CREATE INDEX IF NOT EXISTS "MerchantDocument_status_idx" ON "MerchantDocument"("status");

-- ----------------------------------------------------------------------------
-- Table 24: PaymentStateTransition
-- Strict payment state machine audit trail for tracking payment status changes.
-- No foreign key constraint (paymentId has no @relation defined in Prisma,
-- only an index is specified).
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'PaymentStateTransition') THEN
    CREATE TABLE "PaymentStateTransition" (
      "id"              TEXT NOT NULL PRIMARY KEY,
      "paymentId"       TEXT NOT NULL,
      "fromStatus"      "PaymentStatus",
      "toStatus"        "PaymentStatus" NOT NULL,
      "triggeredBy"     TEXT,
      "triggeredByType" TEXT,
      "reason"          TEXT,
      "metadata"        TEXT,
      "ipAddress"       TEXT,
      "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- Indexes for PaymentStateTransition
CREATE INDEX IF NOT EXISTS "PaymentStateTransition_paymentId_idx" ON "PaymentStateTransition"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentStateTransition_fromStatus_idx" ON "PaymentStateTransition"("fromStatus");
CREATE INDEX IF NOT EXISTS "PaymentStateTransition_toStatus_idx" ON "PaymentStateTransition"("toStatus");
CREATE INDEX IF NOT EXISTS "PaymentStateTransition_createdAt_idx" ON "PaymentStateTransition"("createdAt");


-- ============================================================================
-- SECTION 3: GRANT PERMISSIONS
-- Grant the smart_ride_api role access to all new tables and enums.
-- If the role does not exist yet, skip with a NOTICE.
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'smart_ride_api') THEN
    -- Grant usage on new enum types
    GRANT USAGE ON TYPE "DispatchMatchStatus" TO smart_ride_api;
    GRANT USAGE ON TYPE "TransactionStatus" TO smart_ride_api;
    GRANT USAGE ON TYPE "SettlementRecipientType" TO smart_ride_api;
    GRANT USAGE ON TYPE "SettlementStatus" TO smart_ride_api;
    GRANT USAGE ON TYPE "DisputeType" TO smart_ride_api;
    GRANT USAGE ON TYPE "DisputeStatus" TO smart_ride_api;
    GRANT USAGE ON TYPE "DisputePriority" TO smart_ride_api;
    GRANT USAGE ON TYPE "NotificationChannel" TO smart_ride_api;
    GRANT USAGE ON TYPE "NotificationDeliveryStatus" TO smart_ride_api;
    GRANT USAGE ON TYPE "OfflineActionStatus" TO smart_ride_api;
    GRANT USAGE ON TYPE "WalletOwnerType" TO smart_ride_api;
    GRANT USAGE ON TYPE "WalletStatus" TO smart_ride_api;
    GRANT USAGE ON TYPE "WalletTransactionType" TO smart_ride_api;
    GRANT USAGE ON TYPE "WalletTransactionStatus" TO smart_ride_api;
    GRANT USAGE ON TYPE "InventoryReservationStatus" TO smart_ride_api;

    -- Grant all on new tables
    GRANT ALL ON TABLE "PasswordResetToken" TO smart_ride_api;
    GRANT ALL ON TABLE "NotificationPreference" TO smart_ride_api;
    GRANT ALL ON TABLE "NotificationBroadcast" TO smart_ride_api;
    GRANT ALL ON TABLE "RiderCapability" TO smart_ride_api;
    GRANT ALL ON TABLE "TaskStateTransition" TO smart_ride_api;
    GRANT ALL ON TABLE "DispatchMatch" TO smart_ride_api;
    GRANT ALL ON TABLE "Transaction" TO smart_ride_api;
    GRANT ALL ON TABLE "Settlement" TO smart_ride_api;
    GRANT ALL ON TABLE "AdminPermission" TO smart_ride_api;
    GRANT ALL ON TABLE "Dispute" TO smart_ride_api;
    GRANT ALL ON TABLE "DocumentExpiry" TO smart_ride_api;
    GRANT ALL ON TABLE "NotificationLog" TO smart_ride_api;
    GRANT ALL ON TABLE "OfflineAction" TO smart_ride_api;
    GRANT ALL ON TABLE "TaskAnalytics" TO smart_ride_api;
    GRANT ALL ON TABLE "PlatformMetrics" TO smart_ride_api;
    GRANT ALL ON TABLE "Wallet" TO smart_ride_api;
    GRANT ALL ON TABLE "WalletTransaction" TO smart_ride_api;
    GRANT ALL ON TABLE "Cart" TO smart_ride_api;
    GRANT ALL ON TABLE "CartItem" TO smart_ride_api;
    GRANT ALL ON TABLE "ProductVariant" TO smart_ride_api;
    GRANT ALL ON TABLE "InventoryReservation" TO smart_ride_api;
    GRANT ALL ON TABLE "RiderMetrics" TO smart_ride_api;
    GRANT ALL ON TABLE "MerchantDocument" TO smart_ride_api;
    GRANT ALL ON TABLE "PaymentStateTransition" TO smart_ride_api;

    RAISE NOTICE 'Granted permissions on 24 new tables and 15 new enum types to smart_ride_api';
  ELSE
    RAISE NOTICE 'Role smart_ride_api does not exist yet. Skip GRANT. Run rls_complete.sql later.';
  END IF;
END $$;


-- ============================================================================
-- END OF MIGRATION
-- 24 tables created: PasswordResetToken, NotificationPreference,
--   NotificationBroadcast, RiderCapability, TaskStateTransition,
--   DispatchMatch, Transaction, Settlement, AdminPermission, Dispute,
--   DocumentExpiry, NotificationLog, OfflineAction, TaskAnalytics,
--   PlatformMetrics, Wallet, WalletTransaction, Cart, CartItem,
--   ProductVariant, InventoryReservation, RiderMetrics, MerchantDocument,
--   PaymentStateTransition
-- 15 enum types created: DispatchMatchStatus, TransactionStatus,
--   SettlementRecipientType, SettlementStatus, DisputeType, DisputeStatus,
--   DisputePriority, NotificationChannel, NotificationDeliveryStatus,
--   OfflineActionStatus, WalletOwnerType, WalletStatus,
--   WalletTransactionType, WalletTransactionStatus,
--   InventoryReservationStatus
-- ============================================================================
