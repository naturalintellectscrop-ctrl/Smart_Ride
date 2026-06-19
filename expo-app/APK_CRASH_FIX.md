# APK Crashes on Open — Root Cause & Fix

## The Problem

You built the APK with:
```bash
./gradlew installDebug
```

The app installs on your phone, but when you tap the icon, it **crashes immediately** (or shows a brief white screen then closes).

---

## The Root Cause (Why It Crashes)

### `installDebug` builds a DEBUG APK — and debug APKs do NOT contain the JavaScript.

| Step | What happens |
|---|---|
| 1 | You run `./gradlew installDebug` |
| 2 | Gradle builds the **debug** variant of the APK |
| 3 | The debug APK contains the **native shell** but **NOT the JavaScript bundle** |
| 4 | You install it on your phone and tap the icon |
| 5 | The native app starts, then tries to fetch the JS bundle from a **Metro dev server** at `http://localhost:8081` on your **dev computer** |
| 6 | Your phone can't reach `localhost` on your computer (different devices) |
| 7 | The JS bundle fails to load -> the app crashes |

### Debug vs Release — the key difference

| Build type | JS bundle included? | Needs Metro running? | Works on a real phone? |
|---|---|---|---|
| `installDebug` / `assembleDebug` | No (fetches from Metro) | Yes | No (phone can't reach Metro) |
| `assembleRelease` | Yes (bundled into APK) | No | Yes — standalone, works anywhere |

---

## The Fix — Build a RELEASE APK

### Step 1 — Regenerate the `android/` folder

```bash
cd /c/path/to/my-project/expo-app
npx expo prebuild --platform android --clean
```

This applies the `withAbiSplits` v3 plugin (forces `minifyEnabled false`) and `withProguardRules` plugin (writes ProGuard keep rules).

### Step 2 — Set keystore passwords

In `expo-app/android/gradle.properties`:
```properties
SMART_RIDE_UPLOAD_STORE_PASSWORD=your_keystore_password
SMART_RIDE_UPLOAD_KEY_ALIAS=smartride-upload
SMART_RIDE_UPLOAD_KEY_PASSWORD=your_key_password
```

### Step 3 — Build the release APK

```bash
cd /c/path/to/my-project/expo-app/android
./gradlew clean
./gradlew assembleRelease
```

### Step 4 — Locate the APK

```bash
ls -la app/build/outputs/apk/release/
```

You should see `app-release.apk` (40-80 MB).

### Step 5 — Install on your phone

**Via USB (ADB):**
```bash
adb install -r app-release.apk
```

**Via file copy:**
1. Copy `app-release.apk` to your phone (Google Drive, WhatsApp, USB)
2. Open it in the Files app
3. Allow "Install unknown apps" if prompted
4. Tap **Install** -> **Open**

---

## Quick Fix — Use Debug Signing for Release (if keystore is lost)

Open `expo-app/android/app/build.gradle`, find the `release` block inside `buildTypes`, and change:
```gradle
buildTypes {
    release {
        signingConfig signingConfigs.debug  // was signingConfigs.release
        minifyEnabled false
        shrinkResources false
        proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
    }
}
```

---

## If the Release Build Fails

### Error: `minifyReleaseWithR8 FAILED` + "Missing class expo.modules.kotlin.types.*"

R8 minification is still enabled. Fix:

**Option A — Regenerate android/ (recommended):**
```bash
cd /c/path/to/my-project/expo-app
npx expo prebuild --platform android --clean
cd android
./gradlew clean && ./gradlew assembleRelease
```

**Option B — Manually edit build.gradle:**
Find the `release` block INSIDE `buildTypes { ... }` (NOT `signingConfigs`), set:
```gradle
release {
    signingConfig signingConfigs.release
    minifyEnabled false
    shrinkResources false
    proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
}
```

**Option C — Belt-and-suspenders (already in place):**
The `withProguardRules` plugin auto-generates `android/app/proguard-rules.pro` with `-dontwarn` rules for every missing class. Even if R8 runs, it won't fail.

### Error: `Keystore file not set for signing config release`
See Step 2 above.

### Error: `Cannot fit requested classes in a single dex file`
`multiDexEnabled true` is auto-added by the withAbiSplits plugin; re-run prebuild.

---

## How to Verify the Fix Worked

1. **Open the app** — it should show the Smart Ride splash screen, NOT crash.
2. **Tap "Continue with Phone"** — it should navigate to the phone login screen.
3. **Check offline** — turn off WiFi/data, reopen. Splash + login work offline.

If it still crashes after a release APK, capture the crash log:
```bash
adb logcat *:E ReactNative:V ReactNativeJS:V
```

---

## Summary — TL;DR

| What you did | What happens | What to do instead |
|---|---|---|
| `./gradlew installDebug` | Debug APK, no JS bundle, crashes on phone | `./gradlew assembleRelease` |

**The one command that fixes it:**
```bash
cd /c/path/to/my-project/expo-app/android && ./gradlew assembleRelease
```
