# Smart Ride Implementation Priority Matrix

## Quick Reference: What to Build First

### 🔴 Critical (Week 1-3) - Must Have for Production

| Component | Type | Est. Time | Dependencies |
|-----------|------|-----------|--------------|
| TaskStateTransition Model | DB Model | 4h | Task model |
| DispatchMatch Model | DB Model | 4h | Task, Rider models |
| RiderCapability Model | DB Model | 2h | RiderRole enum |
| Transaction Model | DB Model | 4h | Wallet model |
| Settlement Model | DB Model | 4h | Rider, Transaction |
| Enhanced Task State Machine | Service | 8h | TaskStateTransition |
| Dispatch Persistence Service | Service | 8h | DispatchMatch |
| Capability Enforcement Service | Service | 4h | RiderCapability |
| `/api/tasks/[id]/transition` | API | 2h | State Machine |
| `/api/dispatch/assign` | API | 2h | Dispatch Service |
| `/api/dispatch/accept` | API | 2h | Dispatch Service |

**Total Critical Path: ~44 hours core backend + 20 hours testing = ~64 hours (1.5 weeks)**

---

### 🟠 High Priority (Week 3-5) - Financial Infrastructure

| Component | Type | Est. Time | Dependencies |
|-----------|------|-----------|--------------|
| Rider Wallet Service Enhancement | Service | 8h | Transaction Model |
| Settlement Service | Service | 8h | Settlement Model |
| Platform Commission Service | Service | 4h | CommissionRate |
| CommissionRate Model | DB Model | 2h | - |
| Financial API Endpoints | API | 8h | All financial services |
| Settlement Processing Job | Background | 6h | Settlement Service |

**Total High Priority: ~36 hours**

---

### 🟡 Medium Priority (Week 5-7) - Admin & Compliance

| Component | Type | Est. Time | Dependencies |
|-----------|------|-----------|--------------|
| AdminPermission Model | DB Model | 2h | UserRole |
| Dispute Model | DB Model | 4h | Task |
| DocumentExpiry Model | DB Model | 2h | Document |
| Permission Service | Service | 6h | AdminPermission |
| Dispute Service | Service | 6h | Dispute Model |
| Document Verification Service | Service | 4h | DocumentExpiry |
| Admin API Endpoints | API | 8h | All admin services |

**Total Medium Priority: ~32 hours**

---

### 🟢 Standard Priority (Week 7-9) - Supporting Features

| Component | Type | Est. Time | Dependencies |
|-----------|------|-----------|--------------|
| NotificationLog Model | DB Model | 2h | User |
| OfflineAction Model | DB Model | 2h | User |
| Push Notification Service | Service | 6h | NotificationLog |
| SMS Service | Service | 4h | NotificationLog |
| Offline Sync Service | Service | 6h | OfflineAction |
| Low Bandwidth Mode | Service | 4h | - |
| Notification APIs | API | 4h | Notification services |
| Offline APIs | API | 4h | Offline services |

**Total Standard Priority: ~32 hours**

---

### 🔵 Lower Priority (Week 9-10) - Analytics

| Component | Type | Est. Time | Dependencies |
|-----------|------|-----------|--------------|
| TaskAnalytics Model | DB Model | 2h | Task |
| RiderAnalytics Model | DB Model | 2h | Rider |
| PlatformMetrics Model | DB Model | 2h | - |
| Analytics Aggregation Service | Service | 8h | All analytics models |
| Analytics APIs | API | 4h | Analytics service |
| Dashboard Components | Frontend | 8h | Analytics APIs |

**Total Analytics: ~26 hours**

---

## Total Implementation Effort

| Priority | Hours | Weeks (1 dev) |
|----------|-------|---------------|
| 🔴 Critical | 64 | 1.5 |
| 🟠 High | 36 | 1 |
| 🟡 Medium | 32 | 1 |
| 🟢 Standard | 32 | 1 |
| 🔵 Lower | 26 | 0.5 |
| **Testing & QA** | 80 | 2 |
| **Mobile UX Updates** | 60 | 1.5 |
| **Documentation** | 20 | 0.5 |
| **TOTAL** | **350 hours** | **~9 weeks** |

---

## Database Migration Order

```sql
-- Run in this order:

-- Phase 1: Core
1. RiderCapability (new table)
2. TaskStateTransition (new table)
3. DispatchMatch (new table, add relation to Task & Rider)

-- Phase 2: Financial
4. Transaction (update existing, add to Wallet relation)
5. Settlement (new table, add to Rider relation)
6. CommissionRate (new table)

-- Phase 3: Admin
7. AdminPermission (new table)
8. Dispute (new table, add to Task relation)
9. DocumentExpiry (new table)

-- Phase 4: Notifications
10. NotificationLog (new table)
11. OfflineAction (new table)

-- Phase 5: Analytics
12. TaskAnalytics (new table)
13. RiderAnalytics (new table, add to Rider relation)
14. PlatformMetrics (new table)
```

---

## API Endpoint Summary

### New Endpoints Required: 45+

| Category | Count | Priority |
|----------|-------|----------|
| Task/State Management | 8 | 🔴 Critical |
| Dispatch | 6 | 🔴 Critical |
| Wallet/Financial | 10 | 🟠 High |
| Admin Operations | 12 | 🟡 Medium |
| Notifications | 5 | 🟢 Standard |
| Offline Sync | 4 | 🟢 Standard |
| Analytics | 6 | 🔵 Lower |

---

## Service Implementation Summary

### New Services: 15

| Service | Lines of Code (est.) | Priority |
|---------|---------------------|----------|
| Task State Machine (enhanced) | 400 | 🔴 Critical |
| Dispatch Persistence | 300 | 🔴 Critical |
| Capability Enforcement | 150 | 🔴 Critical |
| Rider Wallet Enhancement | 350 | 🟠 High |
| Settlement | 400 | 🟠 High |
| Commission | 200 | 🟠 High |
| Permission | 250 | 🟡 Medium |
| Dispute | 300 | 🟡 Medium |
| Document Verification | 200 | 🟡 Medium |
| Push Notifications | 300 | 🟢 Standard |
| SMS | 200 | 🟢 Standard |
| Offline Sync | 350 | 🟢 Standard |
| Low Bandwidth | 150 | 🟢 Standard |
| Analytics Aggregation | 400 | 🔵 Lower |

**Total Estimated Code: ~3,950 lines of service code**

---

## Immediate Next Steps

### This Week (Sprint 1)

1. **Create Prisma Migration**
   - Add TaskStateTransition model
   - Add DispatchMatch model
   - Add RiderCapability model
   - Run `npx prisma migrate dev`

2. **Implement Core Services**
   - Enhance task-state-machine.service.ts with DB persistence
   - Create dispatch-persistence.service.ts
   - Create capability.service.ts

3. **Create Core APIs**
   - `/api/tasks/[id]/transition` - POST
   - `/api/tasks/[id]/history` - GET
   - `/api/dispatch/assign` - POST
   - `/api/dispatch/[id]/accept` - POST
   - `/api/dispatch/[id]/reject` - POST

4. **Seed Default Capabilities**
   - Create seed script for RiderCapability defaults

### Week 2 (Sprint 2)

1. **Financial Models**
   - Transaction model
   - Settlement model
   - CommissionRate model

2. **Financial Services**
   - Rider wallet enhancement
   - Settlement service
   - Commission calculation

3. **Financial APIs**
   - All wallet endpoints
   - Settlement endpoints

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1: CRITICAL                         │
├─────────────────────────────────────────────────────────────┤
│  TaskStateTransition ◄─────── Task                          │
│  DispatchMatch ◄───────────── Task, Rider                   │
│  RiderCapability ◄─────────── RiderRole (enum exists)       │
│  State Machine Service ◄───── TaskStateTransition           │
│  Dispatch Service ◄────────── DispatchMatch                 │
│  Capability Service ◄──────── RiderCapability               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 2: FINANCIAL                        │
├─────────────────────────────────────────────────────────────┤
│  Transaction ◄─────────────── Wallet (exists)               │
│  Settlement ◄──────────────── Rider, Transaction            │
│  CommissionRate ◄──────────── TaskType (enum exists)        │
│  Wallet Service ◄──────────── Transaction                   │
│  Settlement Service ◄──────── Settlement                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 3: ADMIN                            │
├─────────────────────────────────────────────────────────────┤
│  AdminPermission ◄─────────── UserRole (enum exists)        │
│  Dispute ◄─────────────────── Task                          │
│  DocumentExpiry ◄──────────── Document (exists)             │
│  Permission Service ◄──────── AdminPermission               │
│  Dispute Service ◄─────────── Dispute                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 4+5: SUPPORT                        │
├─────────────────────────────────────────────────────────────┤
│  NotificationLog ◄─────────── User (exists)                 │
│  OfflineAction ◄───────────── User (exists)                 │
│  Notification Services ◄───── NotificationLog               │
│  Offline Services ◄────────── OfflineAction                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 6: ANALYTICS                        │
├─────────────────────────────────────────────────────────────┤
│  TaskAnalytics ◄───────────── Task                          │
│  RiderAnalytics ◄──────────── Rider                         │
│  PlatformMetrics ◄─────────── (standalone)                  │
│  Analytics Service ◄───────── All analytics models          │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing Strategy

### Unit Tests Required

| Service | Test Cases (min) |
|---------|------------------|
| Task State Machine | 20 |
| Dispatch Persistence | 15 |
| Capability Enforcement | 10 |
| Wallet Service | 15 |
| Settlement Service | 15 |
| Commission Service | 10 |
| Permission Service | 12 |
| Dispute Service | 10 |
| Notification Services | 10 |
| Offline Sync | 15 |
| Analytics | 10 |

**Total Unit Tests: ~142 minimum**

### Integration Tests Required

| Flow | Test Cases |
|------|------------|
| Task Lifecycle (create → complete) | 10 |
| Dispatch Flow (request → assign → accept) | 8 |
| Payment Flow (collect → settle) | 8 |
| Rider Onboarding (register → verify → approve) | 6 |
| Admin Operations | 10 |
| Offline Sync Recovery | 5 |

**Total Integration Tests: ~47 minimum**

---

## Production Checklist

### Before Launch

- [ ] All critical models migrated
- [ ] All critical services implemented
- [ ] All critical APIs functional
- [ ] Financial calculations verified
- [ ] State machine validated
- [ ] Dispatch persistence working
- [ ] Notification delivery confirmed
- [ ] Offline sync tested
- [ ] Admin RBAC working
- [ ] Analytics aggregating
- [ ] Unit test coverage > 80%
- [ ] Integration tests passing
- [ ] Load tests completed
- [ ] Security audit passed
- [ ] Documentation complete

---

*Use this document as a quick reference. See SMART_RIDE_IMPLEMENTATION_PLAN.md for full details.*
