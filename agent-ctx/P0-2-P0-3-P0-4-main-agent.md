# Task P0-2, P0-3, P0-4 - Agent Work Record

## Summary
Completed three related tasks for the Smart Ride Expo mobile app: realtime initialization, push token registration, and SecureStore migration.

---

## Task P0-2: Initialize Realtime + Wire Broadcasts

### Changes Made:

1. **`expo-app/app/_layout.tsx`** — Added `useRealtime()` hook call inside `ThemedRootLayout` component:
   - Imported `useRealtime` from `@/src/hooks/useRealtime`
   - Imported `useAuthStore` from `@/src/store/authStore`
   - Called `useRealtime()` after getting `isAuthenticated` from auth store
   - The hook auto-connects to Supabase Realtime when authenticated and disconnects on logout

2. **`src/app/api/calls/initiate/route.ts`** — Added realtime broadcast for incoming calls:
   - After creating the call session and audit log, broadcasted a `call:incoming` event to the recipient via `broadcastToUser()`
   - Event payload includes: `sessionId`, `channelId`, `callerId`, `callerName`, `callType`
   - Wrapped in try/catch to be non-blocking if realtime is not configured

---

## Task P0-3: Register Push Tokens with Backend

### Changes Made:

1. **`expo-app/src/services/notification.service.ts`** — Updated to register push token with backend:
   - Added `registerWithBackend()` method that calls `api.registerPushToken()`
   - Updated `initialize()` to auto-register the token after obtaining it
   - Imported `api` service for backend communication

2. **`expo-app/app/_layout.tsx`** — Added auth-aware push notification registration:
   - Added `registerForPushNotifications` callback using `Notifications.requestPermissionsAsync()` and `Notifications.getExpoPushTokenAsync()`
   - Added `useEffect` that registers for push notifications when `isAuthenticated` becomes true
   - Imported `Notifications` from `expo-notifications` and `Platform` from `react-native`

3. **`src/app/api/notifications/register-token/route.ts`** — Created new backend endpoint:
   - POST `/api/notifications/register-token` — registers Expo push token for authenticated users
   - Uses `getAuthUser` middleware for authentication
   - Uses `ExpoPushToken` model (already exists in schema) with upsert logic
   - Validates request body with Zod schema (token, platform)

---

## Task P0-4: Migrate Auth Tokens to SecureStore

### Changes Made:

1. **`expo-app/src/utils/secureStorage.ts`** — Created new SecureStore utility:
   - `saveTokens(accessToken, refreshToken)` — stores both tokens in SecureStore
   - `getAccessToken()` — retrieves access token from SecureStore
   - `getRefreshToken()` — retrieves refresh token from SecureStore
   - `saveUserData(data)` — stores user data JSON in SecureStore
   - `getUserData()` — retrieves user data JSON from SecureStore
   - `clearAll()` — removes all auth data from SecureStore

2. **`expo-app/src/services/auth.ts`** — Migrated to SecureStore:
   - Replaced `AsyncStorage.getItem/setItem` for tokens with `secureStorage` calls
   - `getAccessToken()` and `getRefreshToken()` now read from SecureStore
   - `saveTokens()` writes to SecureStore (primary) with AsyncStorage fallback
   - `clearTokens()` clears both SecureStore and AsyncStorage
   - `saveUserData()` and `getUserData()` now use SecureStore
   - Removed old `ACCESS_TOKEN_KEY`, `REFRESH_TOKEN_KEY`, `USER_DATA_KEY` constants (were using AsyncStorage directly)

3. **`expo-app/src/services/api.ts`** — Updated to use SecureStore:
   - `getHeaders()` reads access token from `secureStorage.getAccessToken()` instead of AsyncStorage
   - Token refresh reads/writes tokens via SecureStore
   - 401 handler clears tokens from SecureStore
   - Login/register/Google/OTP methods save tokens to SecureStore
   - Logout clears SecureStore

4. **`expo-app/src/store/authStore.ts`** — Updated zustand store:
   - Removed `accessToken` from `partialize` — no longer persisted to AsyncStorage
   - `login()` action saves token to SecureStore via `secureStorage.saveTokens()`
   - `logout()` action clears SecureStore via `secureStorage.clearAll()`
   - Only `user` object is persisted to AsyncStorage (non-sensitive)

5. **`expo-app/app/_layout.tsx`** — Added SecureStore rehydration:
   - On app start, if user exists in persisted store but `isAuthenticated` is false, loads token from SecureStore and sets it in the store
   - This handles the case where the app restarts and the zustand store has the user but not the token

6. **`expo-app/src/services/realtime.service.ts`** — Updated to use SecureStore:
   - Replaced `AsyncStorage.getItem()` for token reading with `secureStorage.getAccessToken()`
   - Removed AsyncStorage import

7. **`expo-app/src/services/socket.service.ts`** — Updated to use SecureStore:
   - Replaced `AsyncStorage.getItem()` for token reading with `secureStorage.getAccessToken()`
   - Removed AsyncStorage import

---

## Lint Results
- `bun run lint` passed with no errors
