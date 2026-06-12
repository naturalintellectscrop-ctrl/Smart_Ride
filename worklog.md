---
Task ID: 1-a
Agent: full-stack-developer
Task: Fix driver/index.tsx to use SmartRideMap instead of react-native-maps

Work Log:
- Removed react-native-maps conditional imports (MapView, Marker, MapViewProps)
- Removed MapErrorBoundary class and SafeMapView component
- Added SmartRideMap import from '@/src/components/SmartRideMap'
- Replaced SafeMapView JSX with SmartRideMap using initialLatitude/initialLongitude props
- Removed Platform import from react-native (no longer used)
- Removed Component and ReactNode from React import (no longer used)
- Removed mapFallback, mapFallbackEmoji, mapFallbackText, mapFallbackSubtext styles from StyleSheet
- Cleaned up extra blank lines left after removals

Stage Summary:
- driver/index.tsx no longer depends on react-native-maps
- SmartRideMap provides its own error boundary and fallback

---
Task ID: 1-8
Agent: main
Task: Fix APK crash-on-open and Next.js web app issues

Work Log:
- Identified root cause of APK crash: `require('react-native-maps')` calls in 4 files crash when native module isn't linked
- Fixed all 4 app/ files (driver/index.tsx, driver/driver-task.tsx, rider/ride-tracking.tsx, orders/order-tracking.tsx) to use SmartRideMap
- Removed old duplicate directories: driver/, rider/, orders/, components/ outside app/
- Removed src/mocks/react-native-maps.tsx
- Removed react-native-maps from expo-app/package.json
- Added expo-build-properties@0.1.0 to package.json for ProGuard/shrinking
- Created plugins/withAbiSplits.js for ABI splits (arm64-v8a + armeabi-v7a only)
- Updated app.json with build optimizations: userInterfaceStyle=light, #005f3a colors, expo-build-properties, withAbiSplits plugin
- Fixed Next.js conflict: removed root babel.config.js (was Expo config conflicting with Next.js SWC)
- Fixed proxy.ts: removed import of @/lib/security/security-headers, inlined security headers
- Removed old middleware.ts (Next.js 16 uses proxy.ts instead)
- Verified web app returns 200 and renders correctly with all sections
- ESLint passes clean

Stage Summary:
- APK crash-on-open root cause fixed: react-native-maps removed from all source files
- APK size optimization: ABI splits + R8 + ProGuard + shrink configured via plugins
- Next.js web app fully functional at localhost:3000
- All react-native-maps references removed from expo-app

---
Task ID: 2
Agent: main
Task: Fix several production issues in the expo-app

Work Log:
- Added custom inline Babel plugin (removeConsolePlugin) to babel.config.js to strip console.log/info/debug in production builds while keeping console.warn and console.error; babel-plugin-transform-remove-console was not installed so a custom visitor-based plugin was used instead
- Updated eas.json: added RNMAPBOX_MAPS_DOWNLOAD_TOKEN (empty string, value supplied via EAS secrets) to all 4 build profiles (development, preview, production, apk); changed production profile distribution from "internal" to "store"
- Cleaned up duplicate root-level directories and files:
  - Removed: auth/, services/, health/, shopping/, wallet/, delivery/, profile/, screens/, navigation/, (tabs)/, App.tsx, index.tsx, _layout.tsx, minimal-test.tsx
  - Before deletion, verified imports: app/auth/ files imported from root services/auth.ts
  - Moved services/auth.ts → src/services/auth.ts and fixed internal relative imports (../src/store → ../store, ../src/constants → ../constants)
  - Updated 4 app/auth/ files (login, register, forgot-password, reset-password) to import from @/src/services/auth instead of ../../services/auth
  - Added auth re-exports to src/services/index.ts
- Fixed chatStore mock data fallback: removed MOCK_CONVERSATIONS and MOCK_MESSAGES data blocks; replaced fallback to empty arrays ([]) in loadConversations and loadMessages; changed console.log to console.warn for API failure logging; removed trailing console.log('[CHAT-STORE] Store initialized')

Stage Summary:
- Production builds will strip console.log/info/debug (keeps warn/error) via custom Babel plugin
- EAS builds now include RNMAPBOX_MAPS_DOWNLOAD_TOKEN env var; production uses "store" distribution
- All duplicate root-level directories/files removed; auth service properly relocated to src/services/
- Chat store no longer falls back to fake data — shows empty state when API is unavailable
