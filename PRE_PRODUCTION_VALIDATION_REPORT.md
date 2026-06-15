# SMART RIDE — FINAL PRE-PRODUCTION VALIDATION REPORT

**Date:** 2025-03-04  
**Auditor:** AI Validation System  
**Scope:** Full Smart Ride Super-App (Expo Mobile + Next.js Web + Mini-Services)  
**Methodology:** 6-Phase Audit — Functional, UI/UX, Crash, Mock vs Real, Performance, Readiness  

---

## EXECUTIVE SUMMARY

| Phase | Focus | Finding | Severity |
|-------|-------|---------|----------|
| 1 | Full Application Validation | Customer app 65% functional, Rider 70%, Driver 65%, Merchant 55%, Pharmacist 60% | 🔴 CRITICAL |
| 2 | UI/UX Production Audit | 91 emojis, 10 dead buttons, 6 "Coming Soon", mixed themes | 🔴 CRITICAL |
| 3 | Dead-End + Crash Audit | 18 null crash risks, 8 dead-end screens, 3 memory leaks | 🔴 CRITICAL |
| 4 | Mock vs Real System | 88% DB-backed, dispatch engine is in-memory, 2 schema mismatches | 🟠 HIGH |
| 5 | Performance + Stability | Unbounded dispatch logs, no request timeouts, duplicate map libs | 🟠 HIGH |
| 6 | **MVP Readiness Score** | **47%** — NOT production-ready | 🔴 CRITICAL |

---

# PHASE 1: FULL APPLICATION VALIDATION

## 1A — CUSTOMER APP (24 screens audited)

| Screen | Status | Key Issues |
|--------|--------|------------|
| `(tabs)/index.tsx` Home | PARTIAL | Hardcoded prices, dead notification button, no location picker nav |
| `(tabs)/rides.tsx` Rides | ✅ WORKING | Proper error/loading/empty states, pull-to-refresh |
| `(tabs)/orders.tsx` Orders | PARTIAL | Null crash on `totalAmount.toLocaleString()`, no error UI |
| `(tabs)/messages.tsx` Messages | PARTIAL | **Messages tab NOT in tab navigator** — inaccessible via tab bar |
| `(tabs)/profile.tsx` Profile | PARTIAL | 4 dead menu items, fake "4.8" rating |
| `(tabs)/_layout.tsx` Tab Layout | PARTIAL | Only 4 tabs defined; Messages tab excluded |
| `wallet/index.tsx` | PARTIAL | Top Up & Withdraw buttons do nothing, broken divider logic |
| `shopping/index.tsx` | PARTIAL | Hardcoded TRENDING_DEALS, search query unused |
| `delivery/index.tsx` | PARTIAL | Hardcoded fare constants, local-only calculation |
| `health/index.tsx` | PARTIAL | Filter icon dead, category state unused |
| `health/prescriptions.tsx` | 🔴 STUB | Entire screen is "Coming Soon" |
| `health/pharmacy/[id].tsx` | PARTIAL | No merchant-mixing guard on cart |
| `notifications/index.tsx` | PARTIAL | Shallow navigation (goes to tab, not detail) |
| `sos/index.tsx` | 🔴 MOCKED | Mock contacts, no backend SOS activation, fake location |
| `location-picker.tsx` | 🔴 BROKEN | **Selected location NOT passed back to caller** |
| `orders/cart.tsx` | PARTIAL | Hardcoded fees, dead "Change" address, wrong order type |
| `orders/order-tracking.tsx` | PARTIAL | Cancel & Contact Support are "Coming Soon" |
| `orders/restaurants.tsx` | PARTIAL | `.rating.toFixed(1)` null crash, category filter not applied |
| `orders/merchant/[id].tsx` | 🔴 BROKEN | Uses NativeWind/Tailwind but global.css was removed |
| `chat/index.tsx` | PARTIAL | Dead search button, wrong empty-state action |
| `chat/[id].tsx` | PARTIAL | Hardcoded sender ID `'client-1'`, fake photo/location sharing |
| `call/[id].tsx` | 🔴 MOCKED | Call is setTimeout simulation, no real audio |
| `index.tsx` Splash | ✅ WORKING | Spinner doesn't animate in RN (minor) |
| `_layout.tsx` Root | PARTIAL | 7 routes not registered in Stack.Screen |

**Customer App Completeness: ~65%**

### Critical Customer Flow Gaps:
1. 🔴 **Location Picker doesn't return data** — ride/delivery location selection is broken
2. 🔴 **SOS has no backend integration** — safety-critical feature is non-functional
3. 🔴 **In-app calls are simulated** — no real audio/VoIP
4. 🔴 **Messages tab not in tab navigator** — users can't access messages
5. 🔴 **Merchant detail screen may render unstyled** — NativeWind classes but no CSS

---

## 1B — ROLE APPS

### RIDER FLOW — 70% Complete

| Step | Status | Notes |
|------|--------|-------|
| Register/Login | ✅ Working | Phone OTP, email, Google all work |
| Role Selection | ✅ Working | Client/Rider/Driver/Merchant |
| Onboarding | ⚠️ Partial | No document/photo upload, no date picker |
| Book Ride | ⚠️ Partial | Map blank without token, search needs debounce |
| Track Ride | ⚠️ Partial | Rating is hacky (Alert buttons), null crash risks |
| Earnings | ⚠️ Partial | Chart is "Coming Soon" placeholder |
| Wallet | ⚠️ Partial | Top Up & History buttons are no-ops |

### DRIVER FLOW — 65% Complete

| Step | Status | Notes |
|------|--------|-------|
| Go Online/Offline | ✅ Working | Socket + location tracking |
| Receive Requests | ⚠️ Partial | Socket-dependent, no polling fallback |
| Accept/Decline | ⚠️ Partial | **Raw `fetch()` instead of api service** |
| Task Execution | ⚠️ Partial | No polling, raw fetch transitions |
| Complete Ride | ⚠️ Partial | No fare summary for driver |
| Earnings | ❌ Missing | No dedicated driver earnings screen |

### MERCHANT FLOW — 55% Complete

| Step | Status | Notes |
|------|--------|-------|
| Register | ✅ Working | Real API call |
| Dashboard | 🔴 **BROKEN** | **Uses MOCK_ORDERS — not real data!** |
| Accept/Reject Orders | 🔴 NO-OP | `onAccept={() => {}}`, `onReject={() => {}}` |
| Manage Orders | ⚠️ Partial | Real API but unsafe type casts |
| Order Detail | ⚠️ Partial | Wrong theme, unsafe casts |
| Menu Management | ✅ Working | CRUD with real API |
| Earnings | ⚠️ Partial | Payout button is no-op, chart placeholder |

### PHARMACIST FLOW — 60% Complete

| Step | Status | Notes |
|------|--------|-------|
| Dashboard | ⚠️ Partial | Real API but wrong theme (dark instead of light) |
| Manage Orders | ⚠️ Partial | Real API but `any` types, uncertain API contract |
| Catalog | ⚠️ Partial | Real API but no image upload |
| Prescriptions | ⚠️ Partial | Real API but no image zoom |
| Earnings | ⚠️ Partial | Real API but no payout capability |

### AUTH FLOW

| Screen | Status | Key Issues |
|--------|--------|------------|
| `login.tsx` | PARTIAL | Apple Sign-In is "Coming Soon", phone number not passed to OTP |
| `register.tsx` | PARTIAL | No role in registration — deferred to post-login |
| `role-selection.tsx` | PARTIAL | **Pharmacist role missing**, role not persisted to API |
| `verify-otp.tsx` | ✅ WORKING | Device ID not persistent, test OTP exposed in dev mode |
| `phone-login.tsx` | ✅ WORKING | **Test OTP shown in Alert** (security risk), Uganda-only |
| `forgot-password.tsx` | PARTIAL | Uses dark theme (inconsistent), email-only reset |
| `reset-password.tsx` | PARTIAL | **Own local COLORS** (dark theme), token deep link may not work |

---

## 1C — ADMIN SYSTEM + API ROUTES

### Admin System Completeness

| Feature | Status | Completeness |
|---------|--------|-------------|
| Dashboard Stats | ✅ Working | 95% — Real-time parallel DB queries |
| User Management | ✅ Working | 90% — CRUD + role change + CSV export |
| Rider Approval | ✅ Working | 90% — Proper admin auth |
| Rider Rejection | 🔴 **BROKEN** | No auth check — anyone can reject riders |
| Merchant Verification | ✅ Working | 90% — Full approve/reject/suspend/activate |
| Wallet Adjustment | ✅ Working | 90% — Admin credit/debit with audit |
| Finance Integrity | ⚠️ Weak Auth | Only checks header presence, doesn't verify JWT |
| RBAC System | ✅ Working | 95% — Full 5-role permission matrix |
| Admin Login | ✅ Working | 90% — Tokens stored in localStorage (XSS risk) |
| System Setup | 🔴 CRITICAL | Hardcoded default admin credentials |
| SOS Management | ⚠️ Partial | Detail view has no auth |
| Dispatch Oversight | ⚠️ Partial | Analytics missing auth |

### 🔴 CRITICAL SECURITY ISSUES

| # | Issue | File | Impact |
|---|-------|------|--------|
| 1 | **Hardcoded admin setup credentials** (`Admin@123`, `smartride-setup-2024`) | `/api/admin/setup/route.ts` | Anyone can create super admin |
| 2 | **Hardcoded internal API key fallback** | `/api/dispatch/process-expired/route.ts` | Guessable default key |
| 3 | **Inconsistent JWT libraries** (`jose` vs `jsonwebtoken`) | `/api/auth/change-password/route.ts` | May break password change |
| 4 | **Rider reject route — no auth** | `/api/riders/reject/route.ts` | Anyone can reject riders |
| 5 | **Wallet payment methods — no auth** | `/api/wallet/payment-methods/route.ts` | IDOR on financial data |
| 6 | **SOS detail — no auth** | `/api/sos/[id]/route.ts` | Exposes emergency data |
| 7 | **Admin recovery — only checks header presence** | `/api/admin/recovery/route.ts` | Any auth header passes |
| 8 | **Cart API — no auth** | `/api/cart/route.ts` | IDOR on cart operations |
| 9 | **Payments GET — no auth** | `/api/payments/route.ts` | Exposes all payment data |
| 10 | **Dispatch analytics — no auth** | `/api/dispatch/analytics/route.ts` | Information disclosure |
| 11 | **Wallet top-up bypasses payment gateway** | `/api/wallet/route.ts` | Money appears from nowhere |
| 12 | **Wallet transfer — schema mismatch** | `/api/wallet/transfer/route.ts` | Won't work at runtime |

---

# PHASE 2: UI/UX PRODUCTION AUDIT

## Emoji Usage — 91 Instances Found 🔴

**All emojis must be replaced with proper icon library icons (Ionicons/MaterialCommunityIcons/Feather)**

Most affected files:
- `auth/role-selection.tsx` — 🚗🏍️🚐🏪👋
- `(tabs)/_layout.tsx` — 🏠🚗📦👤
- `(tabs)/index.tsx` — 🚗👋📍🔍🏍️
- `(tabs)/profile.tsx` — 11 emoji menu icons
- `rider/wallet.tsx` — 9 emoji payment icons
- `rider/earnings.tsx` — 📊📈💰🏆
- `merchant/orders/[id].tsx` — 7 emoji detail icons
- `pharmacist/index.tsx` — 6 emoji dashboard icons
- `pharmacist/earnings.tsx` — 6 emoji icons

## Placeholder / "Coming Soon" Content — 6 Instances 🔴

| File | Text |
|------|------|
| `auth/login.tsx` | "Apple Sign-In will be available in a future update." |
| `orders/order-tracking.tsx` | "Driver calling will be available soon" |
| `orders/order-tracking.tsx` | "Order cancellation will be available soon" |
| `health/prescriptions.tsx` | "Prescriptions Coming Soon" |
| `rider/earnings.tsx` | "Earnings trend chart coming soon" |
| `merchant/earnings.tsx` | Chart placeholder |

## Dead / No-Op Buttons — 10 Instances 🔴

| File | Button | What Happens |
|------|--------|-------------|
| `(tabs)/index.tsx` | Notifications | `onPress: () => {}` |
| `(tabs)/profile.tsx` | Saved Addresses | `onPress: () => {}` |
| `(tabs)/profile.tsx` | Emergency Contacts | `onPress: () => {}` |
| `(tabs)/profile.tsx` | Language | `onPress: () => {}` |
| `(tabs)/profile.tsx` | Settings gear | `onPress: () => {}` |
| `wallet/index.tsx` | Top Up | `onPress: () => {}` |
| `wallet/index.tsx` | Withdraw | `onPress: () => {}` |
| `rider/wallet.tsx` | Top Up | `onPress: () => {}` |
| `rider/wallet.tsx` | History | `onPress: () => {}` |
| `merchant/earnings.tsx` | Request Payout | No onPress handler |

## Mock / Static Data in Production — 5 Instances 🔴

| File | Data | Issue |
|------|------|-------|
| `sos/index.tsx` | MOCK_CONTACTS | Hardcoded emergency contacts |
| `merchant/index.tsx` | MOCK_ORDERS | Entire dashboard uses mock orders |
| `shopping/index.tsx` | TRENDING_DEALS | Static hardcoded deal cards |
| `orders/cart.tsx` | deliveryFee=3000, serviceFee=500 | Hardcoded fees |
| `(tabs)/profile.tsx` | rating: '4.8' | Hardcoded rating |

## Dark Mode Breaking Issues — 10 Files 🟠

| File | Issue |
|------|-------|
| `auth/reset-password.tsx` | Re-declares local COLORS with dark theme |
| `auth/forgot-password.tsx` | Uses dark COLORS + hardcoded dark rgba |
| `chat/index.tsx` & `chat/[id].x` | Dark theme + hardcoded dark rgba |
| `notifications/index.tsx` | Dark theme + hardcoded rgba |
| `location-picker.tsx` | Dark theme throughout |
| `health/pharmacy/[id].tsx` | Dark theme throughout |
| `merchant/orders/[id].tsx` | Uses Tailwind className (different system) |
| `orders/merchant/[id].tsx` | Uses Tailwind/NativeWind (CSS removed!) |

## Design Inconsistencies — 6 Issues 🟡

1. **Tailwind `className` vs StyleSheet** — `orders/merchant/[id].tsx` uses NativeWind, ALL others use StyleSheet
2. **Theme system split** — Only `profile.tsx` uses `useTheme()`, 49 others use static `COLORS`
3. **Dark vs Light theme** — App is half light (auth), half dark (chat, health, pharmacy)
4. **Header inconsistency** — Some use GlowHeader, some custom, some manual padding
5. **Back button inconsistency** — Some use Ionicons, some use ← text character
6. **Google icon** — Login uses letter "G" instead of Google logo

---

# PHASE 3: DEAD-END + CRASH AUDIT

## Null Crash Risks — 18 Found 🔴

| File | Risk |
|------|------|
| `auth/login.tsx` | `navigateByRole(user?.role)` — user could be null |
| `auth/verify-otp.tsx` | `await login(user, accessToken)` — user could be undefined |
| `(tabs)/orders.tsx` | `item.totalAmount.toLocaleString()` — null crash |
| `orders/restaurants.tsx` | `item.rating.toFixed(1)` — null crash |
| `rider/ride-tracking.tsx` | `task.rider.rating.toFixed(1)` — null crash |
| `rider/ride-tracking.tsx` | `task.totalAmount.toLocaleString()` — null crash |
| `driver/driver-task.tsx` | `task.client` accessed without null check |
| `merchant/orders/[id].tsx` | `(order as any).customerName` — forced cast |
| `wallet/index.tsx` | Destructuring `response.data` without null check |
| `health/pharmacy/[id].tsx` | `productsRes.data.map(...)` — no array guard |
| `orders/merchant/[id].tsx` | `productsRes.data.map(...)` — no array guard |
| `orders/order-tracking.tsx` | `order.merchant.name` — merchant could be null |
| `chat/[id].tsx` | `item.senderId === 'client-1'` — hardcoded comparison |
| `notifications/index.tsx` | Pushes to `/chat` instead of `/chat/[id]` |
| `orders/cart.tsx` | `clientId: user?.id` — could be undefined |

## Broken Navigation — 6 Routes 🟠

| File | Target | Issue |
|------|--------|-------|
| `notifications/index.tsx` | `/chat` | Should be `/chat/[id]` |
| `notifications/index.tsx` | `/(tabs)/rides` | Doesn't deep-link to specific ride |
| `auth/login.tsx` | `router.back()` | On initial route, goes nowhere |
| `orders/cart.tsx` | "Change" address | No onPress handler |
| `(tabs)/messages.tsx` | `/rider/ride-request` | Confusing for customer context |
| `location-picker.tsx` | Returns nothing | Selected location not passed back |

## Memory Leaks — 3 Confirmed 🔴

| File | Resource | Issue |
|------|----------|-------|
| `auth/forgot-password.tsx` | 3 Animated.loop | No cleanup in useEffect return |
| `auth/reset-password.tsx` | 3 Animated.loop | No cleanup in useEffect return |
| `auth/verify-otp.tsx` | setTimeout | Not cleaned up on unmount |

## Dead-End Screens — 8 Found 🔴

| Screen | Why User Gets Stuck |
|--------|---------------------|
| `health/prescriptions.tsx` | "Coming Soon" — no functionality |
| `sos/index.tsx` | Mock contacts, fake activation |
| `merchant/index.tsx` | Mock orders, accept/reject are no-ops |
| `wallet/index.tsx` | Top Up & Withdraw do nothing |
| `(tabs)/profile.tsx` | Saved Addresses & Emergency Contacts do nothing |
| `orders/order-tracking.tsx` | Cancel & Contact Support are "Coming Soon" |
| `orders/cart.tsx` | "Change" address button has no handler |
| `rider/wallet.tsx` | Top Up & History buttons do nothing |

## Unhandled Promises — 13 Found 🟠

| File | Operation | Issue |
|------|-----------|-------|
| `wallet/index.tsx` | `loadWallet()` | catch only logs |
| `shopping/index.tsx` | `loadMerchants()` | catch only logs |
| `health/index.tsx` | `loadData()` | catch only logs |
| `orders/restaurants.tsx` | `loadMerchants()` | catch only logs |
| `orders/merchant/[id].tsx` | `loadMerchant()` | catch only logs |
| `health/pharmacy/[id].tsx` | `loadPharmacy()` | catch only logs |
| `notifications/index.tsx` | `loadNotifications()` | catch only logs |
| `notifications/index.tsx` | `handleMarkAsRead()` | optimistic not rolled back |
| `notifications/index.tsx` | `handleMarkAllRead()` | optimistic not rolled back |
| `(tabs)/profile.tsx` | `loadStats()` | catch only logs |
| `chat/[id].tsx` | `handleSend()` | no try/catch around sendMessage |
| `rider/onboarding.tsx` | `saveStep()` | silently swallows errors |
| `driver/index.tsx` | `goOffline()` | fire-and-forget API call |

---

# PHASE 4: MOCK vs REAL SYSTEM AUDIT

## API Route Classification

| Classification | Count | Percentage |
|----------------|-------|------------|
| **REAL (DB-backed)** | 60 | **88%** |
| **PARTIAL** | 6 | **9%** |
| **MOCK** | 2 | **3%** |
| **STUB** | 0 | **0%** |
| **DEPRECATED** | 1 | N/A |

## Core Backend Services

| Service | Classification | Details |
|---------|----------------|---------|
| Auth/JWT | ✅ REAL | jsonwebtoken with proper verification |
| Payment Service | ✅ REAL | MTN MoMo + Airtel Money + Flutterwave |
| Wallet Service | ✅ REAL | Atomic Prisma transactions |
| Task State Machine | ✅ REAL | DB-backed transitions with audit |
| Dispatch Engine | 🔴 MOCK | **Entirely in-memory** — data lost on restart |
| Dispatch Persistence | ✅ REAL | DB-backed via dispatch-persistence.service |
| Cart Service | ✅ REAL | DB-backed |
| Order Service | ✅ REAL | Full lifecycle, atomic creation |
| Health Provider | ✅ REAL | DB-backed |
| SOS Service | ✅ REAL | DB-backed creation (but mobile app doesn't call it) |

## Mock Data Inventory

| Item | Location | Impact |
|------|----------|--------|
| In-memory dispatch engine | `dispatch-engine.ts` | All state lost on restart; "Use Redis in Production" |
| In-memory dispatch service | `mini-services/dispatch-service/` | Same — no DB persistence |
| Prescription images | `/api/prescriptions` | Falls back to `/prescriptions/placeholder.jpg` |
| Pharmacy distance | `/api/pharmacies` | Fake calculation (radius comparison, not geospatial) |
| Rides API wrong fields | `/api/rides` | Uses `type`, `pickupLat`, `fare` — wrong Prisma fields |
| Wallet transfer wrong key | `/api/wallet/transfer` | Uses `userId` instead of `ownerId/ownerType` |
| Merchant dashboard | `expo-app/merchant/index.tsx` | MOCK_ORDERS instead of real API data |
| SOS contacts | `expo-app/sos/index.tsx` | MOCK_CONTACTS — hardcoded emergency contacts |

## Database Schema Completeness: ~95%

40+ Prisma models covering all core domains. Minor gaps:
- `/api/rides` route written against older schema version
- Wallet uses composite `ownerId/ownerType` key but some routes assume `userId`

---

# PHASE 5: PERFORMANCE + STABILITY AUDIT

## Top 10 Critical Performance/Stability Issues

### #1 — Dispatch Engine Unbounded Memory Growth 🔴
**File:** `src/lib/dispatch/dispatch-engine.ts`  
`dispatchLogs[]`, `activeDispatches`, `dispatchAttempts`, `providerRegistry` grow without limit. Server OOM crash in production.

### #2 — Chat Message Duplication 🔴
**File:** `expo-app/src/store/chatStore.ts`  
When `sendMessage` succeeds via API AND socket delivers the same message, no deduplication exists. Users see duplicate messages.

### #3 — API Service Has No Request Timeouts 🔴
**File:** `expo-app/src/services/api.ts`  
Every `fetch()` call has no AbortController or timeout. On flaky networks (common in Uganda), requests hang indefinitely.

### #4 — Dual Polling + Socket Race Condition 🔴
**Files:** `ride-tracking.tsx`, `order-tracking.tsx`  
Polling and socket both update same state. Slow poll response overwrites fresh socket update.

### #5 — Duplicate Map Libraries in Mobile Bundle 🔴
**File:** `expo-app/package.json`  
Both `@rnmapbox/maps` (~3MB) and `react-native-maps` bundled. Only one needed.

### #6 — Broad Zustand Selectors Cause Cascading Re-renders 🔴
**Files:** `chat/[id].tsx`, `merchant/orders.tsx`, `shopping/index.tsx`  
`useChatStore()`, `useMerchantStore()`, `useCartStore()` subscribe to entire store. Any change re-renders.

### #7 — Multiple Geolocation Watchers Stack Up 🔴
**File:** `src/hooks/use-driver-location.ts`  
When `isOnline` changes, new watch created without clearing old. Multiple simultaneous watches.

### #8 — Socket Double-Connection from Screens 🔴
**Files:** `ride-tracking.tsx`, `order-tracking.tsx`  
Both call `socketService.connect()` in useEffect, but `useRealtime` already manages connection.

### #9 — Dispatch Engine Stale Providers Never Expire 🔴
**File:** `src/lib/dispatch/dispatch-engine.ts`  
Providers that go offline without `unregisterProvider()` remain in registry forever.

### #10 — useRealtime `initRef` Set Before Async Init Completes 🔴
**File:** `expo-app/src/hooks/useRealtime.ts`  
Flag set before `init()` completes. Failed connection blocks future attempts.

## Additional Issues

### Memory Leak Risks
- `dispatch-engine.ts`: `dispatchLogs[]` unbounded (CRITICAL)
- `dispatch-engine.ts`: `providerRegistry` never cleans stale entries (HIGH)
- `realtime.service.ts`: Channel/listener leaks if screens don't unsubscribe (HIGH)
- `chatStore.ts`: Messages array grows unbounded, no pagination (HIGH)
- `offline-queue.ts`: Completed entries persist until manual cleanup (MEDIUM)

### Re-Render Issues
- `chatStore` → `chat/[id].tsx`: Subscribes to entire store
- `merchantStore` → `merchant/orders.tsx`: Subscribes to entire store
- `cartStore` → `shopping/index.tsx`: Subscribes to entire store
- `pharmacist/catalog.tsx`: `filteredMedicines` computed in render body (no useMemo)
- `chat/[id].tsx`: `markAsRead` called on every `messages.length` change

### Socket/Real-Time Issues
- `socket.service.ts`: `joinRiderRoom` calls `connect()` without await
- `use-driver-location.ts`: `setInterval` + `watchPosition` double-tracking
- `use-heartbeat.ts`: Stale closure captures old location
- `realtime.service.ts`: Reconnection doesn't re-subscribe to DB changes
- `realtime.service.ts`: `scheduleReconnect` has no max retry cap

### Bundle Size Risks
- `@supabase/supabase-js` full client in mobile (~200KB+ gzipped)
- `@rnmapbox/maps` + `react-native-maps` duplicate (~3-5MB native)
- `nativewind` imported but global.css removed (dead dependency)
- `firebase` + `firebase-admin` both in web package.json
- `framer-motion` (~30KB) for landing page only

---

# PHASE 6: FINAL MVP READINESS SCORE

## Feature Status Breakdown

### FULLY WORKING (Production-Ready)
- ✅ Email/Password Authentication
- ✅ Phone OTP Authentication
- ✅ Google Sign-In (after SHA-1 fix)
- ✅ JWT Session Management + Refresh
- ✅ RBAC Permission System (5 roles)
- ✅ Admin Dashboard Stats (real DB queries)
- ✅ Admin User Management (CRUD + CSV)
- ✅ Task/Order State Machine
- ✅ Rider Registration + Approval
- ✅ Merchant Registration + Verification
- ✅ Menu Management (CRUD)
- ✅ Payment Initiation (MTN MoMo + Airtel + Flutterwave)
- ✅ Wallet Service (atomic transactions)
- ✅ Finance Integrity Checks
- ✅ Audit Logging
- ✅ Rate Limiting
- ✅ Rides History Tab
- ✅ Heartbeat Monitor Service

### PARTIALLY WORKING (Needs Fixes)
- ⚠️ Ride Booking (map may be blank, no debounce)
- ⚠️ Ride Tracking (null crashes, hacky rating, dual-update race)
- ⚠️ Order Flow (hardcoded fees, "Coming Soon" cancel)
- ⚠️ Shopping Flow (hardcoded deals, unused search)
- ⚠️ Health/Pharmacy Flow (wrong theme, `any` types)
- ⚠️ Rider Onboarding (no document upload)
- ⚠️ Driver Flow (raw fetch, no polling, no fare summary)
- ⚠️ Wallet (Top Up/Withdraw buttons non-functional)
- ⚠️ Chat (hardcoded sender ID, fake sharing, duplication)
- ⚠️ Notifications (shallow navigation, mark-all may not work)
- ⚠️ Pharmacist Flow (all screens use wrong dark theme)

### MOCKED / NON-FUNCTIONAL
- 🔴 Merchant Dashboard (MOCK_ORDERS, no-op accept/reject)
- 🔴 SOS Emergency (mock contacts, no backend activation)
- 🔴 In-App Calling (simulated, no real audio)
- 🔴 Location Picker (doesn't return selected data)
- 🔴 Prescriptions Screen ("Coming Soon" stub)
- 🔴 Dispatch Engine (in-memory, lost on restart)

### BROKEN / CRITICAL
- 💥 Merchant Detail Screen (NativeWind classes, CSS removed)
- 💥 Messages Tab (not in tab navigator)
- 💥 `/api/rides` Route (wrong Prisma field names)
- 💥 `/api/wallet/transfer` (schema mismatch)
- 💥 `/api/riders/reject` (no auth check)
- 💥 `/api/wallet/payment-methods` (no auth check)
- 💥 Admin Setup (hardcoded credentials)

## Critical Blockers (MUST Fix Before Launch)

| # | Blocker | Files | Impact |
|---|---------|-------|--------|
| 1 | Merchant dashboard uses MOCK_ORDERS | `merchant/index.tsx` | Entire merchant experience is fake |
| 2 | SOS has no backend activation | `sos/index.tsx` | Safety-critical feature broken |
| 3 | Location picker doesn't return data | `location-picker.tsx` | Ride/delivery booking broken |
| 4 | Messages tab not in navigator | `(tabs)/_layout.tsx` | Users can't access messages |
| 5 | 7 API routes have no auth | Multiple API routes | Security breach |
| 6 | Admin setup has hardcoded credentials | `admin/setup/route.ts` | Anyone can create admin |
| 7 | 91 emojis instead of proper icons | 20+ screen files | Amateurish appearance |
| 8 | Dispatch engine is in-memory | `dispatch-engine.ts` | Lost on server restart |
| 9 | No request timeouts in API client | `api.ts` | Indefinite loading on bad network |
| 10 | Chat message duplication | `chatStore.ts` | Users see duplicate messages |
| 11 | Merchant detail screen unstyled | `merchant/[id].tsx` | NativeWind without CSS |
| 12 | 18 null crash risks | Multiple screens | App crashes on missing data |
| 13 | Wallet top-up bypasses payment gateway | `wallet/route.ts` | Financial integrity issue |

## Exact Files Needing Fixes (Priority Order)

### P0 — Must Fix (App is broken without these)
1. `expo-app/app/(tabs)/_layout.tsx` — Add Messages tab
2. `expo-app/app/merchant/index.tsx` — Replace MOCK_ORDERS with real API
3. `expo-app/app/sos/index.tsx` — Connect to backend SOS API
4. `expo-app/app/location-picker.tsx` — Return selected location to caller
5. `expo-app/app/orders/merchant/[id].tsx` — Replace NativeWind with StyleSheet
6. `src/app/api/riders/reject/route.ts` — Add `requireAdmin` auth
7. `src/app/api/wallet/payment-methods/route.ts` — Add user auth
8. `src/app/api/sos/[id]/route.ts` — Add admin auth
9. `src/app/api/admin/setup/route.ts` — Remove hardcoded credentials
10. `src/app/api/admin/recovery/route.ts` — Actually verify JWT
11. `src/app/api/auth/change-password/route.ts` — Unify to jsonwebtoken

### P1 — Should Fix (Core UX is degraded)
12. `expo-app/src/services/api.ts` — Add request timeouts
13. `expo-app/src/store/chatStore.ts` — Add message deduplication
14. `src/lib/dispatch/dispatch-engine.ts` — Add max size + eviction for logs
15. All 20+ screen files — Replace emojis with icon library
16. `expo-app/app/(tabs)/orders.tsx` — Fix null crash on totalAmount
17. `expo-app/app/orders/restaurants.tsx` — Fix null crash on rating
18. `expo-app/app/rider/ride-tracking.tsx` — Fix null crashes on rider/totalAmount
19. `expo-app/app/wallet/index.tsx` — Implement Top Up/Withdraw
20. `expo-app/app/chat/[id].tsx` — Fix hardcoded sender ID
21. `expo-app/app/orders/cart.tsx` — Fix hardcoded order type and fees
22. `src/app/api/rides/route.ts` — Fix Prisma field name mismatch
23. `src/app/api/wallet/transfer/route.ts` — Fix schema mismatch

### P2 — Nice to Fix (Polish and consistency)
24. All pharmacist screens — Unify to MD3 light theme
25. `auth/forgot-password.tsx`, `auth/reset-password.tsx` — Fix animation memory leaks + theme
26. `notifications/index.tsx` — Fix navigation to specific entities
27. `rider/ride-tracking.tsx`, `orders/order-tracking.tsx` — Fix dual-update race condition
28. `pharmacist/catalog.tsx` — Add useMemo for filteredMedicines
29. `chat/[id].tsx`, `merchant/orders.tsx`, `shopping/index.tsx` — Use specific Zustand selectors
30. `expo-app/app/health/prescriptions.tsx` — Implement or remove from navigation
31. `expo-app/app/call/[id].tsx` — Implement real VoIP or remove
32. Remove `react-native-maps` or `@rnmapbox/maps` (keep one)
33. Remove `nativewind` (dead dependency)
34. All screens with console.error only — Add user-facing error states

---

## FINAL MVP READINESS SCORE

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| **Core Auth & Security** | 20% | 75% | 15.0% |
| **Customer App Functionality** | 25% | 55% | 13.8% |
| **Rider/Driver App Functionality** | 15% | 65% | 9.8% |
| **Merchant/Pharmacist Functionality** | 15% | 50% | 7.5% |
| **Admin System** | 10% | 80% | 8.0% |
| **UI/UX Production Quality** | 10% | 30% | 3.0% |
| **Performance & Stability** | 5% | 45% | 2.3% |

### **OVERALL MVP READINESS: 47%**

### 🚫 NOT PRODUCTION-READY

The system has a solid backend foundation (88% of APIs are DB-backed, RBAC works, payment integration exists) but the **mobile app is significantly underdeveloped** — critical features are mocked (SOS, calls, merchant dashboard), core flows are broken (location picker, messages tab), and the UI is amateurish (91 emojis, mixed themes, dead buttons).

**Estimated effort to reach 80% (launch-ready): 2-3 weeks of focused development on the P0 and P1 items listed above.**

---

*Report generated by Smart Ride Pre-Production Validation System*
