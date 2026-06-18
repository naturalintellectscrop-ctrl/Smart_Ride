# 🚨 APK Crashes on Open — Root Cause & Fix

## The Problem

You built the APK with:
```bash
./gradlew installDebug
```

The app installs on your phone, but when you tap the icon, it **crashes immediately** (or shows a brief white/red screen then closes).

---

## The Root Cause (Why It Crashes)

### `installDebug` builds a DEBUG APK — and debug APKs do NOT contain the JavaScript.

Here's what happens, step by step:

| Step | What happens |
|---|---|
| 1 | You run `./gradlew installDebug` |
| 2 | Gradle builds the **debug** variant of the APK |
| 3 | The debug APK contains the **native shell** (Java/Kotlin code + native modules) but **NOT the JavaScript bundle** |
| 4 | You install it on your phone and tap the icon |
| 5 | The native app starts, then tries to fetch the JS bundle from a **Metro dev server** running at `http://localhost:8081` on your **dev computer** |
| 6 | Your phone can't reach `localhost` on your computer (they're different devices) |
| 7 | The JS bundle fails to load → the app crashes with: `Error: Unable to load script. Make sure you're either running Metro or that your bundle 'index.android.bundle' is packaged correctly.` |

### Debug vs Release — the key difference

| Build type | JS bundle included? | Needs Metro running? | Works on a real phone? |
|---|---|---|---|
| `installDebug` / `assembleDebug` | ❌ No (fetches from Metro) | ✅ Yes | ❌ No (phone can't reach Metro) |
| `assembleRelease` | ✅ Yes (bundled into APK) | ❌ No | ✅ Yes — standalone, works anywhere |

**`installDebug` is a development command.** It's meant for when you have Metro running (`npx expo start`) and want to hot-reload code on an emulator or a phone connected via USB to the dev machine. It is **NOT** for producing a shareable APK.

---

## The Fix — Build a RELEASE APK

A release APK bundles the JavaScript into the APK file, so it runs standalone on any phone without Metro.

### Step 1 — Regenerate the `android/` folder (IMPORTANT — do this first)

You changed `app.json` and config plugins since the last `prebuild`. The `android/` folder on your machine is stale. Regenerate it so the latest R8-disable settings are applied:

```bash
cd /c/path/to/my-project/expo-app
npx expo prebuild --platform android --clean
```

> `--clean` wipes the old `android/` folder and regenerates from `app.json`. This is required because the `withAbiSplits` plugin was updated to **force** `minifyEnabled false` in the release block — the old `android/` folder doesn't have this fix.

### Step 2 — Make sure your keystore passwords are set

The release build needs to be signed. Your keystore is at `expo-app/keystores/smartride-upload.keystore`.

Create or edit `expo-app/android/gradle.properties` and add these lines (replace with your actual keystore password — you set this when you created the keystore):

```properties
SMART_RIDE_UPLOAD_STORE_PASSWORD=your_keystore_password
SMART_RIDE_UPLOAD_KEY_ALIAS=smartride-upload
SMART_RIDE_UPLOAD_KEY_PASSWORD=your_key_password
```

> ⚠️ If you don't remember the password, you have two options:
> 1. Use the **debug signing config** for release (fastest, for testing only) — see "Quick Fix" below
> 2. Create a new keystore (but then Google Sign-In will break — the SHA-1 won't match `google-services.json`)

### Step 3 — Build the release APK

```bash
cd /c/path/to/my-project/expo-app/android
./gradlew clean
./gradlew assembleRelease
```

This takes 10–20 minutes the first time (downloads Gradle, NDK, AndroidX, Mapbox native libs, etc.).

### Step 4 — Locate the APK

```bash
ls -la /c/path/to/my-project/expo-app/android/app/build/outputs/apk/release/
```

You should see `app-release.apk` (typically 40–80 MB). This is your **standalone, shareable APK**.

### Step 5 — Install on your phone

**Via USB (ADB):**
```bash
adb install -r app-release.apk
```

**Via file copy (no USB needed):**
1. Copy `app-release.apk` to your phone (Google Drive, WhatsApp, USB, etc.)
2. Open it in the Files app on your phone
3. Allow "Install unknown apps" if prompted
4. Tap **Install** → **Open**

The app will now launch without crashing. 🎉

---

## Quick Fix — Use Debug Signing for Release (if keystore is lost)

If you can't sign with your upload keystore, you can make the release build use the debug keystore. This is fine for testing (Google Sign-In won't work, but the app will run):

Open `expo-app/android/app/build.gradle`, find the `release` block inside `buildTypes`, and change:

```gradle
buildTypes {
    release {
        // CHANGE THIS:
        // signingConfig signingConfigs.release
        // TO THIS:
        signingConfig signingConfigs.debug

        minifyEnabled false
        shrinkResources false
        proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
    }
}
```

Then run `./gradlew assembleRelease`. The APK will be signed with the debug key and install on any phone.

---

## If the Release Build Fails

### Error: `minifyReleaseWithR8 FAILED` + "Missing class expo.modules.kotlin.types.*"

This means R8 minification is still enabled. The fix:

1. **Regenerate android/**: `npx expo prebuild --platform android --clean` (this applies the updated `withAbiSplits` plugin which forces `minifyEnabled false`)
2. **OR manually edit** `expo-app/android/app/build.gradle`, find the `release` block, and set:
   ```gradle
   release {
       minifyEnabled false
       shrinkResources false
       proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
   }
   ```
3. Re-run `./gradlew clean && ./gradlew assembleRelease`

### Error: `Keystore file not set for signing config release`

Your keystore passwords aren't set. See **Step 2** above.

### Error: `Cannot fit requested classes in a single dex file`

Add `multiDexEnabled true` to `defaultConfig` in `android/app/build.gradle`. The updated `withAbiSplits` plugin now does this automatically — regenerate with `npx expo prebuild --clean`.

### Error: `SDK location not found`

Create `expo-app/android/local.properties` with:
```
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```
(double backslashes)

---

## How to Verify the Fix Worked

After building the release APK and installing it:

1. **Open the app** — it should show the Smart Ride splash screen with the green background and logo, NOT crash.
2. **Tap "Continue with Phone"** — it should navigate to the phone login screen.
3. **Check the app works offline** — turn off WiFi/data, reopen the app. It should still launch (the splash + login screens work offline; only API calls will fail).

If it still crashes after building a release APK, the issue is NOT the JS bundle — it's a native crash. Capture the crash log:

```bash
# With phone connected via USB and USB debugging on:
adb logcat *:E ReactNative:V ReactNativeJS:V
```

Then tap the app icon to reproduce the crash. The logcat output will show the exact Java exception. Send that log to support and we can diagnose further.

---

## Summary — TL;DR

| What you did | What happens | What to do instead |
|---|---|---|
| `./gradlew installDebug` | Debug APK, no JS bundle, crashes on phone | `./gradlew assembleRelease` |

**The one command that fixes it:**
```bash
cd /c/path/to/my-project/expo-app/android && ./gradlew assembleRelease
```

Output APK: `app/build/outputs/apk/release/app-release.apk`

This APK is standalone — no Metro, no dev server, no USB connection needed. Install it on any phone and it runs.
