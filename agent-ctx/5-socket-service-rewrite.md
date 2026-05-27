# Task 5: Fix Socket Service for Web Context

## Summary
Complete rewrite of the socket service layer for Next.js web context, removing all React Native dependencies and implementing production-ready features.

## Files Modified
1. **`src/services/socket.ts`** — Complete rewrite
2. **`src/hooks/useSocket.ts`** — Complete rewrite
3. **`src/components/smart-ride/context/socket-context.tsx`** — New file
4. **`src/services/index.ts`** — Updated exports

## Key Changes

### Socket Service (`src/services/socket.ts`)
- Removed `AsyncStorage` (React Native only)
- Removed non-existent `@/constants`, `@/config/env`, `@/types` imports
- Singleton pattern via `SocketService.getInstance()`
- Connects through Caddy gateway: `query: { XTransformPort: '3001' }`
- Uses `window.location.origin` as URL
- Exponential backoff: 1s → 2s → 4s → 8s → ... → 30s max
- Custom reconnect (socket.io `reconnection: false`)
- Event names match backend: `connection:established`, `task:status:update`, `rider:task:matched`, `rider:location:update`, `driver:request`, `notification`
- `joinTaskRoom`/`leaveTaskRoom` emit `task:join`/`task:leave`
- All types self-contained

### Hooks (`src/hooks/useSocket.ts`)
- Imports from `@/services/socket` directly (no circular dep)
- `useSocketConnection(token)` — manages lifecycle
- `useRiderDispatch(onRequest, onExpired)` — dispatch with accept/reject
- `useSocketNotifications(onNotification)`
- `useLocationTracking()` — send location updates
- Fixed event name: `task:status:update` (was `task:status`)
- Proper cleanup in all useEffect returns

### Socket Context (`socket-context.tsx`)
- `SocketProvider` with `authToken` prop
- Auto-connect on token, auto-disconnect on unmount
- `useSocketContext()` hook
- Provides: `isConnected`, `connectionInfo`, `connect()`, `disconnect()`

## Verification
- `bun run lint` — passes with no errors
- `next build` — compiles cleanly
