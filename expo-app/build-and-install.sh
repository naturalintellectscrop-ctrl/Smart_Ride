#!/usr/bin/env bash
# ============================================================
# SMART RIDE — One-Command APK Build + Install
# ============================================================
# Usage:  bash build-and-install.sh
#
# Can be run from ANY directory — auto-detects its own location.
#
# What this does:
#   1. git pull  (get latest code + google-services.json)
#   2. npx expo prebuild --clean  (regenerate native Android project)
#   3. INJECT signing config  (so APK is signed with upload keystore, NOT debug)
#   4. Delete .cxx + build caches  (prevents CMake/ninja errors)
#   5. ./gradlew clean  (clear old build artifacts)
#   6. ./gradlew assembleRelease  (build signed APK — ~40-60 min)
#   7. VERIFY APK signing cert SHA-1 matches Firebase-registered SHA-1
#   8. Find the APK + install + launch
# ============================================================

set -e  # exit on first error

# ─── Colors ───────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── Resolve script's absolute directory ──────
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Smart Ride — Build & Install APK${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Working directory: $SCRIPT_DIR${NC}"
echo ""

# ─── Verify expo-app root ─────────────────────
if [ ! -f "package.json" ]; then
  echo -e "${RED}✗ ERROR: package.json not found in $SCRIPT_DIR${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Confirmed: in expo-app root${NC}"
echo ""

# ─── Expected SHA-1 (from keystore + google-services.json) ───
EXPECTED_SHA1="98:EA:9B:4B:18:47:E1:CA:61:A0:49:10:80:5B:BD:22:DB:9D:78:F4"

# ─── Step 0: Check ADB ────────────────────────
ADB=""
if command -v adb &> /dev/null; then
  ADB="adb"
elif [ -f "/c/Users/GODWIN/AppData/Local/Android/Sdk/platform-tools/adb.exe" ]; then
  ADB="/c/Users/GODWIN/AppData/Local/Android/Sdk/platform-tools/adb.exe"
fi

if [ -n "$ADB" ]; then
  echo -e "${CYAN}[1/9] Checking connected device...${NC}"
  DEVICES=$("$ADB" devices | grep -v "List of devices" | grep "device" || true)
  if [ -z "$DEVICES" ]; then
    echo -e "${RED}✗ No phone connected via USB.${NC}"
    echo -e "${YELLOW}  Build continues, install will be skipped.${NC}"
    ADB=""
  else
    echo -e "${GREEN}✓ Phone connected:${NC}"
    echo "$DEVICES" | head -1
  fi
  echo ""
fi

# ─── Step 1: git pull ─────────────────────────
echo -e "${CYAN}[2/9] Pulling latest code...${NC}"
git pull origin main
echo -e "${GREEN}✓ Code up to date${NC}"
echo ""

# ─── Step 2: expo prebuild ────────────────────
echo -e "${CYAN}[3/9] Regenerating native Android project...${NC}"
npx expo prebuild --platform android --clean
echo -e "${GREEN}✓ Native project regenerated${NC}"
echo ""

# ─── Step 3: INJECT signing config ────────────
# expo prebuild --clean wipes android/gradle.properties. Without signing
# config, the release APK gets signed with the PC's DEBUG keystore (different
# SHA-1 on every machine) → DEVELOPER_ERROR on Google Sign-In.
# We inject the upload keystore config so the APK is always signed with
# keystores/smartride-upload.keystore (SHA-1 registered in Firebase).
echo -e "${CYAN}[4/9] Injecting signing config (upload keystore)...${NC}"
cd android

KEYSTORE_PATH="$SCRIPT_DIR/keystores/smartride-upload.keystore"
if [ ! -f "$KEYSTORE_PATH" ]; then
  echo -e "${RED}✗ Upload keystore not found at: $KEYSTORE_PATH${NC}"
  echo -e "${YELLOW}  Cannot sign APK. Aborting.${NC}"
  exit 1
fi

# Read keystore password from env var, or prompt, or use default
if [ -z "$SMART_RIDE_KEYSTORE_PASSWORD" ]; then
  # Try to read from keystore.properties if it exists
  if [ -f "$SCRIPT_DIR/keystore.properties" ]; then
    source "$SCRIPT_DIR/keystore.properties"
  else
    echo -e "${YELLOW}  Enter keystore password (for smartride-upload.keystore):${NC}"
    read -s KSPASS
    KEYSTORE_PASSWORD="$KSPASS"
  fi
else
  KEYSTORE_PASSWORD="$SMART_RIDE_KEYSTORE_PASSWORD"
fi

# Verify the password works by reading the keystore
if ! keytool -list -keystore "$KEYSTORE_PATH" -storepass "$KEYSTORE_PASSWORD" > /dev/null 2>&1; then
  echo -e "${RED}✗ Keystore password is incorrect.${NC}"
  echo -e "${YELLOW}  The password must match what was used to create the keystore.${NC}"
  exit 1
fi

# Append signing config to gradle.properties (file is gitignored, safe to write secrets)
cat >> gradle.properties << EOF

# ─── Smart Ride signing config (auto-injected by build-and-install.sh) ───
# DO NOT COMMIT — gradle.properties is gitignored
SMART_RIDE_UPLOAD_STORE_FILE=$KEYSTORE_PATH
SMART_RIDE_UPLOAD_STORE_PASSWORD=$KEYSTORE_PASSWORD
SMART_RIDE_UPLOAD_KEY_ALIAS=smartride
SMART_RIDE_UPLOAD_KEY_PASSWORD=$KEYSTORE_PASSWORD
EOF

echo -e "${GREEN}✓ Signing config injected into android/gradle.properties${NC}"
echo -e "${GREEN}  Keystore: $KEYSTORE_PATH${NC}"
echo -e "${GREEN}  Expected SHA-1: $EXPECTED_SHA1${NC}"
echo ""

# ─── Step 4: Clear stale caches ───────────────
echo -e "${CYAN}[5/9] Clearing stale CMake/.cxx caches...${NC}"
rm -rf app/.cxx
rm -rf app/build
rm -rf build
rm -rf .gradle
echo -e "${GREEN}✓ Caches cleared${NC}"
echo ""

# ─── Step 5: gradlew clean ────────────────────
echo -e "${CYAN}[6/9] Cleaning previous build artifacts...${NC}"
./gradlew clean || {
  echo -e "${YELLOW}⚠  gradlew clean had warnings (usually safe to ignore)${NC}"
}
echo -e "${GREEN}✓ Clean done${NC}"
echo ""

# ─── Step 6: gradlew assembleRelease ──────────
echo -e "${CYAN}[7/9] Building signed release APK...${NC}"
echo -e "${YELLOW}   This takes 40-60 minutes. ☕${NC}"
echo ""
./gradlew assembleRelease
echo ""
echo -e "${GREEN}✓ APK built!${NC}"
echo ""

# ─── Step 7: VERIFY signing cert SHA-1 ────────
echo -e "${CYAN}[8/9] Verifying APK signing certificate...${NC}"
APK_PATH=$(find app/build/outputs -name "*release*.apk" -type f | head -1)
if [ -z "$APK_PATH" ]; then
  echo -e "${RED}✗ Could not find APK${NC}"
  find . -name "*release*.apk" -type f 2>/dev/null
  exit 1
fi
echo -e "${GREEN}  APK: ${APK_PATH}${NC}"

# Extract signing cert SHA-1 from the APK
APK_SHA1=$(keytool -printcert -jarfile "$APK_PATH" 2>/dev/null | grep "SHA1:" | head -1 | awk '{print $2}')
echo -e "${CYAN}  APK signing cert SHA-1:    ${APK_SHA1}${NC}"
echo -e "${CYAN}  Expected (Firebase-registered): ${EXPECTED_SHA1}${NC}"

if [ "$APK_SHA1" = "$EXPECTED_SHA1" ]; then
  echo -e "${GREEN}✓ SHA-1 MATCHES — Google Sign-In will work!${NC}"
else
  echo -e "${RED}✗ SHA-1 MISMATCH!${NC}"
  echo -e "${RED}  The APK is signed with a different keystore than what's registered in Firebase.${NC}"
  echo -e "${YELLOW}  Google Sign-In will throw DEVELOPER_ERROR.${NC}"
  echo -e "${YELLOW}  Fix: Register this SHA-1 in Firebase Console → Project Settings → Android app → Add fingerprint:${NC}"
  echo -e "${YELLOW}    ${APK_SHA1}${NC}"
  echo -e "${YELLOW}  Then re-download google-services.json and rebuild.${NC}"
  # Don't abort — let the user decide whether to install anyway
fi
echo ""

# ─── Step 8: Install + Launch ─────────────────
if [ -n "$ADB" ]; then
  echo -e "${CYAN}[9/9] Installing on phone + launching...${NC}"
  "$ADB" install -r "$APK_PATH"
  echo -e "${GREEN}✓ Installed${NC}"
  "$ADB" shell am start -n ug.smartride.app/.MainActivity
  echo -e "${GREEN}✓ App launched!${NC}"
else
  echo -e "${YELLOW}[9/9] Skipping install (no phone connected).${NC}"
  echo -e "${YELLOW}  APK: ${APK_PATH}${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  DONE! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
