# Fix Agent: F09, F10, F14

## Summary

Fixed three critical issues in the Smart Ride system.

### F09: Add request timeouts to expo API service
- **File**: `expo-app/src/services/api.ts`
- Added `AbortController` with configurable timeout to every `fetch()` call
- Read timeout: 15s, Write timeout: 30s
- Clear error message on timeout: "Request timed out. Please check your connection."
- Timeout cleaned up on both success and error paths
- Applied to `request()`, `tryRefreshToken()`, and `logActivity()` methods

### F10: Fix chat message duplication in chatStore
- **File**: `expo-app/src/store/chatStore.ts`
- Added primary dedup by `id` in `onNewMessage` handler
- Added secondary dedup by `conversationId + senderId + content + createdAt` (within 5s)
- Returns unchanged state when duplicate detected

### F14: Add bounds/eviction to dispatch-engine.ts
- **Files**: `src/lib/dispatch/dispatch-engine.ts`, `src/lib/dispatch/types.ts`
- `MAX_DISPATCH_LOGS = 1000` with eviction in `logDispatch()`
- `MAX_ACTIVE_DISPATCHES = 500` with eviction in `createDispatchRequest()`
- `MAX_DISPATCH_ATTEMPTS = 2000` with eviction in `createDispatchRequest()`
- Added `lastSeenAt: Date` to `Provider` interface
- Added `cleanStaleProviders()` — removes providers not seen in 30 min
- `getAvailableProviders()` calls `cleanStaleProviders()` before filtering
- Lint passes clean
