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
