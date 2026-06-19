# Smart Ride — Build APK Locally from `expo-app/` (No EAS)

Build the **expo-app** project into a signed APK using **GitBash + Android Studio**, without using Expo's EAS cloud build service. Expo config plugins still run locally via `npx expo prebuild`.

> Project: `expo-app/` · Expo SDK 55 · React Native 0.83.6 · TypeScript
> Existing keystore: `expo-app/keystores/smartride-upload.keystore` (SHA-1 already registered in `google-services.json`)

---

## ⚠️ READ THIS FIRST — Why `installDebug` Produces a Crashing APK

**If your APK crashes immediately on open, it's because you built a DEBUG APK.**

`./gradlew installDebug` builds the **debug** variant, which does **NOT** bundle the JavaScript into the APK. The debug APK tries to fetch JS from a Metro dev server (`localhost:8081`) on your dev machine at runtime. On a real phone (which can't reach your computer's `localhost`), the JS load fails and the app crashes.

| Command | JS bundled in APK? | Works on real phone? |
|---|---|---|
| `./gradlew installDebug` | No | Crashes on open |
| `./gradlew assembleDebug` | No | Crashes on open |
| **`./gradlew assembleRelease`** | **Yes** | **Works standalone** |

### The Fix — Build a RELEASE APK

```bash
cd /c/path/to/my-project/expo-app
npx expo prebuild --platform android --clean
cd android
./gradlew clean
./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk` — a standalone APK that runs on any phone.

> See **[APK_CRASH_FIX.md](./APK_CRASH_FIX.md)** for the full diagnosis + troubleshooting.

---

## Prerequisites (one-time, if not already done)

| Tool | Version | Check command |
|---|---|---|
| Node.js | 18+ | `node -v` |
| JDK | 17 | `java -version` |
| Android Studio | latest | — |
| Android SDK | API 34 + Build-Tools 34 | via SDK Manager |
| Environment vars | `JAVA_HOME`, `ANDROID_HOME` set | `echo $JAVA_HOME` |

If any of these are missing, see the **Prerequisites** section at the bottom.

---

## Step 1 — Install JS dependencies

```bash
cd /c/path/to/my-project/expo-app
npm install
```

---

## Step 2 — Generate the native `android/` folder

```bash
cd /c/path/to/my-project/expo-app
npx expo prebuild --platform android --clean
```

`--clean` wipes the existing `android/` folder and regenerates from `app.json`. This applies the `withAbiSplits` (v3) and `withProguardRules` config plugins which force R8 minify OFF and write ProGuard keep rules.

---

## Step 3 — Wire the keystore into Gradle

Your keystore already exists at `expo-app/keystores/smartride-upload.keystore`.
Set passwords in `expo-app/android/gradle.properties`:

```properties
SMART_RIDE_UPLOAD_STORE_PASSWORD=your_keystore_password
SMART_RIDE_UPLOAD_KEY_ALIAS=smartride-upload
SMART_RIDE_UPLOAD_KEY_PASSWORD=your_key_password
```

> Use the **existing** `smartride-upload.keystore` only. Do NOT create a new keystore — its SHA-1 won't be in `google-services.json` and Google Sign-In will throw `DEVELOPER_ERROR`.

---

## Step 4 — Build the APK

```bash
cd /c/path/to/my-project/expo-app/android
./gradlew clean
./gradlew assembleRelease
```

First build takes 10–20 minutes (downloads Gradle, NDK, AndroidX, Mapbox native libs, etc.).

### KNOWN BUILD FAILURE: `minifyReleaseWithR8 FAILED`

If your build fails with:
```
> Task :app:minifyReleaseWithR8 FAILED
ERROR: Missing classes detected while running R8.
Missing class expo.modules.kotlin.types.AnyTypeCache
```

**Cause:** R8 minification is still enabled. The `withAbiSplits` v3 plugin forces it off, but you must re-run `npx expo prebuild --clean` to regenerate `android/` with the fix.

**Fix:**
```bash
cd /c/path/to/my-project/expo-app
npx expo prebuild --platform android --clean
cd android
./gradlew clean && ./gradlew assembleRelease
```

The `withProguardRules` plugin also writes `android/app/proguard-rules.pro` with `-dontwarn` rules for all the missing classes, so even if R8 runs, it won't fail.

---

## Step 5 — Locate the output

| Build type | Output path (relative to `expo-app/`) |
|---|---|
| Debug APK | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Release APK | `android/app/build/outputs/apk/release/app-release.apk` |
| Release AAB | `android/app/build/outputs/bundle/release/app-release.aab` |

```bash
ls -la android/app/build/outputs/apk/release/
```

---

## Step 6 — Install the APK on a phone

### Via USB (ADB)

```bash
adb devices
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### Via file copy (no ADB required)

Copy `app-release.apk` to your phone (Drive, WhatsApp, USB), open it in Files, allow "Install unknown apps", tap Install.

---

## Quick reference — the 3 commands you'll actually use

```bash
# 1. Install deps
cd /c/path/to/my-project/expo-app && npm install

# 2. Build release APK
cd /c/path/to/my-project/expo-app && npx expo prebuild --platform android --clean
cd android && ./gradlew clean && ./gradlew assembleRelease

# 3. Install on phone
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## Common errors and fixes

| Error | Fix |
|---|---|
| `minifyReleaseWithR8 FAILED` + "Missing class expo.modules.kotlin.types.*" | Re-run `npx expo prebuild --clean` to apply withAbiSplits v3 + withProguardRules plugins |
| `Keystore file not set for signing config release` | Set `SMART_RIDE_UPLOAD_*` env vars in `android/gradle.properties` |
| `DEVELOPER_ERROR` on Google Sign-In | You created a new keystore instead of using `keystores/smartride-upload.keystore` |
| `Cannot fit requested classes in a single dex file` | `multiDexEnabled true` is auto-added by withAbiSplits plugin; re-run prebuild |
| Mapbox crashes on launch | Token missing in `.env` (`EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`) |
| `./gradlew: Permission denied` | `chmod +x expo-app/android/gradlew` |
| `SDK location not found` | Create `android/local.properties` with `sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk` |
| UnsupportedClassVersionError | `JAVA_HOME` must point to JDK 17 (Android Studio's `jbr` folder) |
| Out of memory during build | Add `org.gradle.jvmargs=-Xmx4096m` to `android/gradle.properties` |
