# Smart Ride Mobile - Release APK Crash Diagnosis

**Date**: 2026-04-28  
**Symptom**: APK installs successfully, launches, then immediately closes on Android physical device.  
**Dev Mode**: Works correctly in Expo Go / development.  
**Release Mode**: Crashes on launch.  

---

## PHASE 1: STARTUP EXECUTION TRACE

### Actual Release Entry Path

```
Android Native Process
    ↓
MainApplication.java (loads ReactNativeHost)
    ↓
Native Modules Init (reanimated, gestures, secure-store, location, notifications, etc.)
    ↓
JS Bundle Loads (from APK assets)
    ↓
Entry Point: expo-router/entry (package.json main field)
    ↓
app/_layout.tsx (ROOT LAYOUT - THIS IS THE ACTUAL ENTRY)
    ↓
    ├── import '../global.css' (NativeWind CSS)
    ├── GestureHandlerRootView
    ├── SafeAreaProvider
    └── Stack Navigator
    ↓
app/index.tsx (INITIAL ROUTE - TailwindTestScreen)
    ↓
app/(tabs)/index.tsx (Home Screen - after user navigates)
```

### CRITICAL FINDING: Entry Point Mismatch

**package.json**:
```json
"main": "expo-router/entry"
```

**This means `App.tsx` is COMPLETELY IGNORED.**

The actual startup flow goes through `app/_layout.tsx`, NOT `App.tsx`.

---

## PHASE 2: RELEASE-ONLY CRASH POINTS

### 2.1 NATIVE MODULE INITIALIZATION

**Reanimated Import Location**:
- File: `/App.tsx` (line 9)
- Code: `import 'react-native-reanimated';`
- **PROBLEM**: This file is NOT the entry point!
- **ACTUAL ENTRY**: `app/_layout.tsx` does NOT have this import!

**Reanimated Usage in Screens**:
- File: `app/(tabs)/index.tsx` (line 17-28)
- Code:
```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  ...
} from 'react-native-reanimated';
```

**Analysis**: Reanimated requires the side-effect import (`import 'react-native-reanimated'`) to initialize the worklet runtime BEFORE any component uses it. Since this import is in the unused `App.tsx`, it's never executed in the release build.

---

### 2.2 NATIVEWIND PROCESSING

**global.css**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**app/_layout.tsx** imports:
```typescript
import '../global.css';
```

**app/index.tsx** (first screen):
```typescript
<View className="flex-1 items-center justify-center bg-red-500">
```

**Configuration**:
- NativeWind: v2.0.11
- Tailwind CSS: v3.4.19
- Expo SDK: 55
- React Native: 0.83.4

**Analysis**: NativeWind v2 with Expo SDK 55 has known compatibility issues. The CSS processing pipeline differs between dev (Metro with hot reload) and release (hermes bytecode bundle).

---

### 2.3 ENVIRONMENT VARIABLE PREFIX MISMATCH

**Files Using Wrong Prefix (NEXT_PUBLIC_*)**:
| File | Line | Variable |
|------|------|----------|
| `src/lib/firebase/firebase-service.ts` | 41-47 | NEXT_PUBLIC_FIREBASE_* |
| `src/lib/mapbox/mapbox-service.ts` | 7 | NEXT_PUBLIC_MAPBOX_TOKEN |
| `src/lib/firebase/fcm-service.ts` | 11-12 | NEXT_PUBLIC_FIREBASE_VAPID_KEY |

**Correct Prefix for Expo**: `EXPO_PUBLIC_*`

**Correct Usage** (`src/config/env.ts`):
```typescript
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || PRODUCTION_API_URL;
export const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
```

**Analysis**: The `NEXT_PUBLIC_*` variables will be `undefined` in release builds because Expo's bundler doesn't recognize that prefix. This could cause issues if these files are imported at startup.

---

### 2.4 METRO CONFIGURATION & BUNDLED FILES

**metro.config.js** blocks:
- `/src/app/.*` (Next.js routes)
- `/prisma/.*`
- `/mini-services/.*`

**BUT DOES NOT BLOCK**:
- `/src/lib/.*` - Contains files with `NEXT_PUBLIC_*` env vars
- `/src/components/.*` - Contains Next.js components

**Risk**: Files using `NEXT_PUBLIC_*` might get bundled but with undefined values.

---

### 2.5 STORE INITIALIZATION

**authStore.ts**:
- Line 21: `import * as SecureStore from 'expo-secure-store';`
- Line 160: Store created with `create<AuthState>((set, get) => ...)`
- Line 185-353: `initialize()` function called from... WHERE?

**Critical Issue**: 
- `App.tsx` calls `useAuthStore()` and `initialize()` (lines 59, 84-106)
- BUT `App.tsx` is NOT the entry point!
- `app/_layout.tsx` does NOT call `initialize()`
- Auth store is NEVER initialized in release builds

**However**: This shouldn't cause a crash - it would just mean auth state is uninitialized.

---

## PHASE 3: RANKED ROOT CAUSES

---

### #1 Most Likely Crash Source

**File**: `app/_layout.tsx`  
**Line**: 1 (missing import)  
**Code**: 
```typescript
// MISSING: import 'react-native-reanimated';
import '../global.css';
```

**Why it crashes release**: Reanimated's worklet runtime must be initialized via the side-effect import BEFORE any component uses `Animated`, `useSharedValue`, `useAnimatedStyle`, etc. In dev mode, Metro's hot reload and different bundling strategy may handle this differently. In release, the hermes bundle doesn't initialize the worklet runtime because the import is in the unused `App.tsx`.

**Why dev still works**: Metro's development bundler may include the `App.tsx` module differently, or the worklet runtime gets initialized through a different code path during development.

**Crash severity**: IMMEDIATE - Happens before first paint when any Reanimated code executes.

**Confidence**: HIGH (90%)

---

### #2 Most Likely Crash Source

**File**: `app/_layout.tsx` + `global.css`  
**Line**: 7 (`import '../global.css'`)  
**Code**:
```typescript
import '../global.css';
```

**Why it crashes release**: NativeWind v2.0.11 with Expo SDK 55 (React Native 0.83.4) may have compatibility issues. The `@tailwind` directives in `global.css` need to be processed correctly during the release build. If the CSS processing fails or produces invalid styles, React Native will crash when trying to apply `className` styles.

**Why dev still works**: Metro's development server processes CSS differently with hot module replacement. The NativeWind babel plugin may behave differently in dev vs release.

**Crash severity**: IMMEDIATE - Happens during initial render when NativeWind tries to apply styles.

**Confidence**: HIGH (85%)

---

### #3 Most Likely Crash Source

**File**: `src/lib/firebase/firebase-service.ts`  
**Line**: 41-47  
**Code**:
```typescript
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
```

**Why it crashes release**: `NEXT_PUBLIC_*` is a Next.js convention, NOT Expo. Expo uses `EXPO_PUBLIC_*`. These variables will be `undefined` in release builds. If this file is imported at startup (even if not used), and there's any code that crashes on undefined values, the app will crash.

**Why dev still works**: Development builds may have different environment variable handling, or the file may not be imported early in dev.

**Crash severity**: IMMEDIATE if file is imported at startup with undefined env checks.

**Confidence**: MEDIUM (70%)

---

### #4 Most Likely Crash Source

**File**: `src/lib/mapbox/mapbox-service.ts`  
**Line**: 7  
**Code**:
```typescript
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
```

**Why it crashes release**: Same issue as #3 - wrong environment variable prefix. Will be `undefined` in release.

**Why dev still works**: Development may handle undefined gracefully or have different bundling.

**Crash severity**: DEFERRED - May not crash immediately but could cause issues when map features are used.

**Confidence**: MEDIUM (65%)

---

### #5 Most Likely Crash Source

**File**: `app/index.tsx` (TailwindTestScreen)  
**Line**: 15-16  
**Code**:
```typescript
<View className="flex-1 items-center justify-center bg-red-500">
  <View className="bg-white p-8 rounded-2xl shadow-lg">
```

**Why it crashes release**: If NativeWind processing fails or produces invalid style objects, React Native's View component will receive invalid props. The `className` prop should be transformed to `style` prop by NativeWind's babel plugin.

**Why dev still works**: Development babel transformation may handle this correctly while release build pipeline has issues.

**Crash severity**: IMMEDIATE - Crashes during first render.

**Confidence**: MEDIUM (60%)

---

## IMMEDIATE PATCHES NEEDED

### Patch 1: Add Reanimated Import to app/_layout.tsx

**File**: `app/_layout.tsx`  
**Change**: Add `import 'react-native-reanimated';` as FIRST line

```typescript
// CRITICAL: Reanimated must be first import
import 'react-native-reanimated';

import '../global.css';
// ... rest of imports
```

### Patch 2: Fix Environment Variable Prefixes

**Files to update**:
- `src/lib/firebase/firebase-service.ts`: Change `NEXT_PUBLIC_*` to `EXPO_PUBLIC_*`
- `src/lib/mapbox/mapbox-service.ts`: Change `NEXT_PUBLIC_MAPBOX_TOKEN` to `EXPO_PUBLIC_MAPBOX_TOKEN`
- `src/lib/firebase/fcm-service.ts`: Change `NEXT_PUBLIC_FIREBASE_VAPID_KEY` to `EXPO_PUBLIC_FIREBASE_VAPID_KEY`

### Patch 3: Verify NativeWind Configuration

**Check**:
- `babel.config.js` has `'nativewind/babel'` plugin
- `tailwind.config.ts` content paths include `./app/**/*.{js,jsx,ts,tsx}`
- NativeWind is compatible with Expo SDK 55

### Patch 4: Remove/Block Next.js Specific Files from Bundle

**Add to metro.config.js blockList**:
```javascript
/src\/lib\/firebase\/firebase-service\.ts$/,  // Uses NEXT_PUBLIC_*
/src\/lib\/mapbox\/.*$/,
/src\/lib\/firebase\/fcm-service\.ts$/,
```

Or better: Fix the env prefix in those files.

---

## VERIFICATION STEPS

1. Apply Patch 1 (Reanimated import)
2. Build release APK
3. Test on physical device
4. If still crashes, apply Patch 2 (ENV prefixes)
5. Rebuild and test
6. If still crashes, investigate NativeWind configuration

---

## FILES TO PATCH (Priority Order)

1. `app/_layout.tsx` - Add Reanimated import
2. `src/lib/firebase/firebase-service.ts` - Fix ENV prefix
3. `src/lib/mapbox/mapbox-service.ts` - Fix ENV prefix
4. `src/lib/firebase/fcm-service.ts` - Fix ENV prefix

---

*Diagnosis completed. Do not apply patches yet - awaiting approval.*
