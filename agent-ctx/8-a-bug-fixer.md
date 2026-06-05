# Task 8-a: Critical Bug Fixes

## Work Summary

Fixed 7 critical bugs in the Smart Ride Expo mobile app:

### BUG 1: Login screen Animated.View wrappers cause input instability
- **File**: `expo-app/app/auth/login.tsx`
- **Fix**: Replaced `<Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>` wrapping the form card (containing email/password inputs) with a plain `<View>`. This eliminates cursor jumping, focus stealing, input freezing, and keyboard flickering on Android. The header Animated.View was kept since it doesn't contain inputs.

### BUG 2: Token refresh doesn't update authStore
- **File**: `expo-app/services/auth.ts`
- **Fix**: Added `useAuthStore.getState().setAccessToken(data.data.accessToken)` after `saveTokens()` in `refreshAccessToken()`. This ensures the in-memory auth store stays in sync with the refreshed token, preventing subsequent API calls from using stale tokens.

### BUG 3: OTP auto-submit useEffect has potential stale closure
- **File**: `expo-app/app/auth/verify-otp.tsx`
- **Fix**: Added `isLoading` to the dependency array of the auto-submit useEffect: `[otp, isLoading]` instead of just `[otp]`. This prevents stale closure issues where the isLoading check could be outdated.

### BUG 4: Cart store loadCart is never called on app startup
- **File**: `expo-app/src/store/cartStore.ts`
- **Fix**: Replaced the `console.log('[CART-STORE] Store initialized')` at the bottom with `useCartStore.getState().loadCart().catch(...)` to ensure cart data is loaded from AsyncStorage on app startup, enabling cart persistence across app restarts.

### BUG 5: Reset password screen has duplicated COLORS constant
- **File**: `expo-app/app/auth/reset-password.tsx`
- **Fix**: Removed the local `const COLORS = { ... }` block (16 lines with values that diverged from the main design system) and added `import { COLORS } from '../../src/constants'` to use the canonical design system constants.

### BUG 6: Phone login shows OTP in Alert (MVP test mode - security risk)
- **File**: `expo-app/app/auth/phone-login.tsx`
- **Fix**: Wrapped the OTP display in an `if (__DEV__)` guard so the OTP is only shown in development mode. In production (`else` branch), a generic "OTP Sent" message is shown instead. Added TODO comment for eventual removal.

### BUG 7: Driver accept request has duplicate accessToken declaration
- **File**: `expo-app/app/driver/index.tsx`
- **Fix**: Moved `const { accessToken } = useAuthStore.getState()` to the top of `handleAcceptRequest()`, removing the duplicate declaration that was inside the `if (matchId)` block and the one in the else path. This prevents a JavaScript runtime error from re-declaring a `const` variable in the same function scope.
