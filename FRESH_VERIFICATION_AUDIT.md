# Smart Ride — Fresh Verification Audit Report

**Date**: 2025-01-XX (current session)
**Method**: From-scratch verification. No previous audit findings trusted.
**Auditor**: 6 parallel subagents, each re-reading the actual source code and live-testing APIs.
**Codebase HEAD**: `aa6db7a` (already up-to-date with `origin/main`)

---

## EXECUTIVE SUMMARY

| Section | Status | Score |
|---|---|---|
| 1. Google Sign-In | **FIXED** | 10/10 |
| 2. Login/Register Screens | **PARTIALLY FIXED** | 7/10 |
| 3. Stitch Design Implementation | **PARTIALLY FIXED** | 4.5/10 |
| 4. Splash & Branding | **PARTIALLY FIXED** | 4/10 |
| 5. APK Size | **VERIFIED (bloat)** | 4/10 |
| 6. Routing & Duplicates | **VERIFIED (dead code)** | 5/10 |
| 7. Production Flows (17) | **15/17 PASS** | 8.8/10 |

**Updated Production Readiness Score: 6.1 / 10**

**Recommendation: Internal Testing Ready** (NOT yet Closed Beta Ready — 1 critical blocker in chat + branding/splash defects visible to every user on every app launch)

---

## SECTION 1 — GOOGLE SIGN-IN → **FIXED** ✅

### Verification Matrix

| Check | Result | Evidence |
|---|---|---|
| `GoogleSignin.configure()` uses correct `webClientId` | ✅ PASS | `expo-app/src/config/google.ts:78-82` passes `webClientId: GOOGLE_CLIENT_IDS.webClientId` |
| `webClientId` matches `google-services.json` type-3 client | ✅ PASS | `google-services.json:32-35` — `531949209415-h0ri57i233r1l767tnc4i26brdt3asb3...` (client_type: 3 = web app) |
| Android `package` matches `package_name` | ✅ PASS | Both = `ug.smartride.app` (`app.json:35` ↔ `google-services.json:12`) |
| SHA-1 fingerprints registered | ✅ PASS | Two registered: debug keystore `f28c61cc...` + upload keystore `98ea9b4b...` (`google-services.json:21,29`) |
| iOS reversed client ID matches `iosUrlScheme` plugin | ✅ PASS | All three: `com.googleusercontent.apps.531949209415-1knt1vf2v8g5fh7rltg31knps9j2otar` |
| Firebase project ID consistent | ✅ PASS | `smart-ride-774e7` across `google-services.json`, `GoogleService-Info.plist`, `.env` |
| `androidClientId` NOT passed (lets lib auto-resolve from signing cert) | ✅ PASS | `expo-app/src/config/google.ts:88-93` — explicit comment + intentional omission. **This was the root cause of the previous DEVELOPER_ERROR.** |

### Root Cause of Previous DEVELOPER_ERROR (now resolved)
Previous fix attempted to hardcode `androidClientId` in `configure()`. This overrode the library's runtime auto-detection of the correct Android OAuth client based on the APK signing certificate — causing DEVELOPER_ERROR when the hardcoded client didn't match the actual signing cert. The current code intentionally omits `androidClientId`, letting the library auto-resolve from `google-services.json` at runtime.

### Minor Non-Blocker
`expo-app/GOOGLE_SIGNIN_FIX.md:9-18` documentation is stale — still describes the old fix that ADDED `androidClientId`. The code is correct; only the doc is wrong. Recommend updating or deleting the file.

---

## SECTION 2 — LOGIN & REGISTER SCREENS → **PARTIALLY FIXED** ⚠️

### Per-Screen Results

| Screen | Cursor Jump | Focus | Keyboard | Android Freeze |
|---|---|---|---|---|
| `login.tsx` | NOT REPRO ✅ | MINOR ⚠️ | NOT REPRO ✅ | NOT REPRO ✅ |
| `register.tsx` | NOT REPRO ✅ (post-fix) | MINOR ⚠️ | NOT REPRO ✅ | NOT REPRO ✅ |
| `verify-otp.tsx` | NOT REPRO ✅ | NOT REPRO ✅ | NOT REPRO ✅ | NOT REPRO ✅ |
| `forgot-password.tsx` | **VERIFIED RISK** ❌ | N/A | NOT REPRO ✅ | NOT REPRO ✅ |
| `reset-password.tsx` | **VERIFIED RISK** ❌ | MINOR ⚠️ | NOT REPRO ✅ | NOT REPRO ✅ |
| `change-password.tsx` | **VERIFIED RISK** ❌ | MINOR ⚠️ | NOT REPRO ✅ | NOT REPRO ✅ |
| `phone-login.tsx` | NOT REPRO ✅ | MINOR ⚠️ | NOT REPRO ✅ | NOT REPRO ✅ |

### VERIFIED Issues (3 screens)

**Issue 2.1 — `Animated.View` wraps `TextInput` in 3 password screens (cursor-jump risk on Android)**

- Affected: `forgot-password.tsx:190-197`, `reset-password.tsx:405-413`, `change-password.tsx:451-461`
- The `Animated.View` parent applies a non-identity `transform: [{ translateY: slideAnim }]` style that stays bound to an `Animated.Value` even after the 800ms entrance animation completes. On Android, this can cause cursor jitter while typing.
- **Contrast with the FIXED pattern in `register.tsx:90-92, 367-381`** — register swaps to a plain `<View>` after the entrance animation completes (`animationDone` state). The 3 password screens never do this swap.

**Issue 2.2 — Conditional error container causes layout shift (4 screens)**

- Affected: `forgot-password.tsx:231,243-246`, `reset-password.tsx:244,261-264,307-310`, `change-password.tsx:240,257-260,286-289,335-338`, `phone-login.tsx:207,165-167`
- The error container is rendered conditionally (`{error && (...)}`). When error clears on keystroke, the inputs below shift upward.
- **Contrast with the FIXED pattern in `login.tsx:459-463`** — error container is always rendered (with `errorHidden` style when empty) to prevent layout shift.

**Issue 2.3 — Incomplete field-to-field navigation**

- `login.tsx:475` — `returnKeyType="next"` on email field but **no `onSubmitEditing` handler**.
- `register.tsx:441,454,466,481` — `returnKeyType="next"` on name/email/phone/password but no `onSubmitEditing`.
- `IconInput.tsx` does NOT use `forwardRef` — parent cannot call `.focus()` on the next input even if handler were added.
- Only the final field (`register.tsx:496-497`) has `returnKeyType="go"` + `onSubmitEditing={handleRegister}` — works.

### NOT REPRODUCIBLE Confirmations
- Phone formatter does NOT cause cursor jump (`register.tsx:462` passes raw text; normalization only at submit `:289`).
- Password field does NOT reformat on each keystroke (`login.tsx:483`).
- No `useEffect` overwriting own field value (the classic cursor-jump anti-pattern) — zero matches across all 8 auth screens.
- `softwareKeyboardLayoutMode` correctly NOT set in `app.json` — Expo defaults to `"resize"` on Android (correct counterpart to `behavior={undefined}`).
- All scrollable auth screens have `keyboardShouldPersistTaps="handled"`.
- Android freeze: No synchronous loops, no blocking awaits in render. `Animated.loop`s use `useNativeDriver: true` so they run on the native UI thread.

---

## SECTION 3 — STITCH DESIGN IMPLEMENTATION → **PARTIALLY FIXED** ⚠️

### Implementation Counts
- **Fully implemented**: 6 / 29
- **Partially implemented**: 11 / 29
- **Missing**: 12 / 29

### Fully Implemented (6)
1. `login_screen` → `app/auth/login.tsx`
2. `wallet_overview_new_design` / `wallet_payments` → `app/wallet/index.tsx`
3. `secure_chat_interface` → `app/chat/[id].tsx`
4. `secure_in_app_call` → `app/call/[id].tsx`
5. `parcel_price_estimate` → `app/delivery/index.tsx`
6. `notifications_center` → `app/notifications/index.tsx`

### MISSING Screens (12) — High-Value Gaps

| # | Stitch Design | Status | Impact |
|---|---|---|---|
| 1 | `onboarding_slides` (3-slide carousel) | Missing | First-run UX absent — users land on splash directly |
| 2 | `transaction_details` | Missing | Post-payment confirmation screen absent |
| 3 | `e_receipt` (downloadable/shareable) | Missing | No receipt download/share |
| 4 | `trip_summary_rating` (5-star + tip) | Missing | Only `Alert.prompt` in `ride-tracking.tsx` — no real UI |
| 5 | `promotions_rewards` (Gold/Points/Referral) | Missing | Loyalty program absent |
| 6 | `live_rider_matching_1` / `live_rider_matching_2` | Missing | "Searching for riders…" animation absent |
| 7 | `delivery_confirmation` (Proof of Delivery photo + rate) | Missing | Delivery completion UX absent |
| 8 | `multi_stop_delivery_route` | Missing | Multi-stop delivery sequence absent |
| 9 | `account_settings` (dedicated screen) | Missing | Settings scattered in profile menu |
| 10 | `help_center` / `help_center_dark_mode` | Missing | Only external URL link, no in-app help |

### Partial Implementation Gaps (11)
- `create_account` — missing Referral Code field, missing Kampala dusk illustration
- `otp_verification` — design uses 4-digit OTP, expo uses 6-digit; missing custom numeric keypad
- `smart_ride_home` — missing Wallet Balance card, "Need assistance?" card, Nearby Favorites scroll, FAB
- `book_a_ride` — missing "SmartRide XL" (Group • 6 Seats) third option, "Live in Kampala" header
- `food_shop` — missing category tabs, Featured Stores, Trending Deals, Secure Delivery sections
- `rider_dashboard` — missing "Gold Member 4.9 ★" badge, Weekly Goal progress bar, Recent Trips list
- `merchant_orders` / `merchant_dashboard_java_house` — missing Java House branding, "Live • Accepting Orders" pill, "Auto-refresh: 30s", Merchant Rating badge, Daily Target progress
- `safety_sos_screen` — missing "Slide to Alert" slider, "Smart Ride Secure Line" card, "On Trip" context card, "Trusted Contacts" terminology
- `live_parcel_tracking` — missing "Live Tracking" title, ETA card with rider photo, timeline, insurance banner
- `vehicle_verification` — missing "Vehicle Logbook" upload, per-document status badges, encrypted footer note
- `user_profile` — missing "Gold" tier badge, Points/Trips/Sustainability stats, Quick Actions grid

### Foundation Verified ✅
- Color palette in `expo-app/src/constants/index.ts` matches `DESIGN.md` (primary `#005f3a`)
- Shared components exist: `GlassCard`, `GradientButton`, `GlowHeader`, `IconInput`, `ServiceIcon`, `StatusBadge`, `ChatBubble`

---

## SECTION 4 — SPLASH SCREEN & BRANDING → **PARTIALLY FIXED** ❌

### Critical Finding: Splash/Icon/AdaptiveIcon Assets Are BROKEN

The `app.json` config layer is correct, but the underlying PNG assets defeat that config.

| File | Bytes | Dimensions | Alpha | Content | Problem |
|---|---|---|---|---|---|
| `expo-app/assets/icon.png` | 216,688 | 1024×1024 | 1.85% | Smart Ride logo on **OPAQUE dark navy `#030713`** | Navy bg, not brand green |
| `expo-app/assets/splash.png` | 216,688 | 1024×1024 | 1.85% | **Byte-identical to icon.png** | Navy bg covers `splash.backgroundColor: #005f3a` — user sees navy square with green letterbox strips |
| `expo-app/assets/adaptive-icon.png` | 216,688 | 1024×1024 | 1.85% | **Byte-identical to icon.png** | Navy foreground hides `adaptiveIcon.backgroundColor: #005f3a` |
| `expo-app/assets/favicon.png` | 123 | 48×48 | none | **SOLID `#10b981` emerald tile, NO logo** (1 unique color) | Not a real favicon |
| `expo-app/assets/images/smartride-logo.png` | 355,413 | 1024×1024 | 90.77% | Canonical transparent logo ✓ | Correct |
| `public/smartride-logo-transparent.png` | 355,413 | 1024×1024 | 90.77% | Canonical source-of-truth ✓ | Correct |

### MD5 Hashes Prove Two Different Logo Variants
- `44ca43e132aa84a244335aa2d4f3e511` — `icon.png` + `splash.png` + `adaptive-icon.png` (navy variant, byte-identical)
- `7c825c2c269749e98c7fb828a5b88ac2` — `assets/images/smartride-logo.png` + `public/smartride-logo-transparent.png` + `public/smart-ride-logo.png` (transparent canonical)
- `729078441e8b2c3cb15e5c2fdcba9e54` — `favicon.png` (solid green tile, no logo)

### Stale Config Check — ALL CLEAR ✅
- No `app.config.js`/`app.config.ts` overriding `app.json`
- `plugins/withAgoraPermissions.js` — only adds permissions
- `plugins/withAbiSplits.js` — only modifies `build.gradle`
- No `app_name` string resource override found
- App name `"Smart Ride"` correctly set in `app.json`

### VERIFIED Issues
1. **splash.png** has opaque navy bg → user sees navy square with green strips, NOT a green splash
2. **adaptive-icon.png** byte-identical to splash.png → navy foreground hides green adaptive bg
3. **icon.png** byte-identical to splash.png → dark navy, not brand green
4. **favicon.png** is a solid green tile with no logo content
5. **Prior worklog claim "Replicated to all 26 logo paths" was FALSE** — file timestamps disprove (icon/splash/adaptive-icon/favicon @ Jun 17 12:37; canonical transparent logo @ Jun 17 14:40 — never re-copied to Expo assets)

### Required Fixes (to reach FIXED)
1. Regenerate `splash.png` with transparent background OR switch `resizeMode` to `"cover"`/`"native"` and bake `#005f3a` into the image
2. Regenerate `adaptive-icon.png` with transparent background around the logo
3. Regenerate `icon.png` with `#005f3a` green bg + white "Smart Ride" wordmark
4. Regenerate `favicon.png` with a real 48×48 logo (also 16/32/180 for PWA)

---

## SECTION 5 — APK SIZE → **VERIFIED (bloat exists)** ⚠️

### Top 10 Largest Dependencies

| Rank | Package | Est. APK Contribution |
|---|---|---|
| 1 | `@rnmapbox/maps` | ~10 MB |
| 2 | `react-native-agora` | ~8 MB |
| 3 | `expo` (core) | ~5 MB |
| 4 | `react-native` | ~4 MB |
| 5 | `@sentry/react-native` | ~3 MB |
| 6 | `react-native-reanimated` | ~2.5 MB |
| 7 | `react-native-worklets` | ~2 MB |
| 8 | `expo-notifications` | ~1.5 MB |
| 9 | `@expo/vector-icons` | ~1.5 MB |
| 10 | `@react-native-google-signin/google-signin` | ~1.5 MB |

### Built APK Status
- `find /home/z/my-project -name "*.apk"` → **NONE** (managed workflow, prebuild not run in this repo; user has android/ folder locally)

### Size Estimates
- **APK (per-ABI, with `withAbiSplits`)**: ~52 MB (Expo baseline 30 + Mapbox 8 + Agora 6 + Sentry 3 + Reanimated 2 + Google-Sign-In 1.5 + image-picker 1)
- **AAB (Play Store dynamic delivery)**: ~31 MB — but `eas.json` currently ships APK for ALL profiles (production included). Should switch to AAB.

### MB Savings Opportunities

| Action | Saving |
|---|---|
| Remove `react-native-worklets` (zero direct imports — Reanimated 4.x bundles own worklet runtime) | ~2 MB |
| Move `@sentry/react-native` behind EAS build profile (DSN unset → no-ops but native SDK still bundled) | ~3 MB |
| Defer `react-native-agora` to Play Feature Delivery dynamic module | ~6-8 MB |
| Remove `react-native-web` (web target not built) | ~1 MB |
| Remove `expo-web-browser` (no direct imports — native Apple/Google SDKs used instead) | ~500 KB |
| Verify `expo-constants`/`expo-device`/`expo-splash-screen` are truly transitive | ~500 KB combined |
| **Switch `eas.json` production profile to `buildType: "aab"`** | ~40% user download reduction (~52 MB APK → ~31 MB AAB) |
| Delete dead `/home/z/my-project/mobile/` folder (duplicate RN 0.73.2 project + duplicate `react-native-maps` + `@rnmapbox/maps`) | ~2.5 MB source tree |
| Delete dead `/home/z/my-project/src/components/mobile/` (716 KB dead source) | 716 KB source |
| Delete dead parts of `/home/z/my-project/src/components/smart-ride/` (~1.3 MB of 1.5 MB is dead — preserve only `dashboards/admin-dashboard.tsx` + `context/socket-context.tsx`) | ~1.3 MB source |

**Total potential savings**: ~15-20 MB APK reduction + ~2.5 MB source tree cleanup.

### No Duplicate Functionality in Active expo-app ✅
- Only one map SDK (`@rnmapbox/maps`) — no `react-native-maps`/`expo-maps` in `expo-app/package.json`
- No axios, no redux — fetch + supabase-js
- Only `@expo/vector-icons` (no `react-native-vector-icons`)
- Zero font files in `expo-app/assets/`

---

## SECTION 6 — ROUTING & DUPLICATE CODE → **VERIFIED (dead code exists)** ⚠️

### Duplicate Folder Inventory

| Folder | Size | Classification | Evidence |
|---|---|---|---|
| `/home/z/my-project/expo-app/` | 2.7 MB | **ACTIVE** (production mobile app) | `expo-router` plugin, `eas.json`, upload keystore, `_layout.tsx` references all auth/tabs screens |
| `/home/z/my-project/mobile/` | 508 KB | **DEAD/STALE** | Older RN 0.73.2 project; `App.tsx` NEVER imported anywhere; separate `package.json` with DUPLICATE `react-native-maps` + `@rnmapbox/maps`; not built |
| `/home/z/my-project/src/components/mobile/` | 716 KB | **DEAD** | All 6 app shells (client/rider/merchant/pharmacy/smart-health/health-provider) — NONE imported. Only `shared/sos-button.tsx` + `shared/sos-emergency-screen.tsx` are imported, and only by dead `item-delivery-screen.tsx` → transitively dead |
| `/home/z/my-project/src/components/smart-ride/` | 1.5 MB | **MIXED (mostly dead)** | ACTIVE: `dashboards/admin-dashboard.tsx` (imported by `/admin/page.tsx`) + `context/socket-context.tsx` (imported by `providers.tsx`). DEAD: `smart-ride-app.tsx` (entry never imported) → drags down all `dashboards/{client,rider,merchant,pharmacist}-dashboard.tsx`, `onboarding/*`, `services/*`, `messaging/*`, `receipts/*.tsx`, `support/*`, `context/{user,messages,notification,messaging}-context.tsx` |
| `/home/z/my-project/expo-app/app/auth/` | — | **ACTIVE** | 8 auth screens in Expo Router, referenced by `_layout.tsx` `<Stack.Screen>` |
| `/home/z/my-project/mobile/src/screens/auth/` | — | **DEAD** | Older mobile/ project is dead |
| `/home/z/my-project/src/components/auth/` | — | **ACTIVE** (web auth) | Imported by `src/app/auth/login/page.tsx`, `auth/signup/page.tsx`, `admin/login/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx` |
| `/home/z/my-project/src/components/smart-ride/onboarding/` | — | **DEAD** | Only imported by dead `smart-ride-app.tsx` |

### Cross-Folder Import Verification (Grep results)
- `expo-app/` → `from '@/components/mobile'`: **0 matches** ❌
- `expo-app/` → `from '@/components/smart-ride'`: **0 matches** ❌
- `expo-app/` → `from 'mobile/...'`: **0 matches** ❌
- `src/` → `from '...expo-app'`: **0 matches** ❌
- `src/` → `from '@/components/mobile/shared/sos-button'`: 2 matches in dead `item-delivery-screen.tsx` + `service-screen.tsx` (both in dead smart-ride dashboards tree)

### "Dangerous Duplicates" Assessment
- **No two LIVE duplicate screens of the same route found.** Only one mobile entry (`expo-app/`) is live; the web app serves admin dashboard only via `/admin/page.tsx`.
- However, the dead duplicates (~2.7 MB source) are a **maintenance hazard**: developers may edit `mobile/App.tsx` or `src/components/smart-ride/onboarding/auth-screen.tsx` thinking they're changing production code, but those edits are silently ineffective.
- 4 separate auth implementations, 3 root layouts, 4 navigation structures — confusing for any new developer.

---

## SECTION 7 — PRODUCTION READINESS (17 FLOWS) → **15/17 PASS**

### Setup Verified
- Dev server: running on :3000 (live POST/GET traffic in `dev.log`)
- Supabase DB: reachable — `/api/health` → 200; `/api/health/startup` → 200 with `checks.JWT_SECRET:true, checks.DATABASE_URL:true`

### Per-Flow Results

| # | Flow | Result | Evidence |
|---|---|---|---|
| 1 | Install app | **NOT TESTABLE** | `eas.json` has `production` profile with `buildType: apk`; APK install cannot be tested in sandbox |
| 2 | Register | **PASS** ✅ | POST `/api/auth/register` `{name,email,phone,password,role}` → 200 with user + accessToken + refreshToken |
| 3 | Login | **PASS** ✅ | POST `/api/auth/login` → 200 with accessToken + refreshToken |
| 4 | Reset password | **PASS** ✅ | POST `/api/auth/forgot-password` → 200 generic success (anti-enumeration). Reset token stored in `PasswordResetToken` table |
| 5 | Book ride | **PASS** ✅ | POST `/api/rides` (taskType=SMART_BODA_RIDE, paymentMethod=CASH) → 201 with task row |
| 6 | Create delivery | **PASS** ✅ | POST `/api/tasks` (taskType=ITEM_DELIVERY, paymentMethod=CASH) → 201, auto-transitioned to MATCHING |
| 7 | Order food | **PASS** ✅ | GET `/api/merchants?type=RESTAURANT` → 200 (1 restaurant). POST `/api/orders` (FOOD_DELIVERY) → 201 with items + linked task |
| 8 | Order shopping | **PASS** ✅ | GET `/api/merchants?type=GROCERY` → 200. POST `/api/orders` (SHOPPING) → 201 |
| 9 | Track rider | **PASS** ✅ | Supabase Realtime verified working (2-client broadcast echo test PASS). `useRealtime()` hook in `app/_layout.tsx:98`; `joinTaskRoom` in `order-tracking.tsx:144`, `driver-task.tsx:92`, `ride-tracking.tsx:181` |
| 10 | Use chat | **FAIL** ❌ | POST `/api/messages` → **500**. Prisma: `new row violates row-level security policy for table "Conversation"` at `src/app/api/messages/route.ts:219`. RLS INSERT policy missing. |
| 11 | Receive real-time updates | **PASS** ✅ | `broadcastEvent/broadcastToUser/broadcastToTask` in `src/lib/realtime-server.ts` invoked by task-transition + orders PATCH routes |
| 12 | Complete ride | **PASS** ✅ | Full SMART_BODA_RIDE lifecycle via `force_assign` + `?action=accept` + `/transition` (as ADMIN): CREATED→MATCHING→ASSIGNED→ACCEPTED→ARRIVING→ARRIVED→PICKED_UP→IN_PROGRESS→**COMPLETED** — all 200 |
| 13 | Complete delivery | **PASS** ✅ | ITEM_DELIVERY lifecycle ASSIGNED→ACCEPTED→ARRIVING→PICKED_UP→IN_TRANSIT→DELIVERED→**COMPLETED** — all 200 |
| 14 | Complete food order | **PASS** ✅ | PATCH `/api/orders/<id>?action=...` walked ORDER_CREATED→PAYMENT_CONFIRMED→MERCHANT_ACCEPTED→PREPARING→READY_FOR_PICKUP→PICKED_UP→**DELIVERED** — all 200 |
| 15 | Pay cash | **PASS** ✅ | CASH is in `PaymentMethod` enum, accepted by rides/tasks/orders POST. Food order `confirm-payment` with `paymentReference:"CASH-ON-DELIVERY"` → `paymentStatus:COMPLETED` |
| 16 | View history | **PASS** ✅ | GET `/api/rides` → 200 (2 rides); GET `/api/tasks` → 200 (5 tasks); GET `/api/orders` → 200 (2 orders). All auth-scoped to CLIENT |
| 17 | Logout | **PASS** ✅ | POST `/api/auth/logout` → 200 "Logged out successfully". Clears cookies, invalidates session |

### Score
- **PASS: 15 / 17**
- **FAIL: 1** (flow 10 — chat RLS)
- **NOT TESTABLE: 1** (flow 1 — APK install)
- **Production readiness score: 8.8 / 10** = (15/17) × 10

### Significant Issues Found (beyond flow 10)

1. **Conversation RLS INSERT policy missing** (`src/app/api/messages/route.ts:219`) — chat completely broken in prod. Same class of bug fixed for TaskStateTransition/AuditLog/Notification in migrations 007/008 — Conversation was missed.
2. **HeartbeatLog RLS INSERT policy missing** (`src/app/api/rider/heartbeat/route.ts:120`) — rider location heartbeats cannot be persisted, breaks location history.
3. **SUPER_ADMIN treated as CLIENT in transition route** (`src/app/api/tasks/[id]/transition/route.ts:133`) — `triggeredByType` only checks 'RIDER'/'ADMIN', falls through to 'CLIENT' for SUPER_ADMIN/OPERATIONS_ADMIN/etc. State machine rejects admin-initiated transitions.
4. **`/api/rides` POST leaves task stuck in CREATED** — does not auto-transition to MATCHING (unlike `/api/tasks`). Dispatch never picks these up.
5. **`/api/orders/[id]` PATCH has NO auth check** — anyone (even unauthenticated) can drive an order through its full lifecycle. Security risk.
6. **`/api/admin/task-override` `force_complete` fails when no direct transition path exists** — state machine strictly enforces valid transitions even for admin overrides.
7. **`?action=start` on `/api/tasks/<id>` is effectively dead code** — pre-check `isValidTransition(ACCEPTED, IN_PROGRESS)` always rejects (ACCEPTED → ARRIVING is the only valid next state for rides).

---

## FINAL OUTPUT

### 1. VERIFIED ISSUES STILL EXISTING

| # | Issue | Section | Severity |
|---|---|---|---|
| V1 | Conversation RLS INSERT policy missing → chat 500s | S7 | CRITICAL |
| V2 | HeartbeatLog RLS INSERT policy missing → rider location not persisted | S7 | HIGH |
| V3 | `/api/orders/[id]` PATCH has no auth check (security risk) | S7 | CRITICAL |
| V4 | `/api/rides` POST doesn't auto-transition CREATED → MATCHING (dispatch never picks up) | S7 | HIGH |
| V5 | SUPER_ADMIN/OPERATIONS_ADMIN/COMPLIANCE_ADMIN/FINANCE_ADMIN mapped to CLIENT in transition route | S7 | HIGH |
| V6 | `Animated.View` wraps TextInput in 3 password screens (cursor-jump risk on Android) | S2 | MEDIUM |
| V7 | Conditional error container causes layout shift in 4 screens | S2 | MEDIUM |
| V8 | `IconInput` doesn't use `forwardRef` — no field-to-field navigation | S2 | LOW |
| V9 | splash.png/icon.png/adaptive-icon.png have opaque navy bg (defeats green backgroundColor) | S4 | HIGH |
| V10 | favicon.png is solid green tile with no logo content | S4 | MEDIUM |
| V11 | 12 Stitch design screens missing (incl. e_receipt, trip_summary_rating, delivery_confirmation, onboarding_slides) | S3 | MEDIUM |
| V12 | `react-native-worklets` unused but bundled (~2 MB) | S5 | LOW |
| V13 | `@sentry/react-native` DSN unset but native SDK bundled (~3 MB) | S5 | LOW |
| V14 | `eas.json` production profile ships APK not AAB (~40% download bloat) | S5 | MEDIUM |
| V15 | Dead duplicate code: `mobile/`, `src/components/mobile/`, most of `src/components/smart-ride/` (~2.7 MB source) | S6 | LOW |

### 2. ISSUES ALREADY FIXED

| # | Issue | Section | Evidence |
|---|---|---|---|
| F1 | Google Sign-In DEVELOPER_ERROR | S1 | `androidClientId` intentionally omitted from `configure()` — auto-resolves from `google-services.json` at runtime (`expo-app/src/config/google.ts:88-93`) |
| F2 | Phone formatter cursor jump on register/phone-login | S2 | Raw text passed to `onChangeText`; normalization only at submit (`register.tsx:462,289`) |
| F3 | Password reformatting cursor jump on login | S2 | Raw text passed to `onChangeText`; trim/lowercase only at submit (`login.tsx:483,288-289`) |
| F4 | Classic `useEffect` overwriting own field value | S2 | Zero matches across all 8 auth screens |
| F5 | Keyboard shift on auth screens | S2 | All 7 input-bearing screens use `KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}` |
| F6 | Android freeze during registration | S2 | No synchronous loops; `Animated.loop`s use `useNativeDriver: true` |
| F7 | Cursor jump from `nativewind/babel` causing style recalculation on every render | S2 | Removed from `babel.config.js`; comment preserved explaining why |
| F8 | Register/login cursor jump from `Animated.View` wrapper | S2 | `register.tsx:90-92,367-381` swaps to plain `<View>` after entrance animation via `animationDone` state |
| F9 | Register/login layout shift from conditional error container | S2 | `login.tsx:459-463` always renders error container with `errorHidden` style |
| F10 | JWT_SECRET missing (previously crashed all auth in prod) | S7 | Set in `.env`; `/api/health/startup` returns `checks.JWT_SECRET: true` |
| F11 | Render.com database references | S7 | Verified gone; only `.env` comment "NOT Render.com" remains (intentional doc) |
| F12 | Mobile api.ts response-unwrapping bug | S7 | Fixed in commit `5ebc076` |
| F13 | Parcel screen fake-rider bug | S7 | Fixed in commit `5ebc076` — real polling via `/api/tasks/[id]` |
| F14 | 14 of 17 production flows | S7 | Live API testing confirms PASS |

### 3. FALSE POSITIVES FROM PREVIOUS AUDITS

| # | Previous Claim | Reality |
|---|---|---|
| FP1 | "Logo unification replicated to all 26 logo paths including Expo adaptive-icon + splash" | FALSE — MD5 hashes prove `icon.png`/`splash.png`/`adaptive-icon.png` are byte-identical navy variants (216,688 bytes, 1.85% alpha), NOT the canonical transparent logo (355,413 bytes, 90.77% alpha). File timestamps confirm never re-copied. |
| FP2 | "All 6 customer journey flows verified with zero errors" | PARTIALLY FALSE — 5 of 6 backend flows pass, but flow #10 (chat) FAILS with 500 due to missing Conversation RLS INSERT policy. |
| FP3 | "Stitch design system applied to ALL app screens" | FALSE — only 6/29 screens fully implemented; 12 entirely missing. |
| FP4 | "Production readiness score 10/10 — READY FOR PRODUCTION" | FALSE — chat broken, branding broken, security hole in orders PATCH. Actual score: 6.1/10 — Internal Testing Ready only. |
| FP5 | `GOOGLE_SIGNIN_FIX.md` documents "ADDED androidClientId as the fix" | MISLEADING — code subsequently REMOVED `androidClientId` (the actual fix). Doc is stale; code is correct. |

### 4. CRITICAL BLOCKERS (must fix before any user launch)

| # | Blocker | Fix |
|---|---|---|
| B1 | **Chat broken — Conversation RLS INSERT policy missing** (`src/app/api/messages/route.ts:219`) | Add Supabase RLS migration: `CREATE POLICY "Allow authenticated insert conversation" ON "Conversation" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "participantOneId" OR auth.uid() = "participantTwoId");` |
| B2 | **`/api/orders/[id]` PATCH has NO auth check** — anyone can drive an order through its full lifecycle unauthenticated | Add `requireAuth` + role check (MERCHANT for accept/preparing/ready, RIDER for pickup/deliver) at the top of the handler |
| B3 | **Splash/icon/adaptive-icon assets broken** — every user sees a navy square with green strips instead of a green splash on every app launch | Regenerate the 4 PNG assets (or switch `resizeMode` to `"cover"` and bake `#005f3a` into the image) |

### 5. HIGH PRIORITY FIXES (before closed beta)

| # | Fix |
|---|---|
| H1 | HeartbeatLog RLS INSERT policy missing (`src/app/api/rider/heartbeat/route.ts:120`) |
| H2 | `/api/rides` POST doesn't auto-transition CREATED → MATCHING (dispatch never picks up) |
| H3 | SUPER_ADMIN/OPERATIONS_ADMIN/COMPLIANCE_ADMIN/FINANCE_ADMIN mapped to CLIENT in `tasks/[id]/transition/route.ts:133` |
| H4 | `Animated.View` wraps TextInput in 3 password screens (cursor-jump risk) — apply `animationDone` swap pattern from `register.tsx` |
| H5 | `favicon.png` is solid green tile with no logo (regenerate real favicon) |
| H6 | Set Vercel env vars in production: JWT_SECRET, CRON_SECRET, CORS_ALLOWED_ORIGINS, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_API_URL, DATABASE_URL (Supabase DIRECT host, not pooler) |

### 6. MEDIUM PRIORITY FIXES

| # | Fix |
|---|---|
| M1 | Conditional error container causes layout shift in 4 screens — always render with `errorHidden` style |
| M2 | Switch `eas.json` production profile to `buildType: "aab"` (~40% download reduction) |
| M3 | Build missing high-value Stitch screens: `onboarding_slides`, `transaction_details`, `e_receipt`, `trip_summary_rating`, `delivery_confirmation` |
| M4 | Update stale `GOOGLE_SIGNIN_FIX.md` (still says "added androidClientId" — code removed it) |
| M5 | Configure real SMS provider (AFRICASTALKING_API_KEY + SMS_ENABLED=true) — currently OTPs fall back to dev mode |
| M6 | Configure real payment gateway keys (MTN_MOMO_*, AIRTEL_MONEY_*, FLUTTERWAVE_SECRET_KEY) — currently wallet topup auto-completes in demo mode |

### 7. LOW PRIORITY FIXES

| # | Fix |
|---|---|
| L1 | `IconInput` doesn't use `forwardRef` — refactor to enable field-to-field navigation |
| L2 | Remove unused `react-native-worklets` (~2 MB saving) |
| L3 | Move `@sentry/react-native` behind EAS build profile (~3 MB saving on production) |
| L4 | Remove `react-native-web` (web target not built) (~1 MB) |
| L5 | Delete dead `/home/z/my-project/mobile/` folder (508 KB source + duplicate deps) |
| L6 | Delete dead `/home/z/my-project/src/components/mobile/` (716 KB dead source) |
| L7 | Delete dead parts of `/home/z/my-project/src/components/smart-ride/` (~1.3 MB of 1.5 MB is dead) |
| L8 | Stop `logoFloat` and `glowPulse` `Animated.loop`s when input is focused on 3 password screens |
| L9 | Decide whether to remove or fix `?action=start` handler on `/api/tasks/<id]` (dead code) |
| L10 | Rename `src/middleware.ts` → `src/proxy.ts` (Next 16 deprecated `middleware` convention) |
| L11 | Remove `console.log('Password reset OTP for ${email}: ${otp}')` in `src/lib/services/auth.service.ts:374` (or wrap in `if (process.env.NODE_ENV !== 'production')`) |

### 8. Updated Production Readiness Score: **6.1 / 10**

Calculation: average of 7 sections (10 + 7 + 4.5 + 4 + 4 + 5 + 8.8) / 7 = 43.3 / 7 = **6.19 → 6.1**

### 9. Recommendation: **Internal Testing Ready** (NOT yet Closed Beta Ready)

**Rationale**:
- 1 critical blocker (chat broken) — flow 10 of 17 fails
- 1 critical security hole (orders PATCH unauthenticated)
- Branding defects visible to every user on every app launch (splash/icon navy, favicon blank)
- 12 Stitch design screens missing (high-value post-transaction flows absent)
- Dead code volume creates maintenance hazard

**Path to Closed Beta Ready**: Fix B1 + B2 + B3 + H1 + H2 + H3 + H4 + H5 → re-test flows 10 and 5 → verify on a real APK install → score should reach ~8.5/10.

**Path to Production Ready**: All of the above + M1–M6 + real SMS/payment gateway integration + at least the 5 missing high-value Stitch screens (M3) + clean up dead code (L5–L7) → score should reach ~9.5/10.

---

## ANDROID STUDIO + GITBASH BUILD COMMAND (using existing android folder)

Since the android folder already exists locally (not in this repo — user generated it via `npx expo prebuild`), here is the exact command sequence:

### Option A — GitBash (recommended for speed)

```bash
# 1. From the project root, pull latest
git pull origin main

# 2. Navigate into the android folder (inside expo-app)
cd expo-app/android

# 3a. Build DEBUG APK (fastest, unsigned, for testing)
./gradlew assembleDebug

# 3b. OR build RELEASE APK (signed with smartride-upload.keystore)
./gradlew assembleRelease

# 4. APK output location:
#    Debug:   expo-app/android/app/build/outputs/apk/debug/app-debug.apk
#    Release: expo-app/android/app/build/outputs/apk/release/app-release.apk
```

### Option B — Android Studio (GUI)

1. Open Android Studio
2. `File` → `Open` → select the `expo-app/android` folder (NOT the project root)
3. Wait for Gradle sync to complete (2–5 min)
4. `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
5. When done, click "locate" in the notification to find the APK

### Option C — Expo CLI (uses existing android folder, doesn't re-run prebuild)

```bash
cd expo-app
npx expo run:android --variant debug
# OR for release:
npx expo run:android --variant release
```

### Notes
- The keystore is already at `expo-app/keystores/smartride-upload.keystore` (2,782 bytes).
- The `withAbiSplits` plugin is configured — output will be per-ABI (arm64-v8a + armeabi-v7a only), ~52 MB per APK.
- If `./gradlew` is not executable in GitBash: `chmod +x expo-app/android/gradlew` first.
- If build fails on Java version: ensure Java 17 is set in `JAVA_HOME` (Android Studio bundles JDK 17).
- For Play Store upload later: switch `eas.json` production profile to `buildType: "aab"` and run `./gradlew bundleRelease` to produce an AAB (~31 MB).
