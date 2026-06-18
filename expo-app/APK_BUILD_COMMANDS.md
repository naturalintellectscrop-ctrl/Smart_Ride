# Smart Ride — Build APK Locally from `expo-app/` (No EAS)

Build the **expo-app** project into a signed APK using **GitBash + Android Studio**, without using Expo's EAS cloud build service. Expo config plugins still run locally via `npx expo prebuild`.

> Project: `expo-app/` · Expo SDK 55 · React Native 0.83.6 · TypeScript
> Existing keystore: `expo-app/keystores/smartride-upload.keystore` (SHA-1 already registered in `google-services.json`)

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

In GitBash, from the project root:

```bash
cd /c/path/to/my-project/expo-app
npm install
```

> If you use bun: `bun install`
> If you use yarn: `yarn install`

---

## Step 2 — Generate the native `android/` folder (skip if you already have it)

You said you already have the `android/` folder, so **skip this step**.
Only run it if `expo-app/android/` does not exist, or if you changed `app.json` plugins and need to regenerate:

```bash
cd /c/path/to/my-project/expo-app
npx expo prebuild --platform android --clean
```

`--clean` wipes the existing `android/` folder and regenerates from `app.json`. **Don't use `--clean` if you've manually edited files in `android/`** — those edits will be lost.

---

## Step 3 — Wire the keystore into Gradle (skip if already done)

Your keystore already exists at `expo-app/keystores/smartride-upload.keystore`.
Confirm it's wired into `android/app/build.gradle`. Open that file and look for:

```gradle
signingConfigs {
    release {
        storeFile file('../../keystores/smartride-upload.keystore')
        storePassword System.getenv('SMART_RIDE_UPLOAD_STORE_PASSWORD')
        keyAlias System.getenv('SMART_RIDE_UPLOAD_KEY_ALIAS')
        keyPassword System.getenv('SMART_RIDE_UPLOAD_KEY_PASSWORD')
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        ...
    }
}
```

If the passwords are read from env vars, set them in `expo-app/android/gradle.properties`:

```properties
SMART_RIDE_UPLOAD_STORE_PASSWORD=your_keystore_password
SMART_RIDE_UPLOAD_KEY_ALIAS=smartride-upload
SMART_RIDE_UPLOAD_KEY_PASSWORD=your_key_password
```

> ⚠️ Use the **existing** `smartride-upload.keystore` only. Do NOT create a new keystore — its SHA-1 won't be in `google-services.json` and Google Sign-In will throw `DEVELOPER_ERROR`.

---

## Step 4 — Build the APK

### 4.1 Clean previous build artifacts (always do this before a release build)

```bash
cd /c/path/to/my-project/expo-app/android
./gradlew clean
```

> On GitBash use `./gradlew` (with leading `./`). Do **not** use `gradlew.bat`.

### 4.2 Build the release APK

```bash
./gradlew assembleRelease
```

First build takes 10–20 minutes (downloads Gradle, NDK, AndroidX, Mapbox native libs, etc.).

### 4.3 Build a debug APK instead (faster, for quick testing)

```bash
./gradlew assembleDebug
```

### 4.4 Build a release AAB (for Play Store upload)

```bash
./gradlew bundleRelease
```

---

## Step 4.5 — KNOWN BUILD FAILURE: `minifyReleaseWithR8 FAILED`

If your build runs for ~40+ minutes and then fails with this:

```
> Task :app:minifyReleaseWithR8 FAILED

ERROR: Missing classes detected while running R8.
Missing class expo.modules.kotlin.types.AnyTypeCache
Missing class expo.modules.kotlin.types.OptimizedRecord
Missing class expo.modules.kotlin.types.descriptors.RawTypeDescriptor
Missing class expo.modules.kotlin.types.descriptors.TypeDescriptor
Missing class expo.modules.kotlin.types.descriptors.TypeDescriptorKt
Missing class expo.modules.kotlin.types.descriptors.TypeDescriptorOfKt
```

**Cause:** `app.json` enables `enableProguardInReleaseBuilds` + `enableShrinkInReleaseBuilds` via the `expo-build-properties` plugin. R8 aggressively strips classes and crashes on some expo-modules-kotlin internals referenced by `expo-image-picker`.

**Fix Option A — Fastest (1-line change, APK ~15 MB larger):**
Edit `android/app/build.gradle`, find the `release` buildType, set both flags to `false`:
```gradle
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false      // was true
        shrinkResources false    // was true
        proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
    }
}
```
Then re-run `./gradlew clean && ./gradlew assembleRelease`. No `prebuild` needed.

**Fix Option B — Proper (keeps minification, adds keep rules):**
R8 already generated the rules you need. Append them:
```bash
cd /c/path/to/my-project/expo-app/android/app
cat build/outputs/mapping/release/missing_rules.txt >> proguard-rules.pro
```
Or paste these lines manually into `proguard-rules.pro`:
```
-dontwarn expo.modules.kotlin.types.AnyTypeCache
-dontwarn expo.modules.kotlin.types.OptimizedRecord
-dontwarn expo.modules.kotlin.types.descriptors.RawTypeDescriptor
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptor
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptorKt
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptorOfKt
-keep class expo.modules.kotlin.** { *; }
-keep class expo.modules.imagepicker.** { *; }
-keep class com.mapbox.** { *; }
-keep class com.google.firebase.** { *; }
-dontwarn com.mapbox.**
-dontwarn com.google.firebase.**
```
Then re-run `./gradlew clean && ./gradlew assembleRelease`.

---

## Step 5 — Locate the output

| Build type | Output path (relative to `expo-app/`) |
|---|---|
| Debug APK | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Release APK | `android/app/build/outputs/apk/release/app-release.apk` |
| Release AAB | `android/app/build/outputs/bundle/release/app-release.aab` |

Verify the file exists:

```bash
ls -la /c/path/to/my-project/expo-app/android/app/build/outputs/apk/release/app-release.apk
```

---

## Step 6 — Install the APK on a phone

### Via USB (ADB)

```bash
# Make sure USB debugging is on, then:
adb devices
adb install -r /c/path/to/my-project/expo-app/android/app/build/outputs/apk/release/app-release.apk
```

### Via file copy

Copy `app-release.apk` to your phone (Drive, WhatsApp, USB), open it in Files, allow "Install unknown apps", tap Install.

---

## Quick reference — the 3 commands you'll actually use

```bash
# 1. Install deps
cd /c/path/to/my-project/expo-app && npm install

# 2. Build release APK
cd /c/path/to/my-project/expo-app/android && ./gradlew clean && ./gradlew assembleRelease

# 3. Install on phone
adb install -r /c/path/to/my-project/expo-app/android/app/build/outputs/apk/release/app-release.apk
```

---

## Common errors and fixes (GitBash/Windows specific)

| Error | Fix |
|---|---|
| `sdkmanager: command not found` | `ANDROID_HOME` env var not set. Restart GitBash after setting. |
| `UnsupportedClassVersionError` | Wrong JDK. `JAVA_HOME` must point to JDK 17 (use Android Studio's `jbr` folder). |
| `SDK location not found` | Create `expo-app/android/local.properties` with `sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk` (double backslashes). |
| `Keystore file not set for signing config release` | Step 3 not done — keystore not wired into `build.gradle` / `gradle.properties`. |
| `DEVELOPER_ERROR` on Google Sign-In | You created a new keystore instead of using `keystores/smartride-upload.keystore`. The registered SHA-1 must match. |
| `Cannot fit requested classes in a single dex file` | Add `multiDexEnabled true` to `defaultConfig` in `android/app/build.gradle`. |
| Mapbox crashes on launch | Token missing. Add `<meta-data android:name="com.mapbox.token" android:value="pk.xxx" />` inside `<application>` in `android/app/src/main/AndroidManifest.xml`. |
| `./gradlew: Permission denied` | `chmod +x expo-app/android/gradlew` |
| Build hangs at `bundleReleaseJsAndAssets` | Make sure Metro is NOT running in another tab, then re-run. |
| `Execution failed for ':app:generatePackageList'` | Run `npm install` again in `expo-app/`, then `./gradlew clean`. |
| Out of memory during build | Add `org.gradle.jvmargs=-Xmx4096m` to `expo-app/android/gradle.properties`. |
| `minifyReleaseWithR8 FAILED` + "Missing class expo.modules.kotlin.types.*" | See **Step 4.5** above. Either disable minify or add keep rules to proguard-rules.pro. |
| `adb: command not found` | Add `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk\platform-tools` to your `Path` env var, then restart GitBash. |
| `bash: adb: command not found` (after successful build) | Same as above — `adb` is in Android SDK's `platform-tools` folder. |

---

## Prerequisites detail (only if Step 0 check failed)

### Install JDK 17
Android Studio bundles JDK 17 in its `jbr` folder. Set `JAVA_HOME` to:
```
C:\Program Files\Android\Android Studio\jbr
```

### Set Windows environment variables
- `Win` → type "Environment Variables" → Edit the system environment variables → Environment Variables…
- Add under "User variables":
  - `JAVA_HOME` = `C:\Program Files\Android\Android Studio\jbr`
  - `ANDROID_HOME` = `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`
  - `ANDROID_SDK_ROOT` = `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`
- Edit `Path` → add:
  - `%ANDROID_HOME%\platform-tools`
  - `%ANDROID_HOME%\emulator`
  - `%ANDROID_HOME%\cmdline-tools\latest\bin`
- **Restart GitBash** so the new env vars load.

### Install Android SDK components
Android Studio → More Actions → SDK Manager:
- SDK Platforms → check **Android 14 (API 34)**
- SDK Tools → check **Android SDK Build-Tools 34**, **Platform-Tools**, **Command-line Tools (latest)**

Accept licenses:
```bash
yes | sdkmanager --licenses
```

---

That's it. No EAS, no Expo cloud, no `mobile/` folder involvement.
