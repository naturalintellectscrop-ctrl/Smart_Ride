# Smart Ride — Production Customer Journey Audit

**Date**: 2025-03-04  
**Scope**: 15 end-to-end customer flows from registration to service completion  
**Method**: Code-level trace of every screen, API, socket event, and data flow  

---

## Executive Summary

| Status | Count | Flows |
|--------|-------|-------|
| **FAIL** | 6 | Email Registration, Google Sign-In, Logout & Re-login, Rider Receives Request, Food Ordering, Cart Checkout, Rider Workflow |
| **CONDITIONAL** | 8 | OTP Verification, Email Login, Request Ride, Rider Accepts Request, Live Tracking, Ride Completion, Order Tracking, Parcel Delivery |
| **PASS** | 0 | — |

**No customer journey passes unconditionally.** The app has 6 hard-blocked flows and 8 partially working flows. The root causes cluster into 5 systemic issues that, once fixed, will resolve most blockers simultaneously.

---

## Systemic Root Causes (Fix These First)

| # | Issue | Affected Flows | Impact |
|---|-------|----------------|--------|
| S1 | **Missing API methods in `api.ts`** | 11, 12, 15 | 5 methods undefined → TypeError crashes |
| S2 | **Driver socket never initialized** | 7, 8, 9, 15 | Drivers can never receive requests |
| S3 | **Dual refresh token storage** | 1, 3, 4, 5 | Register/Google users can't refresh tokens |
| S4 | **Socket event name mismatches** | 9, 13 | Real-time updates never reach client |
| S5 | **Payment method enum mismatch** | 6, 12, 14 | All non-CASH payments fail at server |

---

## Detailed Flow Reports

---

### FLOW 1: Email Registration

**Classification: ❌ FAIL**

| Aspect | Details |
|--------|---------|
| **Screens** | `app/index.tsx` → `app/auth/register.tsx` → `app/(tabs)/index.tsx` |
| **APIs** | `POST /api/auth/register` |
| **Socket** | None |

**Data Flow:**
1. User fills name, email, phone, password on register screen
2. Frontend validates: name required, email regex, phone required, password ≥ 6 chars, passwords match
3. Calls `registerUser()` → `POST /api/auth/register`
4. Backend validates via Zod: password ≥ 8 + uppercase + lowercase + number
5. Creates User + stores refreshToken in `User.refreshToken` (old pattern, NOT Session table)
6. Returns `{ accessToken }` as HTTP-only cookie for refreshToken (mobile can't read)

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B1 | 🔴 CRITICAL | Password validation mismatch: frontend ≥6 chars, backend ≥8 + complexity. Users get confusing rejections |
| B2 | 🔴 CRITICAL | No Session record created; uses old `User.refreshToken` pattern. Session-based checks fail |
| B3 | 🔴 CRITICAL | refreshToken only in HTTP-only cookie; mobile apps can't read it → token refresh impossible after registration |

---

### FLOW 2: OTP Verification

**Classification: ⚠️ CONDITIONAL**

| Aspect | Details |
|--------|---------|
| **Screens** | `app/auth/phone-login.tsx` → `app/auth/verify-otp.tsx` |
| **APIs** | `POST /api/auth/send-otp`, `POST /api/auth/verify-otp` |
| **Socket** | None |

**Data Flow:**
1. User enters Uganda phone (validated by regex `^(\+256|0)(7\d|4\d)\d{7}$`)
2. Frontend normalizes phone (0XXX → +256XXX)
3. Backend generates 6-digit OTP, hashes with bcrypt, stores in OTP table
4. Attempts SMS via Africa's Talking (requires env config)
5. User enters OTP → backend validates against hash → creates Session → returns tokens

**Conditions for PASS:**
- `SMS_ENABLED=true` + `AFRICASTALKING_API_KEY` + `AFRICASTALKING_USERNAME` configured, OR
- Development mode with `ALLOW_OTP_IN_RESPONSE=true`

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B4 | 🔴 CRITICAL | SMS not functional without provider config. In production without env vars, users never receive OTP |
| B5 | 🟡 HIGH | Development-only OTP exposure requires `ALLOW_OTP_IN_RESPONSE=true` flag |
| B6 | 🟡 MEDIUM | Unstable device ID: `'mobile-' + Date.now()` prevents proper session tracking |

---

### FLOW 3: Email Login

**Classification: ⚠️ CONDITIONAL**

| Aspect | Details |
|--------|---------|
| **Screens** | `app/auth/login.tsx` → `app/(tabs)/index.tsx` |
| **APIs** | `POST /api/auth/login` |
| **Socket** | None |

**Data Flow:**
1. User enters email + password
2. Backend rate-limits (5 attempts/15 min), validates, finds User, checks ACTIVE, verifies bcrypt
3. Calls `createSession()` → generates JWT access + random refresh → stores in Session table ✓
4. Returns tokens in response body + HTTP-only cookie
5. Frontend saves to AsyncStorage + syncs authStore

**Conditions for PASS:**
- Works until access token expires (7 days default)
- Needs automatic token refresh for long sessions

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B7 | 🟡 MEDIUM | No automatic token refresh interceptor in `api.ts`. When accessToken expires, all API calls fail with 401 |
| B8 | 🟡 MEDIUM | Redundant auth store sync: `loginWithEmail()` already syncs, then screen does it again |
| B9 | 🟢 LOW | Device info missing from login call (no `deviceId`, `deviceName`) |

---

### FLOW 4: Google Sign-In

**Classification: ❌ FAIL**

| Aspect | Details |
|--------|---------|
| **Screens** | `app/auth/register.tsx` or `app/auth/login.tsx` → `app/(tabs)/index.tsx` |
| **APIs** | `POST /api/auth/google` |
| **Socket** | None |

**Data Flow:**
1. `GoogleSignin.configure()` called in `_layout.tsx` with webClientId
2. User taps Google button → `GoogleSignin.signIn()` → gets `idToken`
3. Frontend sends `idToken` via raw `fetch()` to `POST /api/auth/google` (NOT using `services/auth.ts` `loginWithGoogle()` — dead code)
4. Backend verifies token via Google's tokeninfo endpoint
5. Finds or creates User → stores refreshToken in `User.refreshToken` (NOT Session table)
6. Returns inconsistent format: `{ success, user, tokens }` (vs email's `{ success, data: { ... } }`)

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B10 | 🔴 CRITICAL | No Session record created; uses old `User.refreshToken` pattern |
| B11 | 🔴 CRITICAL | No Google token audience verification. `data.aud` not checked against app client ID — tokens from other apps could be accepted |
| B12 | 🟡 HIGH | Inconsistent response format between Google and email endpoints |
| B13 | 🟡 MEDIUM | No audit logging (email login logs LOGIN_SUCCESS/FAILED) |
| B14 | 🟢 LOW | `loginWithGoogle()` in `services/auth.ts` is dead code — never called |

---

### FLOW 5: Logout and Login Again

**Classification: ❌ FAIL**

| Aspect | Details |
|--------|---------|
| **Screens** | `app/(tabs)/profile.tsx` → `app/index.tsx` → `app/auth/login.tsx` |
| **APIs** | `POST /api/auth/logout`, then `POST /api/auth/login` |
| **Socket** | None |

**Data Flow:**
1. User taps "Sign Out" on profile → confirmation Alert
2. Calls `api.logout()` → `POST /api/auth/logout`
3. Backend: `logoutUser(userId)` sets `User.refreshToken = null` + `refreshTokenExpiresAt = null`
4. Clears HTTP-only cookie → returns success
5. Frontend clears AsyncStorage + authStore → navigates to splash

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B15 | 🔴 CRITICAL | Session records NOT revoked on logout. Only `User.refreshToken` nulled. If user logged in via email/OTP (Session record exists), the Session remains `revoked: false`. Old refresh token could be replayed |
| B16 | 🟡 MEDIUM | If access token already expired when logout attempted, `getAuthUser()` returns null → `logoutUser()` never called → refresh token survives |

---

### FLOW 6: Request Ride

**Classification: ⚠️ CONDITIONAL**

| Aspect | Details |
|--------|---------|
| **Screens** | `app/(tabs)/index.tsx` → `app/rider/ride-request.tsx` → `app/rider/ride-tracking.tsx` |
| **APIs** | `POST /api/tasks`, `GET /api/mapbox/geocoding` |
| **Socket** | `task:join` (client→server after redirect) |

**Data Flow:**
1. User taps Ride/Book → navigates to ride-request with type (BODA/CAR)
2. 3-step wizard: Pickup → Dropoff → Confirm
3. Pickup: uses current location from store or searches via Mapbox geocoding
4. Dropoff: searches via Mapbox geocoding
5. Fare calculated client-side using Haversine (straight-line) + constant perKm rate
6. Confirms → `POST /api/tasks` → creates task + auto-dispatches asynchronously
7. Redirects to ride-tracking screen

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B17 | 🔴 CRITICAL | Fare is straight-line distance only, not road distance. No call to route engine or pricing API. Fare could be significantly underestimated |
| B18 | 🟡 HIGH | `api.cancelTask()` calls `POST /tasks/{id}/cancel` but server expects `POST /tasks/{id}?action=cancel` or `POST /tasks/{id}/transition`. Cancel is broken |
| B19 | 🟡 HIGH | Payment method enum mismatch: client sends `MTN_MOMO`/`AIRTEL_MONEY`, server expects `MOBILE_MONEY_MTN`/`MOBILE_MONEY_AIRTEL` |
| B20 | 🟡 MEDIUM | Location-picker screen exists but is never navigated to from ride-request |
| B21 | 🟢 LOW | Phone number for mobile money collected but never sent to server |

---

### FLOW 7: Rider Receives Request

**Classification: ❌ FAIL**

| Aspect | Details |
|--------|---------|
| **Screens** | `app/driver/index.tsx` |
| **APIs** | `GET /api/riders/profile`, `POST /api/riders/status`, `POST /api/rider/heartbeat` |
| **Socket** | `driver:request` (server→client), `driver:join` (client→server — **NEVER CALLED**) |

**Data Flow:**
1. Driver opens app → loads rider profile
2. Toggles online → starts location watch + heartbeat every 5s
3. **Socket is NEVER initialized** on driver home screen
4. `socketService.on('driver:request', ...)` registers listener but `socketService.connect()` is never called
5. Driver never joins their room via `driver:join`
6. **Dispatch events never reach the driver**

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B22 | 🔴 CRITICAL | Socket never initialized on driver home screen. `socketService.connect()` is never called. Driver CANNOT receive ride requests |
| B23 | 🔴 CRITICAL | `socketService.joinDriverRoom(driverId)` is never called. Server cannot route dispatch events to this rider |
| B24 | 🟡 HIGH | Dual dispatch system confusion: in-memory dispatch-engine (port 3003) vs DB-backed DispatchService. Different event names, different logic |
| B25 | 🟡 MEDIUM | Heartbeat endpoint `POST /api/rider/heartbeat` may not exist as an HTTP route (heartbeat-monitor uses WebSocket) |

**This is the single most critical blocker.** Without it, the entire ride-hailing service is non-functional.

---

### FLOW 8: Rider Accepts Request

**Classification: ⚠️ CONDITIONAL** (depends on Flow 7 fix)

| Aspect | Details |
|--------|---------|
| **Screens** | `app/driver/index.tsx` → `app/driver/driver-task.tsx` |
| **APIs** | `POST /api/dispatch/{matchId}/accept`, fallback `POST /api/tasks/{taskId}/transition` |
| **Socket** | `rider:task:matched` (server→client), `task:status:update` (server→client) |

**Data Flow:**
1. Driver taps Accept → `handleAcceptRequest()`
2. First tries: `POST /dispatch/{matchId}/accept` (if matchId available)
3. Falls back to: `POST /tasks/{taskId}/transition` with `toStatus: 'ACCEPTED'`
4. On success → navigates to driver-task screen

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B26 | 🔴 CRITICAL | Depends on Flow 7 fix. If driver never receives request, can't accept |
| B27 | 🟡 HIGH | `matchId` may be missing from incoming request socket payload. Type-cast as `any` indicates fragility |
| B28 | 🟡 MEDIUM | `socketService.acceptRequest()` emits `driver:request:accept` but realtime service doesn't handle it |
| B29 | 🟢 LOW | Race condition possible with multiple drivers accepting same match |

---

### FLOW 9: Live Tracking

**Classification: ⚠️ CONDITIONAL**

| Aspect | Details |
|--------|---------|
| **Screens** | `app/rider/ride-tracking.tsx`, `app/driver/driver-task.tsx` |
| **APIs** | `GET /api/tasks/{taskId}` (polling every 3-10s) |
| **Socket** | `task:join`, `task:status:update`, `rider:location:update`, `driver:location:update` |

**Data Flow:**
1. Client arrives at ride-tracking with taskId
2. **Polling starts immediately** (3s active, 10s searching) as PRIMARY mechanism ✓
3. Socket connection attempted as secondary
4. Client listens for `task:status` — but server emits `task:status:update` ❌
5. Client listens for `location:update` — but server emits `rider:location:update` ❌
6. Driver sends location via `driver:location:update`
7. Server relays to task room as `rider:location:update`

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B30 | 🔴 CRITICAL | Socket event name mismatch: client listens `task:status`, server emits `task:status:update`. Status updates via socket NEVER fire |
| B31 | 🔴 CRITICAL | Socket event name mismatch: client listens `location:update`, server emits `rider:location:update`. Driver location via socket NEVER updates |
| B32 | 🟡 HIGH | No ETA display — `/api/eta` endpoint exists but is never called |
| B33 | 🟡 MEDIUM | Polling gets driver location from DB (heartbeat-persisted), not live GPS. Delayed by heartbeat interval |
| B34 | 🟢 LOW | Map uses react-native-maps; no Google Maps API key configured for Android |

---

### FLOW 10: Ride Completion

**Classification: ⚠️ CONDITIONAL**

| Aspect | Details |
|--------|---------|
| **Screens** | `app/driver/driver-task.tsx`, `app/rider/ride-tracking.tsx` |
| **APIs** | `POST /api/tasks/{taskId}/transition` (multiple calls) |
| **Socket** | `task:status:update` (server→client) |

**Data Flow:**
1. Driver advances status: ASSIGNED → ACCEPTED → ARRIVED → PICKED_UP → IN_TRANSIT → DELIVERED → COMPLETED
2. Each step: `POST /tasks/{id}/transition` → state machine validates → updates DB → emits socket
3. On COMPLETED: state machine clears rider's currentTaskId, creates finance ledger entry
4. Client polling detects COMPLETED → shows Alert with fare summary

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B35 | 🟡 HIGH | No rating screen exists. Alert has "Rate Driver" button but navigates to home. No rating UI or API call |
| B36 | 🟡 HIGH | No payment processing for mobile money. `paymentStatus` stays PENDING. No MoMo/Airtel API integration |
| B37 | 🟡 MEDIUM | Auto-arrive bug: for ACCEPTED status, button opens navigation AND simultaneously transitions to ARRIVED |
| B38 | 🟡 MEDIUM | DELIVERED status used for rides (semantically wrong for passenger rides) |
| B39 | 🟢 LOW | `paymentDetails` only from `?action=complete` endpoint, not from polling response |

---

### FLOW 11: Food Ordering

**Classification: ❌ FAIL**

| Aspect | Details |
|--------|---------|
| **Screens** | `app/orders/restaurants.tsx` → `app/orders/merchant/[id].tsx` |
| **APIs** | `GET /api/merchants?type=RESTAURANT`, `GET /api/merchants/{id}`, `GET /api/merchants/{id}/products` |
| **Socket** | None |

**Data Flow:**
1. User opens Restaurants → loads merchants by type
2. Search/filter is client-side only
3. Taps merchant → loads merchant detail + products
4. Taps "+" → adds to local cart (Zustand + AsyncStorage)

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B40 | 🔴 CRITICAL | `api.getMerchantProducts(id)` calls `GET /merchants/{id}/products` but backend only has `GET /merchants/{id}/menu`. Returns 404 — menu cannot load |
| B41 | 🟡 MEDIUM | Category filter chips are non-functional — `filterMerchants()` only uses `searchQuery`, not `selectedCategory` |
| B42 | 🟡 MEDIUM | Cart is client-side only. Backend `cart-service.ts` with validation never called. No price/availability checks |
| B43 | 🟢 LOW | No server-side category grouping for menu items |

---

### FLOW 12: Cart Checkout

**Classification: ❌ FAIL**

| Aspect | Details |
|--------|---------|
| **Screens** | `app/orders/cart.tsx` → `app/orders/order-tracking.tsx` |
| **APIs** | `POST /api/orders` |
| **Socket** | None |

**Data Flow:**
1. Cart screen reads from `useCartStore` (local)
2. User adjusts quantities, selects payment method
3. Taps "Place Order" → `api.placeOrder()` → `POST /orders`
4. On success → clear cart + redirect to order-tracking

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B44 | 🔴 CRITICAL | Payment method enum mismatch: client `MTN_MOMO`/`AIRTEL_MONEY` vs server `MOBILE_MONEY_MTN`/`MOBILE_MONEY_AIRTEL`. Zod validation fails → 400 |
| B45 | 🔴 CRITICAL | Order item field name mismatch: client sends `name`/`price`, server expects `itemName`/`unitPrice`. Zod validation fails → 400 |
| B46 | 🔴 CRITICAL | No payment initiation after order creation. For non-CASH, no `POST /payments/initiate` called |
| B47 | 🟡 HIGH | No Task created for food delivery dispatch. Order exists but no rider is assigned |
| B48 | 🟡 MEDIUM | Missing `subtotal` field that backend schema requires |
| B49 | 🟡 MEDIUM | Delivery fee hardcoded (3000 UGX) — no server-side calculation |
| B50 | 🟢 LOW | Phone number for mobile money collected but never sent |

---

### FLOW 13: Order Tracking

**Classification: ⚠️ CONDITIONAL**

| Aspect | Details |
|--------|---------|
| **Screens** | `app/orders/order-tracking.tsx` |
| **APIs** | `GET /api/orders/{id}` (polling every 5s) |
| **Socket** | `order:status:update` (server→client — **never fires**) |

**Data Flow:**
1. Screen loads → fetches order + starts polling
2. Socket listens for `order:status:update` — server emits `task:status:update` ❌
3. UI renders 6-step progress: ORDER_CREATED → MERCHANT_ACCEPTED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B51 | 🟡 HIGH | Socket event name mismatch: listens `order:status:update`, server emits `task:status:update`. Only polling works |
| B52 | 🟡 HIGH | No task-to-order bridge. Order tracking can't subscribe to Task events without `taskId` |
| B53 | 🟡 HIGH | Order status vs Task status values don't align |
| B54 | 🟡 MEDIUM | "Contact Driver" and "Cancel Order" show "Coming Soon" |
| B55 | 🟡 MEDIUM | No driver location on map — only destination marker shown |
| B56 | 🟢 LOW | Socket never joins a room — even with correct event name, server wouldn't know which client to update |

---

### FLOW 14: Parcel Delivery

**Classification: ⚠️ CONDITIONAL**

| Aspect | Details |
|--------|---------|
| **Screens** | `app/delivery/index.tsx` → `app/rider/ride-tracking.tsx` |
| **APIs** | `GET /api/mapbox/geocoding`, `POST /api/tasks` |
| **Socket** | Inherits from ride-tracking screen |

**Data Flow:**
1. 3-step flow: Type → Locations → Confirm
2. Pickup: current location or search via Mapbox geocoding
3. Dropoff: search via Mapbox geocoding
4. Fare calculated client-side with hardcoded delivery rates
5. Submits as `POST /api/tasks` with `taskType: 'ITEM_DELIVERY'`
6. Redirects to ride-tracking with taskId

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B57 | 🟡 MEDIUM | Fare may mismatch server pricing — hardcoded constants vs server `calculatePricing()` |
| B58 | 🟡 MEDIUM | `deliveryType` field sent but not in backend Zod schema — silently stripped |
| B59 | 🟡 MEDIUM | Phone number for mobile money collected but not sent |
| B60 | 🟢 LOW | Pickup address falls back to 'Current Location' string if reverse geocode fails |

---

### FLOW 15: Rider Workflow

**Classification: ❌ FAIL**

| Aspect | Details |
|--------|---------|
| **Screens** | `app/rider/onboarding.tsx`, `app/driver/index.tsx`, `app/driver/driver-task.tsx`, `app/rider/earnings.tsx`, `app/rider/wallet.tsx` |
| **APIs** | 15+ endpoints (many missing from `api.ts`) |
| **Socket** | `driver:join`, `driver:request`, `driver:location:update`, `task:join` |

**Data Flow:**
1. Onboarding: 4-step registration → `api.getRiderOnboarding()`, `api.updateRiderOnboarding()`, `api.registerRider()`
2. Go online: toggle + location watch + heartbeat
3. Receive requests via socket (NEVER connects)
4. Accept/reject → navigate to task
5. Execute task: status transitions
6. View earnings: `api.getRiderEarnings()`
7. Withdraw: `api.requestRiderWithdrawal()`

**Blockers:**
| # | Severity | Issue |
|---|----------|-------|
| B61 | 🔴 CRITICAL | 5 API methods missing from `api.ts`: `getRiderOnboarding()`, `updateRiderOnboarding()`, `registerRider()`, `getRiderEarnings()`, `requestRiderWithdrawal()`. All throw TypeError |
| B62 | 🔴 CRITICAL | Socket never initialized on driver home — same as Flow 7. Driver never joins room, never receives requests |
| B63 | 🟡 HIGH | Dual withdrawal paths: earnings.tsx uses non-existent method, wallet.tsx uses existing `api.requestWithdrawal()` |
| B64 | 🟡 MEDIUM | Task status flow has redundant step (driver must accept dispatch AND transition task) |
| B65 | 🟡 MEDIUM | Heartbeat errors silently swallowed `.catch(() => {})` |

---

## Consolidated Blocker Registry

### 🔴 CRITICAL (Must Fix Before Any Production Use)

| ID | Blocker | Fix | Affected Flows |
|----|---------|-----|----------------|
| B22/B23 | Driver socket never initialized | Add `socketService.connect()` + `joinDriverRoom()` to driver home | 7, 8, 15 |
| B61 | 5 missing API methods in api.ts | Add `getRiderOnboarding`, `updateRiderOnboarding`, `registerRider`, `getRiderEarnings`, `requestRiderWithdrawal` | 15 |
| B40 | getMerchantProducts hits 404 | Change endpoint from `/merchants/{id}/products` to `/merchants/{id}/menu` | 11 |
| B1 | Password validation mismatch | Align frontend with backend: ≥8 + uppercase + lowercase + number | 1 |
| B2/B3 | Registration uses old token pattern | Use `createSession()` in register route; return refreshToken in body | 1, 5 |
| B10 | Google auth uses old token pattern | Use `createSession()` in Google auth route | 4 |
| B15 | Sessions not revoked on logout | Call `revokeAllSessions(userId)` in logout route | 5 |
| B11 | No Google token audience check | Verify `data.aud` matches `GOOGLE_CLIENT_IDS.webClientId` | 4 |
| B30/B31 | Socket event name mismatches | Fix client listeners: `task:status` → `task:status:update`, `location:update` → `rider:location:update` | 9 |
| B44/B45 | Payment enum + field name mismatch | Map `MTN_MOMO` → `MOBILE_MONEY_MTN`; `name` → `itemName`, `price` → `unitPrice` | 12 |

### 🟡 HIGH (Fix Before Launch)

| ID | Blocker | Fix | Affected Flows |
|----|---------|-----|----------------|
| B4 | SMS not configured for OTP | Set `SMS_ENABLED`, `AFRICASTALKING_API_KEY`, `AFRICASTALKING_USERNAME` | 2 |
| B7 | No auto token refresh | Add 401 interceptor in api.ts that calls `refreshAccessToken()` | 3, 5 |
| B17 | Fare is straight-line only | Call `/api/pricing` or `/api/route` for road distance | 6 |
| B18 | Cancel API URL mismatch | Fix `cancelTask()` to use correct URL | 6 |
| B19 | Payment enum mismatch (rides) | Map `MTN_MOMO` → `MOBILE_MONEY_MTN` etc. | 6, 14 |
| B26 | Accept depends on Flow 7 fix | Fix Flow 7 first | 8 |
| B27 | matchId may be missing | Include matchId in socket dispatch payload | 8 |
| B35 | No rating screen | Build rating UI + API call | 10 |
| B36 | No payment processing | Integrate MTN MoMo/Airtel Money APIs | 10, 12 |
| B37 | Auto-arrive bug | Separate navigation and status transition | 10 |
| B42 | Cart is client-side only | Call backend cart service for validation | 11 |
| B46 | No payment initiation | Call `POST /payments/initiate` after order | 12 |
| B47 | No task created for food delivery | Auto-create Task on Order creation | 12, 13 |
| B51/B52 | Order tracking socket broken | Fix event names + add order→task bridge | 13 |

### 🟢 MEDIUM/LOW (Fix Before Scale)

| ID | Blocker | Fix |
|----|---------|-----|
| B6 | Unstable device ID | Use persistent device identifier |
| B8 | Redundant auth store sync | Remove duplicate sync in login.tsx |
| B12 | Inconsistent API response format | Standardize all auth endpoints |
| B13 | No audit logging for Google auth | Add security audit log |
| B24 | Dual dispatch system | Consolidate to DB-backed dispatch |
| B32 | No ETA display | Call `/api/eta` endpoint |
| B38 | DELIVERED status for rides | Use COMPLETED directly from IN_TRANSIT |
| B41 | Category filter non-functional | Add category to filter logic |
| B48 | Missing subtotal in order | Calculate and send subtotal |
| B49 | Hardcoded delivery fee | Use server-side pricing |
| B54/B55 | Cancel/Contact driver unimplemented | Implement or remove buttons |
| B57 | Fare mismatch (delivery) | Use server-side pricing |
| B63 | Dual withdrawal paths | Consolidate to one |
| B64 | Redundant accept step | Simplify driver workflow |

---

## Recommended Fix Priority

### Phase 1: Make Core Ride Flow Work (Flows 1-10)
1. **Fix driver socket initialization** (B22/B23) — Without this, rides are impossible
2. **Fix socket event name mismatches** (B30/B31) — Without this, real-time tracking is broken
3. **Unify refresh token storage** (B2/B3/B10) — Use `createSession()` everywhere
4. **Fix password validation** (B1) — Align frontend with backend
5. **Revoke sessions on logout** (B15)
6. **Add Google audience verification** (B11)
7. **Fix payment method enums** (B19/B44)
8. **Fix cancelTask API URL** (B18)
9. **Add auto token refresh** (B7)

### Phase 2: Make Food Delivery Work (Flows 11-13)
10. **Fix merchant menu endpoint** (B40)
11. **Fix order item field names** (B45)
12. **Create Task on Order** (B47)
13. **Add payment initiation** (B46)
14. **Fix order tracking socket** (B51/B52)

### Phase 3: Make Rider Onboarding Work (Flow 15)
15. **Add missing API methods** (B61)
16. **Fix rider onboarding flow**
17. **Consolidate withdrawal paths** (B63)

### Phase 4: Polish & Production Readiness
18. **Configure SMS provider** (B4)
19. **Add rating system** (B35)
20. **Integrate payment gateways** (B36)
21. **Use server-side pricing** (B17/B57)
22. **Add ETA display** (B32)
23. **Build receipt/invoice generation**

---

## Summary Scorecard

| Flow | Status | Critical | High | Med/Low |
|------|--------|----------|------|---------|
| 1. Email Registration | ❌ FAIL | 3 | 0 | 0 |
| 2. OTP Verification | ⚠️ CONDITIONAL | 1 | 1 | 1 |
| 3. Email Login | ⚠️ CONDITIONAL | 0 | 0 | 3 |
| 4. Google Sign-In | ❌ FAIL | 2 | 1 | 2 |
| 5. Logout & Re-login | ❌ FAIL | 1 | 1 | 0 |
| 6. Request Ride | ⚠️ CONDITIONAL | 1 | 2 | 2 |
| 7. Rider Receives Request | ❌ FAIL | 2 | 1 | 1 |
| 8. Rider Accepts Request | ⚠️ CONDITIONAL | 1 | 1 | 2 |
| 9. Live Tracking | ⚠️ CONDITIONAL | 2 | 1 | 2 |
| 10. Ride Completion | ⚠️ CONDITIONAL | 0 | 2 | 3 |
| 11. Food Ordering | ❌ FAIL | 1 | 0 | 2 |
| 12. Cart Checkout | ❌ FAIL | 3 | 1 | 2 |
| 13. Order Tracking | ⚠️ CONDITIONAL | 0 | 3 | 3 |
| 14. Parcel Delivery | ⚠️ CONDITIONAL | 0 | 0 | 3 |
| 15. Rider Workflow | ❌ FAIL | 2 | 1 | 2 |
| **TOTAL** | — | **19** | **15** | **26** |

**Bottom line: No customer can currently use Smart Ride end-to-end. The core ride-hailing loop (request → dispatch → accept → track → complete) is broken at the dispatch step because drivers never receive ride requests. Fix Phase 1 first.**
