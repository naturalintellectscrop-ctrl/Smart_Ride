#!/bin/bash
# ============================================
# SMART RIDE - CLEAR CACHES SCRIPT
# ============================================
# Run this before building to clear all caches
# Usage: ./scripts/clear-cache.sh
# ============================================

set -e

echo "🧹 Clearing all caches..."

# Clear Metro bundler cache
echo "  → Clearing Metro cache..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-map-* 2>/dev/null || true
rm -rf $TMPDIR/react-* 2>/dev/null || true

# Clear npm/bun cache
echo "  → Clearing package manager cache..."
rm -rf node_modules/.cache 2>/dev/null || true

# Clear EAS cache
echo "  → Clearing EAS cache..."
rm -rf .eas 2>/dev/null || true
rm -rf ~/.expo/.cache 2>/dev/null || true

# Clear Android build cache
echo "  → Clearing Android build cache..."
rm -rf android/.gradle 2>/dev/null || true
rm -rf android/app/build 2>/dev/null || true
rm -rf android/build 2>/dev/null || true
rm -rf android/.idea 2>/dev/null || true

# Clear iOS build cache (if exists)
echo "  → Clearing iOS build cache..."
rm -rf ios/build 2>/dev/null || true
rm -rf ios/Pods 2>/dev/null || true

# Clear local build outputs
echo "  → Clearing local build outputs..."
rm -f *.apk 2>/dev/null || true
rm -f *.ipa 2>/dev/null || true

echo "✅ All caches cleared!"
echo ""
echo "To rebuild, run:"
echo "  npx expo start --clear"
echo "  or"
echo "  eas build --platform android --profile preview --local"
