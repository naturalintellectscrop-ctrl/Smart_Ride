#!/usr/bin/env bash
# ============================================================
# SMART RIDE — One-Command APK Build + Install
# ============================================================
# Usage:  bash build-and-install.sh
#
# Can be run from ANY directory — the script auto-detects its own
# location and runs everything from the correct folders.
#
# What this does:
#   1. git pull  (get latest code + google-services.json)
#   2. npx expo prebuild --clean  (regenerate native Android project)
#   3. Delete .cxx + build caches  (prevents CMake/ninja errors)
#   4. ./gradlew clean  (clear old build artifacts)
#   5. ./gradlew assembleRelease  (build the signed APK — takes ~40-60 min)
#   6. Find the APK automatically
#   7. adb install -r  (install on connected phone)
#   8. adb shell am start  (launch the app)
# ============================================================

set -e  # exit on first error

# ─── Colors ───────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ─── Resolve the script's absolute directory ──
# This works regardless of where the user runs the script from.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Smart Ride — Build & Install APK${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Working directory: $SCRIPT_DIR${NC}"
echo ""

# ─── Verify we're in the expo-app root ────────
if [ ! -f "package.json" ]; then
  echo -e "${RED}✗ ERROR: package.json not found in $SCRIPT_DIR${NC}"
  echo -e "${YELLOW}  This script must be in the expo-app root folder.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Confirmed: in expo-app root (package.json found)${NC}"
echo ""

# ─── Step 0: Check ADB path ───────────────────
ADB=""
if command -v adb &> /dev/null; then
  ADB="adb"
elif [ -f "/c/Users/GODWIN/AppData/Local/Android/Sdk/platform-tools/adb.exe" ]; then
  ADB="/c/Users/GODWIN/AppData/Local/Android/Sdk/platform-tools/adb.exe"
else
  echo -e "${YELLOW}⚠  adb not found on PATH. Install step will be skipped.${NC}"
  echo -e "${YELLOW}   You can install the APK manually after build.${NC}"
fi

# Check phone is connected (if adb is available)
if [ -n "$ADB" ]; then
  echo -e "${CYAN}[1/8] Checking connected device...${NC}"
  DEVICES=$("$ADB" devices | grep -v "List of devices" | grep "device" || true)
  if [ -z "$DEVICES" ]; then
    echo -e "${RED}✗ No phone connected via USB.${NC}"
    echo -e "${YELLOW}  Connect your phone with USB debugging enabled.${NC}"
    echo -e "${YELLOW}  Build will continue, but install will be skipped.${NC}"
    ADB=""
  else
    echo -e "${GREEN}✓ Phone connected:${NC}"
    echo "$DEVICES" | head -1
  fi
  echo ""
fi

# ─── Step 1: git pull ─────────────────────────
echo -e "${CYAN}[2/8] Pulling latest code from GitHub...${NC}"
git pull origin main
echo -e "${GREEN}✓ Code is up to date${NC}"
echo ""

# ─── Step 2: expo prebuild (MUST run from expo-app root) ────
echo -e "${CYAN}[3/8] Regenerating native Android project...${NC}"
echo -e "${YELLOW}   (this syncs google-services.json into the APK)${NC}"
echo -e "${YELLOW}   Running from: $(pwd)${NC}"
npx expo prebuild --platform android --clean
echo -e "${GREEN}✓ Native project regenerated${NC}"
echo ""

# ─── Step 3: Delete stale CMake/.cxx caches ───
echo -e "${CYAN}[4/8] Clearing stale CMake/.cxx caches...${NC}"
cd android
# These caches cause "ninja: error: rebuilding build.ninja" + "GLOB mismatch"
# + "add_subdirectory given source ... which is not an existing directory"
# when expo prebuild regenerates the project structure.
rm -rf app/.cxx
rm -rf app/build
rm -rf build
rm -rf .gradle
echo -e "${GREEN}✓ Caches cleared${NC}"
echo ""

# ─── Step 4: gradlew clean ────────────────────
echo -e "${CYAN}[5/8] Cleaning previous build artifacts...${NC}"
./gradlew clean || {
  echo -e "${YELLOW}⚠  gradlew clean had warnings (usually safe to ignore)${NC}"
  echo -e "${YELLOW}   Continuing with build anyway...${NC}"
}
echo -e "${GREEN}✓ Clean done${NC}"
echo ""

# ─── Step 5: gradlew assembleRelease ──────────
echo -e "${CYAN}[6/8] Building signed release APK...${NC}"
echo -e "${YELLOW}   This takes 40-60 minutes. Go grab a coffee. ☕${NC}"
echo -e "${YELLOW}   Progress will stream below...${NC}"
echo ""
./gradlew assembleRelease
echo ""
echo -e "${GREEN}✓ APK built successfully!${NC}"
echo ""

# ─── Step 6: Find the APK ─────────────────────
echo -e "${CYAN}[7/8] Locating APK...${NC}"
APK_PATH=$(find app/build/outputs -name "*release*.apk" -type f | head -1)
if [ -z "$APK_PATH" ]; then
  echo -e "${RED}✗ Could not find APK in app/build/outputs/${NC}"
  echo -e "${YELLOW}  Search manually:${NC}"
  find . -name "*release*.apk" -type f 2>/dev/null
  exit 1
fi
echo -e "${GREEN}✓ Found APK: ${APK_PATH}${NC}"
APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
echo -e "${GREEN}  Size: ${APK_SIZE}${NC}"
echo ""

# ─── Step 7: Install + Launch ─────────────────
if [ -n "$ADB" ]; then
  echo -e "${CYAN}[8/8] Installing on phone + launching app...${NC}"
  "$ADB" install -r "$APK_PATH"
  echo -e "${GREEN}✓ Installed${NC}"
  echo -e "${CYAN}  Launching Smart Ride...${NC}"
  "$ADB" shell am start -n ug.smartride.app/.MainActivity
  echo -e "${GREEN}✓ App launched!${NC}"
else
  echo -e "${YELLOW}[8/8] Skipping install (no phone connected).${NC}"
  echo -e "${YELLOW}  APK is at: ${APK_PATH}${NC}"
  echo -e "${YELLOW}  Install manually with:${NC}"
  echo -e "${YELLOW}  adb install -r ${APK_PATH}${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  DONE! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
