// ============================================
// SMART RIDE MOBILE - METRO CONFIG
// ============================================
// Expo SDK 55 + NativeWind Configuration
// ============================================

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Don't override sourceExts - use Expo defaults
// NativeWind handles CSS processing

module.exports = withNativeWind(config, { input: './global.css' });
