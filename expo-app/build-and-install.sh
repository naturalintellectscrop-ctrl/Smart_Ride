#!/usr/bin/env bash
# ============================================================
# SMART RIDE — One-Command APK Build + Install
# ============================================================
# Usage:  bash build-and-install.sh
#
# What this does:
#   1. git pull  (get latest code + google-services.json)
#   2. npx expo prebuild --clean  (regenerate native Android project)
#   3. ./gradlew clean  (clear old build artifacts)
#   4. ./gradlew assembleRelease  (build the signed APK — takes ~40-60 min)
#   5. Find the APK automatically
#   6. adb install -r  (install on connected phone)
#   7. adb shell am start  (launch the app)
# ============================================================

set -e  # exit on first error

# ─── Colors ───────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Smart Ride — Build & Install APK${NC}"
echo -e "${CYAN}========================================${NC}"
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
  echo -e "${CYAN}[1/7] Checking connected device...${NC}"
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
echo -e "${CYAN}[2/7] Pulling latest code from GitHub...${NC}"
cd "$(dirname "$0")"
git pull origin main
echo -e "${GREEN}✓ Code is up to date${NC}"
echo ""

# ─── Step 2: expo prebuild ────────────────────
echo -e "${CYAN}[3/7] Regenerating native Android project...${NC}"
echo -e "${YELLOW}   (this syncs google-services.json into the APK)${NC}"
npx expo prebuild --platform android --clean
echo -e "${GREEN}✓ Native project regenerated${NC}"
echo ""

# ─── Step 3: gradlew clean ────────────────────
echo -e "${CYAN}[4/7] Cleaning previous build artifacts...${NC}"
cd android
./gradlew clean
echo -e "${GREEN}✓ Clean done${NC}"
echo ""

# ─── Step 4: gradlew assembleRelease ──────────
echo -e "${CYAN}[5/7] Building signed release APK...${NC}"
echo -e "${YELLOW}   This takes 40-60 minutes. Go grab a coffee. ☕${NC}"
echo -e "${YELLOW}   Progress will stream below...${NC}"
echo ""
./gradlew assembleRelease
echo ""
echo -e "${GREEN}✓ APK built successfully!${NC}"
echo ""

# ─── Step 5: Find the APK ─────────────────────
echo -e "${CYAN}[6/7] Locating APK...${NC}"
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

# ─── Step 6: Install + Launch ─────────────────
if [ -n "$ADB" ]; then
  echo -e "${CYAN}[7/7] Installing on phone + launching app...${NC}"
  "$ADB" install -r "$APK_PATH"
  echo -e "${GREEN}✓ Installed${NC}"
  echo -e "${CYAN}  Launching Smart Ride...${NC}"
  "$ADB" shell am start -n ug.smartride.app/.MainActivity
  echo -e "${GREEN}✓ App launched!${NC}"
else
  echo -e "${YELLOW}[7/7] Skipping install (no phone connected).${NC}"
  echo -e "${YELLOW}  APK is at: ${APK_PATH}${NC}"
  echo -e "${YELLOW}  Install manually with:${NC}"
  echo -e "${YELLOW}  adb install -r ${APK_PATH}${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  DONE! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
