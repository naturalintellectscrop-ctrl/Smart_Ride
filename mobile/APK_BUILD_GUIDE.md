# Smart Ride — Build APK with GitBash + Android Studio (No Expo)

This guide builds the **React Native CLI** app in `/mobile` into a signed APK.
It assumes you are on **Windows**, using **GitBash** as your terminal and
**Android Studio** as your SDK manager. Expo is **not** used at any step.

> Project: `mobile/` · React Native 0.73.2 · TypeScript · Zustand · @rnmapbox/maps

---

## 0. What you will end up with

| Artifact | Path |
|---|---|
| Debug APK (for testing) | `mobile/android/app/build/outputs/apk/debug/app-debug.apk` |
| Release APK (for sharing) | `mobile/android/app/build/outputs/apk/release/app-release.apk` |
| Release AAB (for Play Store) | `mobile/android/app/build/outputs/bundle/release/app-release.aab` |

---

## 1. Install prerequisites (one-time)

### 1.1 Node.js 18+
Download LTS from https://nodejs.org and install. Verify in GitBash:
```bash
node -v   # should print v18.x or higher
npm -v
```

### 1.2 JDK 17 (REQUIRED — RN 0.73 needs JDK 17, not 11)
1. Download **Microsoft Build of OpenJDK 17** (Android Studio bundles this — see 1.3).
2. Or install from https://learn.microsoft.com/java/openjdk/
3. Verify:
```bash
java -version    # must say "17.x.x"
javac -version
```

### 1.3 Android Studio
Download from https://developer.android.com/studio and install with **default options**.
When the Setup Wizard runs, make sure these components are checked:
- Android SDK Platform
- Android SDK Build-Tools
- Android Emulator
- Android SDK Platform-Tools
- Intel HAXM / Hyper-V (for emulator)

### 1.4 Install Android SDK components via Studio
Open Android Studio → **More Actions** → **SDK Manager**:
- **SDK Platforms** tab → check **Android 14 (API 34)** (RN 0.73 default)
- **SDK Tools** tab → check:
  - Android SDK Build-Tools 34
  - Android SDK Command-line Tools (latest)
  - Android SDK Platform-Tools
  - Google Play services

Click **Apply** and let them download.

---

## 2. Set environment variables (Windows — permanent)

This is the #1 cause of build failures. Do it carefully.

### 2.1 Open Environment Variables editor
- Press `Win` → type **"Environment Variables"** → click **"Edit the system environment variables"**
- Click **"Environment Variables…"** button

### 2.2 Add these under "User variables" (click New…)

| Variable | Value (adjust your username) |
|---|---|
| `JAVA_HOME` | `C:\Program Files\Android\Android Studio\jbr` |
| `ANDROID_HOME` | `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk` |
| `ANDROID_SDK_ROOT` | `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk` |

> `JAVA_HOME` must point at the JDK that ships with Android Studio (`jbr` folder).
> Verify the path actually exists in Explorer before saving.

### 2.3 Edit `Path` → add these three lines (each on its own)
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%ANDROID_HOME%\cmdline-tools\latest\bin
```

### 2.4 Restart GitBash (IMPORTANT — env vars only load on restart)
Then verify:
```bash
echo $JAVA_HOME
echo $ANDROID_HOME
adb --version        # should print Android Debug Bridge version
sdkmanager --version # should print a version number
```

If any of these are blank or "command not found", your env vars are wrong. Fix before continuing.

---

## 3. Generate the native `android/` folder

Your `mobile/` folder is JS-only — it has no `android/` directory yet.
We generate it from the official RN template without losing your code.

### 3.1 In GitBash, go to the project root (NOT inside /mobile)
```bash
cd /c/path/to/my-project
```

### 3.2 Generate a fresh RN project into a temp folder
```bash
npx --yes react-native@0.73.2 init SmartRideTemp --pm npm --skip-git-init --skip-install
```
This downloads the official RN 0.73 template (which includes `android/`, `ios/`,
`index.js`, `babel.config.js`, `metro.config.js`, etc.).

### 3.3 Copy ONLY the native + config files into your mobile folder
```bash
cd /c/path/to/my-project

# Copy the native android folder
cp -r SmartRideTemp/android mobile/android

# Copy the native iOS folder (skip if you don't build iOS)
cp -r SmartRideTemp/ios mobile/ios

# Copy required root config files
cp SmartRideTemp/index.js               mobile/index.js
cp SmartRideTemp/babel.config.js        mobile/babel.config.js
cp SmartRideTemp/metro.config.js        mobile/metro.config.js
cp SmartRideTemp/tsconfig.json          mobile/tsconfig.json
cp SmartRideTemp/.gitignore             mobile/.gitignore
cp SmartRideTemp/.watchmanconfig        mobile/.watchmanconfig
cp SmartRideTemp/Gemfile                mobile/Gemfile         2>/dev/null || true
```

### 3.4 Clean up the temp project
```bash
rm -rf SmartRideTemp
```

### 3.5 Verify
```bash
ls mobile/android        # should list: app/ gradle/ settings.gradle build.gradle gradlew
ls mobile/index.js       # should exist
```

---

## 4. Install JS dependencies

```bash
cd /c/path/to/my-project/mobile
npm install
```

If you hit native-peer-dependency warnings, that's fine. Continue.

---

## 5. Configure the Android project

### 5.1 Set the app name & package id
Edit `mobile/android/app/src/main/res/values/strings.xml`:
```xml
<resources>
    <string name="app_name">Smart Ride</string>
</resources>
```

Edit `mobile/android/app/build.gradle` → find `applicationId` and set:
```gradle
applicationId "com.smartride.app"
```

Use the **same** value in:
- `mobile/android/app/src/main/java/com/smartride/app/MainActivity.java` (folder path must match)
- `mobile/android/app/src/main/AndroidManifest.xml` → `package="com.smartride.app"`

If you change the package, also rename the Java folder:
```bash
cd mobile/android/app/src/main/java
mkdir -p com/smartride/app
mv com/smartridetemp/MainActivity.java com/smartride/app/MainActivity.java
# then delete the old empty temp package folder
rm -rf com/smartridetemp
```
Update the `package com.smartride.app;` line at the top of MainActivity.java.

### 5.2 Add required Android permissions
Edit `mobile/android/app/src/main/AndroidManifest.xml` — add inside `<manifest>`
(above `<application>`):
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

Inside `<application>` add (for cleartext dev API access — REMOVE for prod):
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<application
    android:usesCleartextTraffic="true"
    android:networkSecurityConfig="@xml/network_security_config"
    ... >
```
Create `mobile/android/app/src/main/res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">your-api-domain.com</domain>
    </domain-config>
</network-security-config>
```

### 5.3 Mapbox token (REQUIRED — @rnmapbox/maps is a dependency)
1. Get a token from https://account.mapbox.com/access-tokens/
2. Edit `mobile/android/app/src/main/AndroidManifest.xml` → inside `<application>`:
```xml
<meta-data
    android:name="com.mapbox.token"
    android:value="pk.YOUR_MAPBOX_PUBLIC_TOKEN_HERE" />
```
3. Also set it in `mobile/src/components/MapboxMap.tsx` if the file reads from a constant.

### 5.4 Firebase (for push notifications — @react-native-firebase/messaging)
1. Go to https://console.firebase.google.com → create project → add Android app
2. Package name must match `applicationId` from step 5.1 (`com.smartride.app`)
3. Download `google-services.json`
4. Place it at `mobile/android/app/google-services.json`
5. Edit `mobile/android/build.gradle` (project-level) — add classpath:
```gradle
buildscript {
    dependencies {
        classpath("com.google.gms:google-services:4.4.0")
    }
}
```
6. Edit `mobile/android/app/build.gradle` (app-level) — add at the very bottom:
```gradle
apply plugin: "com.google.gms.google-services"
```

---

## 6. Create a signing keystore (for release APK)

### 6.1 Generate the keystore in GitBash
```bash
cd /c/path/to/my-project/mobile/android/app

keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore smartride-release.keystore \
  -alias smartride-key \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```
You'll be prompted for:
- Keystore password → pick a strong one, **save it somewhere safe**
- Re-enter password
- First & last name → e.g. `Smart Ride Dev`
- Organizational unit → `Mobile`
- Organization → `Smart Ride`
- City → `Kampala`
- State → `Kampala`
- Country code → `UG`
- Confirm → `yes`

### 6.2 Verify the keystore exists
```bash
ls -la smartride-release.keystore   # ~3-4 KB file
```

> **NEVER** commit this file to git. It's already covered by `.gitignore` in step 7.2.

---

## 7. Wire the keystore into Gradle

### 7.1 Create `mobile/android/gradle.properties` signing entries
Add these lines (replace with YOUR actual values from step 6.1):
```properties
SMART_RIDE_UPLOAD_STORE_FILE=smartride-release.keystore
SMART_RIDE_UPLOAD_KEY_ALIAS=smartride-key
SMART_RIDE_UPLOAD_STORE_PASSWORD=your_keystore_password
SMART_RIDE_UPLOAD_KEY_PASSWORD=your_key_password
```

### 7.2 Make sure `mobile/android/app/.gitignore` excludes secrets
Append:
```
*.keystore
google-services.json
```

### 7.3 Edit `mobile/android/app/build.gradle` — add signing config
Find the `android { ... }` block and add inside it (right after `defaultConfig`):

```gradle
signingConfigs {
    release {
        if (project.hasProperty('SMART_RIDE_UPLOAD_STORE_FILE')) {
            storeFile file(SMART_RIDE_UPLOAD_STORE_FILE)
            storePassword SMART_RIDE_UPLOAD_STORE_PASSWORD
            keyAlias SMART_RIDE_UPLOAD_KEY_ALIAS
            keyPassword SMART_RIDE_UPLOAD_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
    }
}
```

### 7.4 (Optional) Create `mobile/android/app/proguard-rules.pro`
```
# Keep Mapbox & Firebase classes
-keep class com.mapbox.** { *; }
-keep class com.google.firebase.** { *; }
-dontwarn com.mapbox.**
```

---

## 8. Build the APK 🚀

### 8.1 First time only — run a debug build to catch errors fast
```bash
cd /c/path/to/my-project/mobile
npx react-native run-android   # builds + installs on emulator/device
```
Fix any errors that come up before doing the release build.

### 8.2 Clean previous builds (do this before every release build)
```bash
cd /c/path/to/my-project/mobile/android
./gradlew clean
```
> On Windows GitBash use `./gradlew` (with the leading `./`). Do NOT use `gradlew.bat`.

### 8.3 Build the RELEASE APK
```bash
cd /c/path/to/my-project/mobile/android
./gradlew assembleRelease
```
Build takes 5–15 minutes the first time (downloads Gradle, NDK, etc.).

### 8.4 Build a release AAB (for Play Store)
```bash
./gradlew bundleRelease
```

### 8.5 Locate the output
```bash
# APK:
ls -la mobile/android/app/build/outputs/apk/release/app-release.apk

# AAB:
ls -la mobile/android/app/build/outputs/bundle/release/app-release.aab
```

---

## 9. Install the APK on a phone

### 9.1 Via USB cable (recommended)
1. On the phone: **Settings → About phone → tap Build number 7 times** to enable Developer Mode
2. **Settings → Developer options → enable USB debugging**
3. Plug phone into PC via USB
4. In GitBash:
```bash
adb devices                       # should list your phone
adb install -r mobile/android/app/build/outputs/apk/release/app-release.apk
```

### 9.2 Via file copy
- Copy `app-release.apk` to your phone (WhatsApp, email, Google Drive, USB transfer)
- On the phone, open Files app → tap the APK → allow "Install unknown apps"
- Tap **Install**

---

## 10. Common GitBash/Windows errors and fixes

| Error | Fix |
|---|---|
| `sdkmanager: command not found` | `ANDROID_HOME` not set or GitBash not restarted. Re-do step 2. |
| `java.lang.UnsupportedClassVersionError` | Wrong JDK. `JAVA_HOME` must point to JDK 17, not 11. |
| `Failed to install the following Android SDK packages as some licences have not been accepted` | Run: `yes \| sdkmanager --licenses` (in GitBash) |
| `Could not resolve com.facebook.react:react-native-gradle-plugin` | Run `npm install` in `mobile/` first, then `./gradlew clean`. |
| `Execution failed for task ':app:mergeReleaseResources'` | Bad XML in AndroidManifest or strings.xml. Re-check steps 5.1 & 5.2. |
| `Keystore file not set for signing config release` | `gradle.properties` not loaded. Confirm it's at `mobile/android/gradle.properties` and keys match step 7.1. |
| `Cannot fit requested classes in a single dex file` | Add `multiDexEnabled true` to `defaultConfig` in `app/build.gradle`. |
| Mapbox crashes on launch | Step 5.3 not done — `com.mapbox.token` meta-data missing in manifest. |
| App crashes with "FirebaseApp not initialized" | Step 5.4 not done — `google-services.json` missing or `apply plugin` line missing. |
| `./gradlew: Permission denied` | Run `chmod +x mobile/android/gradlew`. |
| Metro bundler won't start | In a separate GitBash tab: `cd mobile && npm start -- --reset-cache`. |
| Build hangs at `> Task :app:bundleReleaseJsAndAssets` | Make sure Metro is NOT running, then re-run `./gradlew assembleRelease`. |

---

## 11. Quick reference — the 3 commands you'll use daily

```bash
# Start Metro (keep this GitBash tab open)
cd /c/path/to/my-project/mobile && npm start

# Run on connected device/emulator (debug)
cd /c/path/to/my-project/mobile && npx react-native run-android

# Build signed release APK
cd /c/path/to/my-project/mobile/android && ./gradlew clean && ./gradlew assembleRelease
```

---

## 12. Verify the APK is signed correctly (optional sanity check)

```bash
cd mobile/android/app/build/outputs/apk/release
# Windows Android Studio ships apksigner here:
"$ANDROID_HOME/build-tools/34.0.0/apksigner" verify --print-certs app-release.apk
```
You should see `Verified using v1 scheme (JAR signing)` and/or `v2 scheme (APK Signature Scheme v2)`.

---

## TL;DR flow for repeat builds

1. `cd mobile/android`
2. `./gradlew clean`
3. `./gradlew assembleRelease`
4. APK is at `mobile/android/app/build/outputs/apk/release/app-release.apk`
5. `adb install -r <path-to-apk>`

Done. No Expo involved at any step.
