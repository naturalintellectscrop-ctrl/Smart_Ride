// ============================================
// SMART RIDE MOBILE - METRO CONFIG
// ============================================
// Expo SDK 55 + NativeWind Configuration
// ============================================

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Ensure proper resolution of TypeScript paths
config.resolver.sourceExts = ['tsx', 'ts', 'jsx', 'js', 'json'];

module.exports = withNativeWind(config, { input: './global.css' });
