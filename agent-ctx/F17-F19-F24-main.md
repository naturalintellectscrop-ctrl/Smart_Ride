# F17, F19, F24 - Bug Fixes

## Task F17: Fix dead/no-op buttons (10 instances)

### Files modified:

1. **`(tabs)/index.tsx`** — Notification button
   - `onPress: () => {}` → `onPress: () => router.push('/notifications')`

2. **`(tabs)/profile.tsx`** — 4 dead menu items:
   - "Saved Addresses" `onPress: () => {}` → `Alert.alert('Coming Soon', 'Saved addresses will be available soon')`
   - "Emergency Contacts" `onPress: () => {}` → `onPress: () => router.push('/sos')`
   - "Language" `onPress: () => {}` → `Alert.alert('Coming Soon', 'Language settings will be available soon')`
   - Settings gear `onPress: () => {}` → `Alert.alert('Coming Soon', 'Settings will be available soon')`

3. **`wallet/index.tsx`** — Top Up, Withdraw, Notification buttons
   - Top Up `onPress: () => {}` → `Alert.alert('Coming Soon', 'Top up feature will be available soon')`
   - Withdraw `onPress: () => {}` → `Alert.alert('Coming Soon', 'Withdrawal feature will be available soon')`
   - Notification icon `onPress: () => {}` → `router.push('/notifications')`
   - Added `Alert` to react-native imports

4. **`rider/wallet.tsx`** — Top Up and History buttons
   - Top Up (no onPress) → `Alert.alert('Coming Soon', 'Top up feature will be available soon')`
   - History (no onPress) → Shows Alert with transaction info or "No History" message

5. **`merchant/earnings.tsx`** — Request Payout button (no onPress)
   - Added `onPress` with confirmation dialog calling `api.requestMerchantPayout(merchantId, earnings?.availableBalance)`
   - Added `api` import and `Alert` to react-native imports

6. **`health/index.tsx`** — Filter icon `onRightIconPress={() => {}}`
   - → `Alert.alert('Filter', 'Filter options will be available soon')`
   - Added `Alert` to react-native imports

7. **`shopping/index.tsx`** — No dead button found; search is handled by IconInput component already

### API Service Addition:
- Added `requestMerchantPayout(merchantId, amount?)` method to `src/services/api.ts`

---

## Task F19: Fix animation memory leaks

### Files modified:

1. **`auth/forgot-password.tsx`** — 2 Animated.loop animations with no cleanup
   - Stored `logoLoop` and `glowLoop` references from `Animated.loop()`
   - Added cleanup: `return () => { logoLoop.stop(); glowLoop.stop(); }`

2. **`auth/reset-password.tsx`** — 2 Animated.loop animations with no cleanup
   - Same fix: stored references, added cleanup return with `logoLoop.stop()` and `glowLoop.stop()`

---

## Task F24: Fix driver raw fetch() calls to use api service

### Files modified:

1. **`driver/index.tsx`** — Accept/decline handlers used raw `fetch()`
   - `handleAcceptRequest`:
     - `fetch(API_CONFIG.baseUrl + '/dispatch/' + matchId + '/accept')` → `api.dispatchAccept(matchId)`
     - `fetch(API_CONFIG.baseUrl + '/tasks/' + id + '/transition')` → `api.transitionTask(taskId, 'ACCEPTED', { riderId })`
   - `handleDeclineRequest`:
     - `fetch(API_CONFIG.baseUrl + '/dispatch/' + matchId + '/reject')` → `api.dispatchReject(matchId, 'Declined by rider')`
     - `fetch(API_CONFIG.baseUrl + '/tasks/' + id + '/transition')` → `api.transitionTask(taskId, 'CANCELLED', { riderId, reason })`
   - Removed unused `API_CONFIG` import

2. **`driver/driver-task.tsx`** — `transitionTask` used raw `fetch()`
   - Replaced with `api.transitionTask(taskId, toStatus, { latitude, longitude })`
   - Removed unused `useAuthStore` and `API_CONFIG` imports
