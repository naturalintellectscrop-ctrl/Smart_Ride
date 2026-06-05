# Phase 9A: Live ETA Calculation

**Task ID:** P9A
**Agent:** main
**Status:** COMPLETED

## Work Done

1. **Enhanced `src/lib/tracking/eta-calculator.ts`** with:
   - `ServiceType` type for 5 service types
   - `LiveETAResult` interface with confidence level
   - `HeartbeatPoint` interface for speed calculation
   - `calculateAverageSpeedFromHeartbeats()` - computes speed from last 5 heartbeats
   - `calculateLiveETA()` - core ETA function with Haversine + road factor + traffic
   - `getVehicleTypeForService()` and `getFallbackSpeed()` helpers
   - Fallback speeds: 30 km/h (boda), 40 km/h (car)

2. **Created `src/app/api/eta/route.ts`** - GET endpoint:
   - Takes `taskId` query param
   - Cascading rider location: driverLocationStore → Rider DB → Task DB
   - Speed from heartbeat logs (last 5 entries)
   - Phase detection (pickup vs dropoff) based on task status
   - Full validation and error handling

3. **Modified `src/app/api/tasks/[id]/transition/route.ts`**:
   - Added `computeETAForTask()` helper function
   - ETA included in `task:status:update` socket emissions for relevant statuses
   - Non-blocking: ETA errors don't prevent socket emission

4. **Modified `src/services/socket.ts`**:
   - Added `eta` field to `TaskStatusUpdateData` interface

## Key Design Decisions
- Three-source location cascade for resilience
- Offline-first (no external APIs)
- Non-blocking ETA in socket emissions
- Confidence levels (HIGH/LOW) based on speed data availability
