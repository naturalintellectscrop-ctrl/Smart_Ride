// ============================================
// SMART RIDE MOBILE - METRO CONFIG
// ============================================
// Clean configuration for Expo SDK 55
// With alias resolution support
// ============================================

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper resolution of TypeScript paths
config.resolver.sourceExts = ['tsx', 'ts', 'jsx', 'js', 'json'];

module.exports = config;
