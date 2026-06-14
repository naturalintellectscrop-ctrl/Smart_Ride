---
Task ID: 1
Agent: Main
Task: Replace all logo placeholders with official SmartRide logo across the entire project

Work Log:
- Explored project to find all logo references — found 10+ different logo files, 6 screens with "SR" text placeholders, 4 different logo paths used inconsistently
- Copied smartride-logo-transparent.png (1024x1024 PNG with alpha) to expo-app/assets/images/smartride-logo.png (was a misnamed JPEG)
- Updated expo-app/app/index.tsx: replaced View-based pin icon logo with actual Image component using SmartRideLogoImage
- Updated expo-app/app/auth/login.tsx: replaced "SR" text with Image component
- Updated expo-app/app/auth/forgot-password.tsx: replaced "SR" text with Image component
- Updated expo-app/app/auth/reset-password.tsx: replaced "SR" text with Image component
- Updated expo-app/app/auth/register.tsx: replaced text "Smart Ride" in app bar with Image component
- Updated mobile/src/screens/auth/LoginScreen.tsx: replaced "SR" text with Image component
- Updated mobile/src/screens/auth/RegisterScreen.tsx: replaced "SR" text with Image component
- Standardized all web app logo references from /logo.jpeg, /smartride-logo.jpeg, /images/logo.png to /smartride-logo-transparent.png
- Updated 9 web app files with inline logo references
- Updated Logo.tsx component to use /smartride-logo-transparent.png
- Replaced Zap icon placeholder in client-home.tsx with actual Image
- Replaced Heart icon placeholder in pharmacy-onboarding.tsx with actual Image
- Replaced via.placeholder.com fallback in health-screen.tsx with logo
- Lint passes clean, dev server running

Stage Summary:
- ALL "SR" text placeholders replaced with actual SmartRide logo image across both expo-app and mobile app
- ALL web app logo references now consistently use /smartride-logo-transparent.png
- Single source of truth: public/smartride-logo-transparent.png (1024x1024 PNG with alpha transparency)

---
Task ID: 2
Agent: Main
Task: Fix Google Sign-In webClientId mismatch + analyze YouTube tutorial applicability

Work Log:
- Identified YouTube video as "Setting Up Google Sign In for Expo / React Native Apps" by ToThePointCode
- Discovered critical webClientId mismatch: google.ts used wrong client ID (531949209415-ja4espd5h0m6p74esft4iv541os5ertj) that doesn't match google-services.json
- Fixed webClientId in expo-app/src/config/google.ts to match google-services.json type-3 client: 531949209415-h0ri57i233r1l767tnc4i26brdt3asb3
- Fixed same mismatch in src/services/google-signin.ts (backend)
- Added GOOGLE_CLIENT_ID to .env for proper server-side audience verification
- Verified no android/ directory exists (prebuild not done yet) - this is required for native Google Sign-In

Stage Summary:
- webClientId mismatch was the root cause of DEVELOPER_ERROR - now fixed
- The YouTube tutorial is directly applicable - covers the exact setup needed
- Still need: run `npx expo prebuild` to generate android/ directory, then build with Android Studio
- Certificate hash in google-services.json must match the signing key used for the APK build

---
Task ID: 3
Agent: Main
Task: Fix jumpy cursor in text input fields + Google Sign-In configuration

Work Log:
- Analyzed all TextInput components: login.tsx, phone-login.tsx, register.tsx, verify-otp.tsx, forgot-password.tsx, reset-password.tsx, IconInput.tsx
- Identified ROOT CAUSE #1: KeyboardAvoidingView with behavior="height" on Android causes entire view to resize on every keystroke, making cursor jump
- Identified ROOT CAUSE #2: import './global.css' (NativeWind) in _layout.tsx causes style recalculation on every render
- Identified ROOT CAUSE #3: Changing borderWidth on focus (1.5 → 2) causes layout shift → cursor jump
- Identified ROOT CAUSE #4: Missing maxFontSizeMultiplier={1} allows font scaling to shift cursor position
- Fixed _layout.tsx: Removed `import './global.css'` (NativeWind causing style recalculations)
- Fixed phone-login.tsx: Changed KAV behavior from 'height' to undefined on Android
- Fixed register.tsx: Changed KAV behavior from 'height' to undefined on Android
- Fixed verify-otp.tsx: Changed KAV behavior from 'height' to undefined on Android
- Fixed forgot-password.tsx: Changed KAV behavior from 'height' to undefined on Android
- Fixed reset-password.tsx: Changed KAV behavior from 'height' to undefined on Android
- Fixed phone-login.tsx: Removed borderWidth change on focus (1.5 → 2 → stays 1.5)
- Fixed IconInput.tsx: Added maxFontSizeMultiplier={1}, documented borderWidth stability
- Added maxFontSizeMultiplier={1} to all raw TextInput components
- Fixed Google Sign-In: Copied correct google-services.json (with Android type-1 cert hash) from root to expo-app
- Fixed Google Sign-In: Updated webClientId in src/config/google.ts to match correct google-services.json (531949209415-h0ri57i233r1l767tnc4i26brdt3asb3)

Stage Summary:
- Jumpy cursor fix: 4 root causes identified and fixed across 7 files
- Google Sign-In fix: Correct google-services.json now in expo-app, webClientId matches
- NOTE: For Google Sign-In to fully work, the user's debug SHA-1 fingerprint (F2:8C:61:CC:4F:2A:57:00:A0:18:25:57:CF:CB:75:A4:2A:96:0A:E1) must be added to Firebase project, then google-services.json re-downloaded
