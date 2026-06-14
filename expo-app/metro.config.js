// ============================================
// SMART RIDE MOBILE - METRO CONFIG
// ============================================
// Expo SDK 55 Configuration
// NOTE: NativeWind/withNativeWind removed — was causing style
// recalculation on every render, which makes TextInput cursor
// jump on Android. All styles use StyleSheet.create() directly.
// ============================================

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
