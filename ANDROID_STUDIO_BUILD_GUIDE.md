# Smart Ride — Android Studio + GitBash Build Guide

This guide walks you through building the Smart Ride mobile app locally on Windows using **Android Studio** + **GitBash**, with no cloud build (EAS) required.

> **Prerequisites**: You already have Android Studio installed and a GitBash terminal.

---

## 0. One-time setup (skip if already done)

### 0.1 Install Node.js + Bun in GitBash

Open **GitBash** and run:

```bash
# Install nvm (Node Version Manager) for Windows
# Download from: https://github.com/coreybutler/nvm-windows/releases
# Install Node 20 LTS:
nvm install 20
nvm use 20

# Verify
node --version   # should print v20.x.x
npm --version

# Install Bun (faster than npm, used by this project)
powershell -c "irm bun.sh/install.ps1 | iex"

# Restart GitBash, then verify:
bun --version
```

### 0.2 Install Java 17 (required by Android Gradle Plugin)

```bash
# Download Temurin JDK 17 (free OpenJDK):
# https://adoptium.net/temurin/releases/?version=17

# Set JAVA_HOME in your Windows Environment Variables:
#   JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot
# Add to PATH: %JAVA_HOME%\bin

# Verify in GitBash:
java -version    # should print 17.x.x
```

### 0.3 Configure Android SDK

In **Android Studio**:
1. Open **Settings → Languages & Frameworks → Android SDK**
2. Install **Android SDK Platform 35** (Android 15) — required by Expo SDK 55
3. Install **Android SDK Build-Tools 35.0.0**
4. Install **Android SDK Command-line Tools (latest)**
5. Install **Android SDK Platform-Tools (latest)**

Set environment variables (Windows):
```
ANDROID_HOME = C:\Users\<you>\AppData\Local\Android\Sdk
PATH += %ANDROID_HOME%\platform-tools
PATH += %ANDROID_HOME%\emulator
PATH += %ANDROID_HOME%\cmdline-tools\latest\bin
```

Verify in GitBash:
```bash
adb --version           # Android Debug Bridge
sdkmanager --version    # SDK manager
```

### 0.4 Accept SDK licenses

```bash
# In GitBash:
yes | sdkmanager --licenses
```

---

## 1. Clone + install dependencies

```bash
# Clone your repo (if not already cloned)
git clone https://github.com/naturalintellectscrop-ctrl/Smart_Ride.git
cd Smart_Ride

# Checkout the main branch
git checkout main
git pull origin main

# Install root dependencies (for the Next.js web app)
bun install

# Switch to the Expo app folder
cd expo-app

# Install Expo app dependencies
bun install
```

---

## 2. Configure environment

Create `expo-app/.env` (this file is gitignored — never commit it):

```bash
cat > expo-app/.env <<'EOF'
# Backend API URL (your Vercel deployment)
EXPO_PUBLIC_API_BASE_URL=https://smartrideug.vercel.app/api

# Supabase (same values as the web app)
EXPO_PUBLIC_SUPABASE_URL=https://mmovwpdgrgdiyqheroak.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tb3Z3cGRncmdkaXlxaGVyb2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTMxNjYsImV4cCI6MjA5NDQyOTE2Nn0.tA78HjbHCvcFsmrwpNI8moWMVChzemLDFK3fvhdDv4w

# Mapbox (for maps) — get your own token from https://mapbox.com
EXPO_PUBLIC_MAPBOX_TOKEN=<your-mapbox-public-token>

# Google Sign-In (Android client ID)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=531949209415-h0ri57i233r1l767tnc4i26brdt3asb3.apps.googleusercontent.com
EOF
```

> **For local development against the sandbox backend**, use:
> ```
> EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000/api
> ```
> (The Android emulator uses `10.0.2.2` to reach the host machine's `localhost:3000`.)

---

## 3. Build a debug APK locally

### 3.1 Start the Metro bundler (in its own GitBash window)

```bash
cd /c/path/to/Smart_Ride/expo-app
bun run start
```

Leave this running. You should see the Metro bundler QR code + menu.

### 3.2 Build + install the debug APK (in a SECOND GitBash window)

Make sure an Android emulator is running (or a physical device is plugged in with USB debugging):

```bash
# Verify a device is connected:
adb devices

# Build + install the debug APK directly to the device/emulator:
cd /c/path/to/Smart_Ride/expo-app
bun run android
```

This runs `expo run:android`, which:
1. Generates the native Android project (`android/` folder) if it doesn't exist
2. Runs Gradle (`./gradlew assembleDebug`)
3. Installs the APK on the connected device
4. Starts the app

**First run takes 10–20 minutes** (Gradle downloads + native modules compile). Subsequent runs are 1–2 minutes.

### 3.3 Find the built APK

After a successful build, the APK is at:

```
expo-app/android/app/build/outputs/apk/debug/app-debug.apk
```

Copy it to your desktop:

```bash
cp expo-app/android/app/build/outputs/apk/debug/app-debug.apk ~/Desktop/SmartRide-debug.apk
```

---

## 4. Build a release APK (for testing / sideloading)

A release APK is smaller, faster, and closer to production behavior.

### 4.1 Generate a signing keystore (one-time)

```bash
# In GitBash, at the project root:
keytool -genkey -v -keystore expo-app/android/app/smartride.keystore \
  -alias smartride \
  -keyalg RSA -keysize 2048 -validity 10000

# It will prompt for:
#   - Keystore password (save this!)
#   - Key password (save this!)
#   - Your name, org, etc.
```

### 4.2 Configure Gradle to use the keystore

Create `expo-app/android/gradle.properties` (or edit existing):

```properties
SmartRide_UPLOAD_STORE_FILE=smartride.keystore
SmartRide_UPLOAD_KEY_ALIAS=smartride
SmartRide_UPLOAD_STORE_PASSWORD=*****   # your keystore password
SmartRide_UPLOAD_KEY_PASSWORD=*****     # your key password
```

Edit `expo-app/android/app/build.gradle` — add inside `android { ... }`:

```gradle
signingConfigs {
    release {
        storeFile file(SmartRide_UPLOAD_STORE_FILE)
        storePassword SmartRide_UPLOAD_STORE_PASSWORD
        keyAlias SmartRide_UPLOAD_KEY_ALIAS
        keyPassword SmartRide_UPLOAD_KEY_PASSWORD
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### 4.3 Build the release APK

```bash
cd expo-app/android
./gradlew assembleRelease
```

The release APK is at:

```
expo-app/android/app/build/outputs/apk/release/app-release.apk
```

---

## 5. Open the project in Android Studio (optional, for debugging native issues)

1. Open Android Studio
2. **File → Open** → select `expo-app/android/`
3. Wait for Gradle sync to complete
4. Use the **Build** menu or run configuration to build/install
5. Use **Logcat** to view native logs (filter by `com.smartride` or `ReactNativeJS`)

---

## 6. Common issues + fixes

### Issue: `SDK location not found`
**Fix**: Set `ANDROID_HOME` env var (see step 0.3). Or create `expo-app/android/local.properties`:
```
sdk.dir=C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk
```

### Issue: `Could not resolve all files for configuration ':classpath'`
**Fix**: Gradle version mismatch. Edit `expo-app/android/build.gradle` → change `com.android.tools.build:gradle` version to `8.5.0` (or whatever Expo recommends for SDK 55).

### Issue: `Minimum supported Gradle version is 8.x`
**Fix**: Edit `expo-app/android/gradle/wrapper/gradle-wrapper.properties` → set `distributionUrl=https\://services.gradle.org/distributions/gradle-8.10.2-bin.zip`

### Issue: Mapbox errors (`@rnmapbox/maps`)
**Fix**: Make sure you've set `EXPO_PUBLIC_MAPBOX_TOKEN` in `expo-app/.env`. The Mapbox SDK is downloaded at build time — your machine needs internet access during the first build.

### Issue: Google Sign-In crashes on Android
**Fix**: Make sure `expo-app/google-services.json` is present and matches your Firebase project. The `package` in `app.json` must match the `package_name` in `google-services.json` (currently `ug.smartride.app`).

### Issue: App installs but shows red error screen
**Fix**: 
1. Make sure Metro bundler is running (step 3.1)
2. Make sure `EXPO_PUBLIC_API_BASE_URL` in `expo-app/.env` is reachable from the emulator (use `http://10.0.2.2:3000/api` for the host machine's localhost)
3. Check Metro console for errors
4. In the app, shake the device (or press `Ctrl+M` in the emulator) → **Reload**

### Issue: `Task 'installDebug' not found`
**Fix**: The native Android project hasn't been generated yet. Run:
```bash
cd expo-app
npx expo prebuild --platform android
```
This generates the `android/` folder. Then re-run `bun run android`.

### Issue: Port 8081 already in use
**Fix**: Kill the old Metro process:
```bash
# In GitBash:
npx react-native-kill-packager
# Or manually:
netstat -ano | grep 8081
taskkill //PID <pid> //F
```

---

## 7. Quick reference — most common commands

```bash
# Start Metro bundler (always run this first)
cd expo-app && bun run start

# Build + install debug APK to connected device
cd expo-app && bun run android

# Generate native Android project (if android/ folder is missing)
cd expo-app && npx expo prebuild --platform android

# Build release APK
cd expo-app/android && ./gradlew assembleRelease

# View connected devices
adb devices

# View app logs
adb logcat -s ReactNativeJS:*

# Clear Metro cache (fixes weird bundler errors)
cd expo-app && bun run start --clear

# Clean Gradle build (fixes weird native errors)
cd expo-app/android && ./gradlew clean
```

---

## 8. Production deployment (when ready to publish to Play Store)

For Play Store, you need an **AAB** (Android App Bundle), not an APK:

```bash
cd expo-app/android
./gradlew bundleRelease
```

Output: `expo-app/android/app/build/outputs/bundle/release/app-release.aab`

Upload this to the Google Play Console → **Production → Create new release**.

> **Alternatively**, use EAS Build (cloud) which handles signing + submission automatically:
> ```bash
> cd expo-app
> eas build --platform android --profile production
> eas submit -p android
> ```
> This requires an Expo account and the `EAS_BUILD_NO_EXPO_WARNING` env var already set in `eas.json`.

---

## 9. Verify your build works

After installing the debug APK on an emulator/device:

1. App should launch showing the Smart Ride logo (transparent background)
2. Login screen should appear
3. Tap "Sign up" → enter phone number → app should reach the OTP screen
4. If `EXPO_PUBLIC_API_BASE_URL` is set to your Vercel deployment, OTPs will work end-to-end
5. After login, the home screen should show all 6 service cards

If any of these fail, check Metro console for errors and consult section 6.
