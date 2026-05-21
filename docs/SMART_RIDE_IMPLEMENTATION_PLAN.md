# Smart Ride Production Implementation Plan

## Executive Summary

This document outlines the comprehensive implementation plan for the Smart Ride production logistics and mobility ecosystem. The plan is prioritized by business criticality and technical dependencies, focusing on backend architecture and business logic.

---

## Current System Status

### ✅ Already Implemented

| Component | Status | Location |
|-----------|--------|----------|
| RiderRole enum | Complete | `prisma/schema.prisma` |
| UserRole RBAC roles | Complete | `prisma/schema.prisma` |
| Task model with timestamps | Complete | `prisma/schema.prisma` |
| Rider model with verification | Complete | `prisma/schema.prisma` |
| AuditLog model | Complete | `prisma/schema.prisma` |
| FinanceLog model | Complete | `prisma/schema.prisma` |
| CashCollection model | Complete | `prisma/schema.prisma` |
| HeartbeatLog model | Complete | `prisma/schema.prisma` |
| SOSAlert model | Complete | `prisma/schema.prisma` |
| Notification model | Complete | `prisma/schema.prisma` |
| FraudAlert model | Complete | `prisma/schema.prisma` |
| Wallet & WalletTransaction models | Complete | `prisma/schema.prisma` |
| Task State Machine utilities | Complete | `src/lib/services/task-state-machine.service.ts` |
| Dispatch Engine (in-memory) | Complete | `src/lib/dispatch/dispatch-engine.ts` |
| Scoring Engine | Complete | `src/lib/dispatch/scoring-engine.ts` |
| Wallet Service | Complete | `src/lib/wallet/wallet-service.ts` |
| Notification Service | Complete | `src/lib/services/notification.service.ts` |
| Auth Guards with RBAC | Complete | `src/lib/auth/guards.ts` |
| Real-time Socket.io Service | Complete | `mini-services/realtime-service/index.ts` |
| Offline Manager (client-side) | Complete | `src/lib/offline-manager.ts` |

### ❌ Missing/Critical Components

| Component | Priority | Impact |
|-----------|----------|--------|
| RiderCapability model | HIGH | Capability enforcement |
| TaskStateTransition model | HIGH | State audit trail |
| DispatchMatch model | HIGH | Dispatch tracking |
| Transaction model | HIGH | Financial transactions |
| Settlement model | HIGH | Payout settlements |
| AdminPermission model | MEDIUM | Fine-grained RBAC |
| Dispute model | MEDIUM | Dispute handling |
| DocumentExpiry tracking | MEDIUM | Compliance |
| NotificationLog model | MEDIUM | SMS/push tracking |
| OfflineAction model | MEDIUM | Offline queue |
| Analytics tables | LOW | Reporting |

---

## Phase 1: Core Infrastructure (Weeks 1-3)

### 1.1 Database Models - Critical

#### 1.1.1 TaskStateTransition Model
**Priority:** HIGH | **Complexity:** Medium | **Dependencies:** Task model

```prisma
model TaskStateTransition {
  id              String      @id @default(cuid())
  taskId          String
  fromStatus      TaskStatus
  toStatus        TaskStatus
  actorId         String
  actorType       ActorType
  reason          String?
  metadata        String?     // JSON for additional data
  ipAddress       String?
  userAgent       String?
  createdAt       DateTime    @default(now())
  
  task            Task        @relation(fields: [taskId], references: [id], onDelete: Cascade)
  
  @@index([taskId])
  @@index([actorId])
  @@index([createdAt])
}
```

**API Endpoints:**
- `GET /api/tasks/[id]/history` - Get state transition history
- `POST /api/tasks/[id]/transition` - Transition task state (internal)

**Service:**
- `src/lib/services/task-state-machine.service.ts` - Enhance existing with DB persistence

---

#### 1.1.2 DispatchMatch Model
**Priority:** HIGH | **Complexity:** Medium | **Dependencies:** Task, Rider models

```prisma
model DispatchMatch {
  id                  String            @id @default(cuid())
  taskId              String
  riderId             String
  status              DispatchStatus    @default(SEARCHING)
  searchRadiusKm      Float
  riderDistanceKm     Float?
  riderScore          Float?
  offeredAt           DateTime?
  respondedAt         DateTime?
  responseTimeSeconds Int?
  rejectionReason     String?
  attemptNumber       Int               @default(1)
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  
  task                Task              @relation(fields: [taskId], references: [id], onDelete: Cascade)
  rider               Rider             @relation(fields: [riderId], references: [id])
  
  @@index([taskId])
  @@index([riderId])
  @@index([status])
  @@index([createdAt])
}

enum DispatchStatus {
  SEARCHING
  OFFERED
  ACCEPTED
  REJECTED
  TIMED_OUT
  CANCELLED
  NO_RESPONSE
}
```

**API Endpoints:**
- `GET /api/dispatch/[taskId]/attempts` - Get dispatch attempts
- `POST /api/dispatch/assign` - Manual assignment (admin)
- `POST /api/dispatch/reassign` - Reassign task

**Services:**
- `src/lib/dispatch/dispatch-persistence.service.ts` - Persist dispatch state to DB
- `src/lib/dispatch/dispatch-recovery.service.ts` - Handle timeout reassignment

---

#### 1.1.3 RiderCapability Model
**Priority:** HIGH | **Complexity:** Low | **Dependencies:** RiderRole enum

```prisma
model RiderCapability {
  id              String      @id @default(cuid())
  riderRole       RiderRole
  taskType        TaskType
  isActive        Boolean     @default(true)
  createdAt       DateTime    @default(now())
  
  @@unique([riderRole, taskType])
  @@index([riderRole])
}
```

**Seed Data:**
```typescript
// Default capabilities
const DEFAULT_CAPABILITIES = [
  { riderRole: 'SMART_BODA_RIDER', taskType: 'SMART_BODA_RIDE' },
  { riderRole: 'SMART_BODA_RIDER', taskType: 'ITEM_DELIVERY' },
  { riderRole: 'SMART_CAR_DRIVER', taskType: 'SMART_CAR_RIDE' },
  { riderRole: 'DELIVERY_PERSONNEL', taskType: 'FOOD_DELIVERY' },
  { riderRole: 'DELIVERY_PERSONNEL', taskType: 'SHOPPING' },
  { riderRole: 'DELIVERY_PERSONNEL', taskType: 'ITEM_DELIVERY' },
  { riderRole: 'DELIVERY_PERSONNEL', taskType: 'SMART_HEALTH_DELIVERY' },
];
```

**Service:**
- `src/lib/services/capability.service.ts` - Capability enforcement

---

#### 1.1.4 Transaction Model
**Priority:** HIGH | **Complexity:** High | **Dependencies:** Wallet, Task, User models

```prisma
model Transaction {
  id                  String              @id @default(cuid())
  transactionNumber   String              @unique
  walletId            String
  transactionType     TransactionType
  amount              Float
  balanceBefore       Float
  balanceAfter        Float
  status              TransactionStatus   @default(PENDING)
  
  // References
  referenceId         String?
  referenceType       String?             // TASK, ORDER, SETTLEMENT, etc.
  
  // For external payments
  externalReference   String?
  externalProvider    String?             // MTN_MOMO, AIRTEL_MONEY, etc.
  
  // Fees and commissions
  platformFee         Float?
  processingFee       Float?
  
  // Audit
  description         String?
  metadata            String?             // JSON
  failureReason       String?
  
  processedAt         DateTime?
  reversedAt          DateTime?
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
  
  wallet              Wallet              @relation(fields: [walletId], references: [id])
  
  @@index([walletId])
  @@index([transactionType])
  @@index([status])
  @@index([referenceId])
  @@index([createdAt])
}

enum TransactionType {
  DEPOSIT
  WITHDRAWAL
  PAYMENT
  REFUND
  REWARD
  CASHBACK
  COMMISSION
  SETTLEMENT
  REVERSAL
  EARNING
}

enum TransactionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REVERSED
  CANCELLED
}
```

---

#### 1.1.5 Settlement Model
**Priority:** HIGH | **Complexity:** High | **Dependencies:** Rider, Transaction models

```prisma
model Settlement {
  id                  String            @id @default(cuid())
  settlementNumber    String            @unique
  riderId             String
  periodStart         DateTime
  periodEnd           DateTime
  
  // Totals
  totalEarnings       Float
  totalTasks          Int
  totalDistanceKm     Float
  
  // Fees
  platformCommission  Float
  processingFee       Float
  netAmount           Float
  
  // Status
  status              SettlementStatus  @default(PENDING)
  paymentMethod       PaymentMethod?
  paymentReference    String?
  
  // Audit
  approvedBy          String?
  approvedAt          DateTime?
  processedAt         DateTime?
  failureReason       String?
  
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  
  rider               Rider             @relation(fields: [riderId], references: [id])
  transactions        Transaction[]
  
  @@index([riderId])
  @@index([status])
  @@index([periodStart, periodEnd])
}

enum SettlementStatus {
  PENDING
  APPROVED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

---

### 1.2 Services Implementation

#### 1.2.1 Enhanced Task State Machine Service
**File:** `src/lib/services/task-state-machine.service.ts`

**New Functions:**
```typescript
// Transition task state with persistence
async function transitionTaskState(
  taskId: string,
  toStatus: TaskStatus,
  actorId: string,
  actorType: ActorType,
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<TaskStateTransition>

// Get task state history
async function getTaskStateHistory(taskId: string): Promise<TaskStateTransition[]>

// Validate transition with business rules
async function validateTransition(
  task: Task,
  toStatus: TaskStatus,
  actorId: string
): Promise<{ valid: boolean; error?: string }>

// Auto-timeout handler
async function handleMatchingTimeout(taskId: string): Promise<void>
```

**Business Rules:**
1. Only ASSIGNED riders can move task to ACCEPTED
2. Only ACCEPTED rider can move to ARRIVED, PICKED_UP, IN_TRANSIT
3. Cancellation requires reason code
4. COMPLETED triggers payment processing
5. FAILED triggers auto-refund if paid

---

#### 1.2.2 Capability Enforcement Service
**File:** `src/lib/services/capability.service.ts`

```typescript
// Check if rider can perform task type
async function canRiderPerformTask(
  riderId: string,
  taskType: TaskType
): Promise<boolean>

// Get allowed task types for rider
async function getAllowedTaskTypes(riderId: string): Promise<TaskType[]>

// Validate rider assignment
async function validateRiderAssignment(
  taskId: string,
  riderId: string
): Promise<{ valid: boolean; error?: string }>
```

---

#### 1.2.3 Dispatch Persistence Service
**File:** `src/lib/dispatch/dispatch-persistence.service.ts`

```typescript
// Create dispatch attempt
async function createDispatchAttempt(
  taskId: string,
  riderId: string,
  score: number,
  distanceKm: number
): Promise<DispatchMatch>

// Update dispatch status
async function updateDispatchStatus(
  attemptId: string,
  status: DispatchStatus,
  reason?: string
): Promise<void>

// Get dispatch history for task
async function getTaskDispatchHistory(
  taskId: string
): Promise<DispatchMatch[]>
```

---

### 1.3 API Endpoints - Core

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/api/tasks/[id]/transition` | POST | Transition task state | HIGH |
| `/api/tasks/[id]/history` | GET | Get state history | HIGH |
| `/api/dispatch/assign` | POST | Manual assignment | HIGH |
| `/api/dispatch/reassign` | POST | Reassign task | HIGH |
| `/api/dispatch/[id]/accept` | POST | Rider accepts task | HIGH |
| `/api/dispatch/[id]/reject` | POST | Rider rejects task | HIGH |
| `/api/riders/[id]/capabilities` | GET | Get rider capabilities | MEDIUM |
| `/api/transactions` | GET | Get transactions | HIGH |
| `/api/transactions/[id]` | GET | Get transaction details | MEDIUM |
| `/api/settlements` | GET | List settlements | HIGH |
| `/api/settlements/calculate` | POST | Calculate settlement | HIGH |

---

## Phase 2: Financial Infrastructure (Weeks 4-5)

### 2.1 Financial Services

#### 2.1.1 Rider Wallet Service Enhancement
**File:** `src/lib/wallet/rider-wallet.service.ts`

```typescript
// Credit rider earnings after task completion
async function creditRiderEarnings(
  taskId: string,
  riderId: string
): Promise<Transaction>

// Hold funds during task
async function holdFunds(
  walletId: string,
  amount: number,
  referenceId: string
): Promise<Transaction>

// Release held funds
async function releaseHeldFunds(
  transactionId: string
): Promise<Transaction>

// Calculate rider earnings for task
async function calculateTaskEarnings(
  taskId: string
): Promise<{ grossAmount: number; commission: number; netAmount: number }>
```

---

#### 2.1.2 Settlement Service
**File:** `src/lib/services/settlement.service.ts`

```typescript
// Calculate settlement for period
async function calculateSettlement(
  riderId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<SettlementCalculation>

// Create settlement
async function createSettlement(
  riderId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<Settlement>

// Process settlement payout
async function processSettlementPayout(
  settlementId: string,
  paymentMethod: PaymentMethod
): Promise<Transaction>

// Get pending settlements
async function getPendingSettlements(): Promise<Settlement[]>
```

---

#### 2.1.3 Platform Commission Service
**File:** `src/lib/services/commission.service.ts`

```typescript
// Calculate platform commission
function calculateCommission(
  taskType: TaskType,
  totalAmount: number
): { platformCommission: number; riderEarnings: number }

// Get commission rates
async function getCommissionRates(): Promise<CommissionRate[]>

// Record commission
async function recordCommission(
  taskId: string,
  amount: number
): Promise<FinanceLog>
```

---

### 2.2 Financial Models

#### 2.2.1 CommissionRate Model
```prisma
model CommissionRate {
  id                  String    @id @default(cuid())
  taskType            TaskType  @unique
  commissionPercent   Float
  minimumCommission   Float     @default(0)
  maximumCommission   Float?
  isActive            Boolean   @default(true)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}
```

---

### 2.3 Financial API Endpoints

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/api/wallet/balance` | GET | Get wallet balance | HIGH |
| `/api/wallet/transactions` | GET | Transaction history | HIGH |
| `/api/wallet/withdraw` | POST | Request withdrawal | HIGH |
| `/api/earnings/today` | GET | Today's earnings | MEDIUM |
| `/api/earnings/period` | GET | Period earnings | MEDIUM |
| `/api/settlements/pending` | GET | Pending settlements | MEDIUM |
| `/api/settlements/[id]/process` | POST | Process payout | HIGH |
| `/api/admin/finance/overview` | GET | Financial overview | HIGH |
| `/api/admin/finance/audit` | GET | Finance audit logs | MEDIUM |

---

## Phase 3: Admin Operations System (Weeks 5-6)

### 3.1 Admin Permission Model

```prisma
model AdminPermission {
  id              String    @id @default(cuid())
  role            UserRole
  permission      String
  resource        String    // tasks, riders, merchants, users, finance
  actions         String    // JSON array: ["create", "read", "update", "delete"]
  conditions      String?   // JSON for conditional access
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  
  @@unique([role, permission, resource])
}
```

### 3.2 Admin Services

#### 3.2.1 Permission Service
**File:** `src/lib/services/permission.service.ts`

```typescript
// Check if admin has permission
async function hasPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean>

// Get user permissions
async function getUserPermissions(userId: string): Promise<AdminPermission[]>

// Check resource access
async function canAccessResource(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: string
): Promise<boolean>
```

---

#### 3.2.2 Dispute Service
**File:** `src/lib/services/dispute.service.ts`

```typescript
// Create dispute
async function createDispute(
  taskId: string,
  openedBy: string,
  reason: string,
  evidence?: string[]
): Promise<Dispute>

// Resolve dispute
async function resolveDispute(
  disputeId: string,
  resolvedBy: string,
  resolution: string,
  refundAmount?: number
): Promise<Dispute>

// Get disputes queue
async function getDisputesQueue(
  status?: DisputeStatus
): Promise<Dispute[]>
```

---

### 3.3 Dispute Model

```prisma
model Dispute {
  id              String          @id @default(cuid())
  disputeNumber   String          @unique
  taskId          String
  openedBy        String
  openedByType    ActorType
  reason          String
  description     String?
  evidence        String?         // JSON array of URLs
  status          DisputeStatus   @default(OPEN)
  priority        DisputePriority @default(NORMAL)
  
  // Resolution
  assignedTo      String?
  assignedAt      DateTime?
  resolution      String?
  resolutionType  String?         // REFUND, PARTIAL_REFUND, NO_ACTION
  refundAmount    Float?
  resolvedBy      String?
  resolvedAt      DateTime?
  
  // Audit
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  task            Task            @relation(fields: [taskId], references: [id])
  
  @@index([status])
  @@index([openedBy])
  @@index([assignedTo])
  @@index([createdAt])
}

enum DisputeStatus {
  OPEN
  INVESTIGATING
  ESCALATED
  RESOLVED
  CLOSED
}

enum DisputePriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

---

### 3.4 Admin API Endpoints

| Endpoint | Method | Purpose | Role Required |
|----------|--------|---------|---------------|
| `/api/admin/tasks/[id]/reassign` | POST | Reassign task | OPERATIONS_ADMIN+ |
| `/api/admin/riders/[id]/suspend` | POST | Suspend rider | COMPLIANCE_ADMIN+ |
| `/api/admin/riders/[id]/approve` | POST | Approve rider | COMPLIANCE_ADMIN+ |
| `/api/admin/disputes` | GET | List disputes | OPERATIONS_ADMIN+ |
| `/api/admin/disputes/[id]` | GET | Get dispute | OPERATIONS_ADMIN+ |
| `/api/admin/disputes/[id]/resolve` | POST | Resolve dispute | OPERATIONS_ADMIN+ |
| `/api/admin/refunds` | POST | Process refund | FINANCE_ADMIN+ |
| `/api/admin/audit-logs` | GET | View audit logs | SUPER_ADMIN |
| `/api/admin/permissions` | GET | List permissions | SUPER_ADMIN |
| `/api/admin/permissions` | POST | Create permission | SUPER_ADMIN |

---

## Phase 4: Verification & Compliance (Week 6-7)

### 4.1 Document Expiry Tracking

```prisma
model DocumentExpiry {
  id                  String        @id @default(cuid())
  documentId          String
  documentType        DocumentType
  ownerId             String
  ownerType           String        // RIDER, MERCHANT, PROVIDER
  expiryDate          DateTime
  reminderSentAt      DateTime?
  reminderDaysBefore  Int           @default(30)
  status              ExpiryStatus  @default(VALID)
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
  
  @@index([expiryDate])
  @@index([ownerId])
  @@index([status])
}

enum ExpiryStatus {
  VALID
  EXPIRING_SOON
  EXPIRED
  RENEWED
}
```

### 4.2 Compliance Services

#### 4.2.1 Document Verification Service
**File:** `src/lib/services/document-verification.service.ts`

```typescript
// Verify document
async function verifyDocument(
  documentId: string,
  verifiedBy: string,
  notes?: string
): Promise<Document>

// Reject document
async function rejectDocument(
  documentId: string,
  rejectedBy: string,
  reason: string
): Promise<Document>

// Check expiring documents
async function checkExpiringDocuments(): Promise<DocumentExpiry[]>

// Send expiry reminder
async function sendExpiryReminder(
  documentExpiryId: string
): Promise<void>
```

---

#### 4.2.2 Rider Onboarding Service
**File:** `src/lib/services/rider-onboarding.service.ts`

```typescript
// Submit for verification
async function submitForVerification(
  riderId: string
): Promise<Rider>

// Approve rider
async function approveRider(
  riderId: string,
  approvedBy: string,
  notes?: string
): Promise<Rider>

// Reject rider
async function rejectRider(
  riderId: string,
  rejectedBy: string,
  reason: string
): Promise<Rider>

// Get pending verifications
async function getPendingVerifications(): Promise<Rider[]>
```

---

### 4.3 Compliance API Endpoints

| Endpoint | Method | Purpose | Role Required |
|----------|--------|---------|---------------|
| `/api/admin/verification/pending` | GET | Pending verifications | COMPLIANCE_ADMIN |
| `/api/admin/riders/[id]/verify` | POST | Verify rider | COMPLIANCE_ADMIN |
| `/api/admin/documents/[id]/verify` | POST | Verify document | COMPLIANCE_ADMIN |
| `/api/admin/documents/[id]/reject` | POST | Reject document | COMPLIANCE_ADMIN |
| `/api/admin/documents/expiring` | GET | Expiring documents | COMPLIANCE_ADMIN |

---

## Phase 5: Notifications Infrastructure (Week 7-8)

### 5.1 Notification Log Model

```prisma
model NotificationLog {
  id              String            @id @default(cuid())
  userId          String
  type            NotificationType
  channel         NotificationChannel
  title           String
  message         String
  
  // Delivery tracking
  status          DeliveryStatus    @default(PENDING)
  sentAt          DateTime?
  deliveredAt     DateTime?
  failedAt        DateTime?
  failureReason   String?
  
  // External references
  externalId      String?           // FCM message ID, SMS ID
  referenceId     String?
  referenceType   String?
  
  // Retry tracking
  retryCount      Int               @default(0)
  nextRetryAt     DateTime?
  
  createdAt       DateTime          @default(now())
  
  @@index([userId])
  @@index([status])
  @@index([channel])
  @@index([createdAt])
}

enum NotificationChannel {
  PUSH
  SMS
  EMAIL
  IN_APP
}

enum DeliveryStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  RETRYING
}
```

### 5.2 Notification Services

#### 5.2.1 Push Notification Service
**File:** `src/lib/notifications/push-notification.service.ts`

```typescript
// Send push notification
async function sendPushNotification(
  userId: string,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<NotificationLog>

// Send to multiple users
async function sendBroadcast(
  userIds: string[],
  title: string,
  message: string
): Promise<NotificationLog[]>

// Send to topic
async function sendToTopic(
  topic: string,
  title: string,
  message: string
): Promise<void>
```

---

#### 5.2.2 SMS Service
**File:** `src/lib/notifications/sms.service.ts`

```typescript
// Send SMS
async function sendSMS(
  phone: string,
  message: string
): Promise<NotificationLog>

// Send verification SMS
async function sendVerificationSMS(
  phone: string,
  code: string
): Promise<NotificationLog>

// Get SMS provider (for Uganda)
function getSMSProvider(): 'MTN' | 'AIRTEL' | 'AFRICASTALKING'
```

---

### 5.3 Notification API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notifications` | GET | Get notifications |
| `/api/notifications/[id]/read` | POST | Mark as read |
| `/api/notifications/register-device` | POST | Register FCM token |
| `/api/notifications/preferences` | GET/PUT | Notification preferences |

---

## Phase 6: Uganda Production Readiness (Week 8-9)

### 6.1 Offline Action Model

```prisma
model OfflineAction {
  id              String            @id @default(cuid())
  userId          String
  actionType      String
  entityType      String
  entityId        String?
  payload         String            // JSON
  status          OfflineStatus     @default(PENDING)
  
  // Sync tracking
  retryCount      Int               @default(0)
  lastRetryAt     DateTime?
  syncedAt        DateTime?
  failureReason   String?
  
  // Context
  deviceInfo      String?
  networkType     String?           // wifi, 4g, 3g, 2g
  location        String?           // JSON
  
  createdAt       DateTime          @default(now())
  expiresAt       DateTime
  
  @@index([userId])
  @@index([status])
  @@index([createdAt])
}

enum OfflineStatus {
  PENDING
  SYNCING
  SYNCED
  FAILED
  EXPIRED
}
```

### 6.2 Offline Services

#### 6.2.1 Offline Sync Service
**File:** `src/lib/services/offline-sync.service.ts`

```typescript
// Queue offline action
async function queueOfflineAction(
  userId: string,
  action: OfflineActionInput
): Promise<OfflineAction>

// Process pending actions
async function processPendingActions(
  userId: string
): Promise<{ synced: number; failed: number }>

// Retry failed action
async function retryFailedAction(
  actionId: string
): Promise<OfflineAction>

// Cleanup expired actions
async function cleanupExpiredActions(): Promise<number>
```

---

#### 6.2.2 Low Bandwidth Mode Service
**File:** `src/lib/services/low-bandwidth.service.ts`

```typescript
// Check connection quality
function assessConnectionQuality(
  latency: number,
  bandwidth: number
): 'excellent' | 'good' | 'poor' | 'offline'

// Get minimal data payload
async function getMinimalTaskData(
  taskId: string
): Promise<MinimalTaskData>

// Sync critical data only
async function syncCriticalData(
  userId: string,
  dataTypes: string[]
): Promise<void>
```

---

### 6.3 Offline API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/offline/queue` | POST | Queue offline action |
| `/api/offline/sync` | POST | Sync pending actions |
| `/api/offline/status` | GET | Get sync status |
| `/api/offline/batch` | POST | Batch sync multiple actions |

---

## Phase 7: Analytics & Monitoring (Week 9-10)

### 7.1 Analytics Models

```prisma
model TaskAnalytics {
  id                  String    @id @default(cuid())
  date                DateTime  @db.Date
  taskType            TaskType
  
  // Counts
  totalTasks          Int       @default(0)
  completedTasks      Int       @default(0)
  cancelledTasks      Int       @default(0)
  failedTasks         Int       @default(0)
  
  // Times
  avgCompletionTime   Float?    // minutes
  avgMatchTime        Float?    // seconds
  
  // Revenue
  totalRevenue        Float     @default(0)
  totalCommission     Float     @default(0)
  
  createdAt           DateTime  @default(now())
  
  @@unique([date, taskType])
  @@index([date])
}

model RiderAnalytics {
  id                    String    @id @default(cuid())
  date                  DateTime  @db.Date
  riderId               String
  
  // Performance
  tasksCompleted        Int       @default(0)
  tasksCancelled        Int       @default(0)
  totalDistanceKm       Float     @default(0)
  totalEarnings         Float     @default(0)
  avgRating             Float?
  
  // Availability
  onlineMinutes         Int       @default(0)
  idleMinutes           Int       @default(0)
  
  createdAt             DateTime  @default(now())
  
  @@unique([date, riderId])
  @@index([date])
  @@index([riderId])
}

model PlatformMetrics {
  id                    String    @id @default(cuid())
  date                  DateTime  @db.Date
  
  // User metrics
  activeRiders          Int       @default(0)
  activeClients         Int       @default(0)
  newRegistrations      Int       @default(0)
  
  // Task metrics
  totalTasks            Int       @default(0)
  completionRate        Float     @default(0)
  avgResponseTime       Float?
  
  // Financial
  totalRevenue          Float     @default(0)
  totalPayouts          Float     @default(0)
  pendingSettlements    Float     @default(0)
  
  // System
  systemUptime          Float     @default(100)
  errorRate             Float     @default(0)
  
  createdAt             DateTime  @default(now())
  
  @@unique([date])
}
```

### 7.2 Analytics Services

#### 7.2.1 Analytics Aggregation Service
**File:** `src/lib/services/analytics.service.ts`

```typescript
// Aggregate daily metrics
async function aggregateDailyMetrics(
  date: Date
): Promise<PlatformMetrics>

// Get task analytics
async function getTaskAnalytics(
  startDate: Date,
  endDate: Date,
  taskType?: TaskType
): Promise<TaskAnalytics[]>

// Get rider performance
async function getRiderPerformance(
  riderId: string,
  period: 'day' | 'week' | 'month'
): Promise<RiderAnalytics>

// Get dashboard metrics
async function getDashboardMetrics(): Promise<DashboardMetrics>
```

---

### 7.3 Analytics API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/analytics/overview` | GET | Platform overview |
| `/api/admin/analytics/tasks` | GET | Task analytics |
| `/api/admin/analytics/riders` | GET | Rider analytics |
| `/api/admin/analytics/revenue` | GET | Revenue analytics |
| `/api/admin/dashboard/metrics` | GET | Dashboard metrics |
| `/api/admin/dashboard/realtime` | GET | Real-time stats |

---

## Phase 8: Mobile App UX (Weeks 10-12)

### 8.1 Mobile Components Update Required

| Component | Current State | Required Changes |
|-----------|---------------|------------------|
| `RiderTaskScreen` | Basic | Add state machine, capability checks |
| `RiderEarningsScreen` | Basic | Integrate with wallet service |
| `RiderDashboard` | Basic | Add real-time updates |
| `TaskTrackingScreen` | Basic | Add offline support |
| `AdminDashboard` | Web-only | Create mobile admin views |

### 8.2 New Components Required

| Component | Purpose | Priority |
|-----------|---------|----------|
| `TaskStateTimeline` | Visual state progress | HIGH |
| `EarningsBreakdown` | Detailed earnings view | HIGH |
| `SettlementHistory` | Payout history | MEDIUM |
| `OfflineIndicator` | Connection status | HIGH |
| `CapabilityBadge` | Show rider capabilities | MEDIUM |
| `DisputeForm` | Raise dispute | MEDIUM |

---

## Implementation Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Core Infrastructure | 3 weeks | None |
| Phase 2: Financial Infrastructure | 2 weeks | Phase 1 |
| Phase 3: Admin Operations | 2 weeks | Phase 1 |
| Phase 4: Verification & Compliance | 1 week | Phase 3 |
| Phase 5: Notifications | 1 week | Phase 1 |
| Phase 6: Uganda Production | 1 week | Phase 1, 5 |
| Phase 7: Analytics | 1 week | Phase 1, 2 |
| Phase 8: Mobile UX | 2 weeks | All previous |

**Total Estimated Duration: 12 weeks**

---

## Risk Mitigation

### High Risk Areas

1. **Financial Calculations**
   - Risk: Incorrect commission calculations
   - Mitigation: Comprehensive unit tests, financial audit logs

2. **State Machine Transitions**
   - Risk: Invalid state transitions
   - Mitigation: Strict validation, atomic transactions

3. **Offline Sync**
   - Risk: Data loss during offline
   - Mitigation: Queue with retry, conflict resolution

4. **Real-time Dispatch**
   - Risk: Race conditions
   - Mitigation: Optimistic locking, idempotent operations

### Testing Requirements

1. **Unit Tests**: All services, state machines, calculations
2. **Integration Tests**: API endpoints, database operations
3. **E2E Tests**: Complete task lifecycle, payment flows
4. **Load Tests**: Dispatch engine, WebSocket connections
5. **Offline Tests**: Sync recovery, conflict resolution

---

## Deployment Strategy

### Staged Rollout

1. **Development**: Full implementation with test data
2. **Staging**: Integration testing with production-like data
3. **Beta**: Limited rollout to select riders/users
4. **Production**: Phased rollout by region

### Feature Flags

```typescript
const FEATURE_FLAGS = {
  DISPATCH_PERSISTENCE: true,
  SETTLEMENT_AUTO_PROCESSING: false,
  OFFLINE_SYNC_V2: true,
  NEW_WALLET_SYSTEM: true,
};
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Task completion rate | > 95% | Analytics |
| Average match time | < 60 seconds | Dispatch logs |
| Payment success rate | > 99% | Transaction logs |
| Offline sync success | > 98% | Offline action logs |
| Rider satisfaction | > 4.5/5 | Ratings |
| System uptime | > 99.9% | Monitoring |

---

## Appendix: Complete Model Dependencies

```
User
├── Session (auth)
├── Rider
│   ├── Vehicle
│   ├── Document
│   ├── Wallet
│   │   └── Transaction
│   ├── Settlement
│   ├── HeartbeatLog
│   ├── DispatchMatch
│   └── RiderAnalytics
├── Merchant
│   ├── MenuItem
│   ├── Pharmacy
│   ├── Order
│   └── Document
├── Task
│   ├── TaskStateTransition
│   ├── DispatchMatch
│   ├── Payment
│   ├── Rating
│   ├── Conversation
│   └── SOSAlert
├── Notification
├── NotificationLog
└── OfflineAction

Admin/System Models
├── AdminPermission
├── AuditLog
├── FinanceLog
├── CashCollection
├── FraudAlert
├── Dispute
├── DocumentExpiry
├── CommissionRate
├── PricingConfig
├── SystemConfig
└── PlatformMetrics
```

---

*Document Version: 1.0*
*Last Updated: $(date)*
*Author: Smart Ride Architecture Team*
