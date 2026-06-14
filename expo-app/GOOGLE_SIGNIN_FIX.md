# Google Sign-In Fix - Expo App

## Overview

This document outlines all the fixes applied to the Google Sign-In (OAuth) authentication system in the Smart Ride mobile app.

## Issues Found & Fixed

### 1. **Android Client ID Not Explicitly Set**
**Problem:** Android's `androidClientId` was not being configured, only the web client ID.
**Fix:** Added explicit `androidClientId` configuration in `google.ts`:
```typescript
if (Platform.OS === 'android') {
  config.androidClientId = GOOGLE_CLIENT_IDS.androidClientId;
}
```
**Impact:** Ensures Android devices properly authenticate with Google Play Services.

---

### 2. **Inconsistent API Response Handling**
**Problem:** The `auth.ts` service expected only `response.user` + `response.tokens` format, but the login screen handled both formats. The API endpoint could return either:
- Format 1: `{ data: { user, accessToken, refreshToken } }`
- Format 2: `{ user, tokens: { accessToken, refreshToken } }`

**Fix:** Updated `loginWithGoogle()` function in `auth.ts` to handle both response formats:
```typescript
if (response.data?.user && response.data?.accessToken) {
  // Format 1: Standard format with data wrapper
} else if (response.user && response.tokens?.accessToken) {
  // Format 2: Alternative format
} else {
  // Fail loud - explicit error
}
```
**Impact:** Seamless compatibility with backend API regardless of response structure.

---

### 3. **Duplicated API Logic in Login Screen**
**Problem:** Login screen made direct `fetch()` calls to `/auth/google` instead of using the `loginWithGoogle()` service function, bypassing:
- Token refresh logic
- Error handling consistency
- Auth store synchronization
- Retry logic

**Fix:** Refactored `handleGoogleSignIn()` to use the `loginWithGoogle()` service function:
```typescript
// Before: Direct fetch call
const response = await fetch(`${API_BASE_URL}/auth/google`, {...})

// After: Uses service layer
const response = await loginWithGoogle(userInfo.data.idToken);
```
**Impact:** Centralized auth logic, better maintainability, consistent error handling.

---

### 4. **Poor Error Classification**
**Problem:** Generic error messages didn't distinguish between:
- Configuration errors (DEVELOPER_ERROR)
- Network errors
- User cancellation
- Google Play Services unavailable
- Token issues

**Fix:** Enhanced error handling with specific messages for each scenario:
```typescript
if (err.code === statusCodes.SIGN_IN_CANCELLED) {
  // Silent - user cancelled
} else if (err.message?.includes('DEVELOPER_ERROR')) {
  setError('Google Sign-In configuration error. Please contact support.');
} else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
  setError('Please update Google Play Services and try again.');
} else if (err.message?.includes('Network error')) {
  setError('Network error. Please check your connection.');
} else {
  setError('Google Sign-In failed. Please try email login instead.');
}
```
**Impact:** Users understand what went wrong and how to fix it.

---

### 5. **Android Platform Check Missing**
**Problem:** Only checked for Play Services availability but didn't perform platform-specific configuration before calling `hasPlayServices()`.

**Fix:** Added platform-specific logic:
```typescript
if (Platform.OS === 'android') {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
}
// iOS doesn't need explicit Play Services check
```
**Impact:** Proper error handling for Android, cleaner iOS experience.

---

### 6. **Improved Configuration Logging**
**Problem:** Limited information about what configuration was applied.

**Fix:** Added platform logging and configuration check functions:
```typescript
export function isGoogleSignInConfigured(): boolean {
  return isConfigured;
}

export function resetGoogleSignInConfig(): void {
  isConfigured = false;
}
```
**Impact:** Better debugging capabilities for developers.

---

## File Changes

### `src/config/google.ts`
- Added platform-specific client ID configuration
- Added `isGoogleSignInConfigured()` function
- Added `resetGoogleSignInConfig()` function for testing
- Improved logging with platform information

### `src/services/auth.ts`
- Enhanced `loginWithGoogle()` to handle both API response formats
- Added explicit token validation and error messaging
- Better error propagation

### `app/auth/login.tsx`
- Refactored `handleGoogleSignIn()` to use service layer
- Removed duplicated API call logic
- Added comprehensive error handling with user-friendly messages
- Added platform-specific checks
- Imported `loginWithGoogle` from service

---

## Configuration Requirements

### iOS Setup
1. **GoogleService-Info.plist** must be present in `expo-app/` directory
2. **app.json** must include:
   ```json
   "ios": {
     "bundleIdentifier": "ug.smartride.app",
     "googleServicesFile": "./GoogleService-Info.plist",
     "infoPlist": {
       "CFBundleURLTypes": [{
         "CFBundleURLSchemes": [
           "smartride",
           "com.googleusercontent.apps.531949209415-1knt1vf2v8g5fh7rltg31knps9j2otar"
         ]
       }]
     }
   }
   ```
3. Run: `eas build --platform ios` or `expo run:ios`

### Android Setup
1. **google-services.json** must be present in `expo-app/` directory
2. **app.json** must include:
   ```json
   "android": {
     "package": "ug.smartride.app",
     "googleServicesFile": "./google-services.json"
   }
   ```
3. Ensure Google Play Services are installed on test device
4. Run: `eas build --platform android` or `expo run:android`

---

## Testing Checklist

- [ ] **iOS Testing**
  - [ ] Install app on iOS device
  - [ ] Tap "Continue with Google" button
  - [ ] Sign in with Google account
  - [ ] Verify login successful and tokens saved
  - [ ] Close and restart app
  - [ ] Verify still authenticated

- [ ] **Android Testing**
  - [ ] Install app on Android device with Google Play Services
  - [ ] Tap "Continue with Google" button
  - [ ] Sign in with Google account
  - [ ] Verify login successful and tokens saved
  - [ ] Close and restart app
  - [ ] Verify still authenticated

- [ ] **Error Scenarios**
  - [ ] Cancel sign-in - no error message should appear
  - [ ] Network offline - should show network error message
  - [ ] Invalid/expired ID token - should show appropriate error
  - [ ] Configuration error - should suggest email login fallback

---

## Environment Variables

No additional environment variables required. All client IDs are hardcoded in `src/config/google.ts`.

**Client IDs (from Firebase Console):**
- Web: `531949209415-ja4espd5h0m6p74esft4iv541os5ertj.apps.googleusercontent.com`
- Android: `531949209415-3fnqdkfo69dognl93ffp0keg0jusvq6t.apps.googleusercontent.com`
- iOS: `531949209415-1knt1vf2v8g5fh7rltg31knps9j2otar.apps.googleusercontent.com`

---

## Deployment Steps

1. **Update Firebase Console**
   - Ensure all client IDs are registered
   - Verify OAuth consent screen is configured
   - Check Android certificate fingerprint matches

2. **Build for Production**
   ```bash
   # iOS
   eas build --platform ios

   # Android
   eas build --platform android
   ```

3. **Test Thoroughly**
   - Test on multiple devices
   - Test with various Google accounts
   - Test error scenarios (offline, invalid tokens, etc.)

4. **Monitor Logs**
   - Watch Sentry for Google Sign-In errors
   - Monitor auth failure rates
   - Check for DEVELOPER_ERROR occurrences

---

## Common Issues & Solutions

### DEVELOPER_ERROR on Android
**Cause:** google-services.json missing or app package name mismatch
**Solution:** 
1. Download fresh `google-services.json` from Firebase Console
2. Verify package name matches: `ug.smartride.app`
3. Rebuild app

### Network timeout
**Cause:** Slow internet connection during sign-in
**Solution:** 
- App automatically retries with exponential backoff
- User can manually retry by tapping button again

### idToken is undefined
**Cause:** Google Sign-In configuration failed
**Solution:**
- Clear app cache
- Reinstall app
- Check GoogleService-Info.plist (iOS) or google-services.json (Android)

### Session expires after app restart
**Cause:** Refresh token not saved properly
**Solution:**
- Check AsyncStorage/SecureStore permissions
- Verify token refresh endpoint `/auth/refresh` is working
- Check server logs for refresh failures

---

## Rollback Plan

If issues arise after deployment:

1. **Immediate rollback:**
   ```bash
   git revert <commit-hash>
   ```

2. **Communication:**
   - Notify users that Google Sign-In is temporarily unavailable
   - Suggest using email login instead

3. **Investigation:**
   - Check Sentry for error patterns
   - Review server logs for auth endpoint issues
   - Test on staging environment

---

## Future Improvements

1. **Add Sign-Out Button** - Currently no way to disconnect Google account
2. **Implement Account Linking** - Allow linking Google account to existing email account
3. **Add 2FA** - Support two-factor authentication with Google
4. **Biometric Login** - Combine with fingerprint/face unlock
5. **Token Expiry Warnings** - Notify user before tokens expire

---

## Support & References

- [react-native-google-signin Documentation](https://github.com/react-native-google-signin/google-signin)
- [Expo Router Documentation](https://expo.dev/routing)
- [Firebase Setup Guide](https://smartrideug.vercel.app/docs/firebase-setup)
- [JWT Token Handling](https://smartrideug.vercel.app/docs/jwt)
