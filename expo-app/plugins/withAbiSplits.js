// ============================================
// SMART RIDE - EXPO CONFIG PLUGIN
// withAbiSplits.js
// ============================================
// Custom Expo config plugin that modifies the
// Android build.gradle to:
//   1. Enable ABI splits (arm64-v8a + armeabi-v7a only)
//      — eliminates x86/x86_64 and universal APK
//   2. Enable R8 full mode, minification, and resource
//      shrinking for release builds
//   3. Set ndk abiFilters to match the splits
//
// This reduces APK size from ~174MB to ~40-50MB by:
//   - Removing unused CPU architectures (x86, x86_64)
//   - Not generating a universal (fat) APK
//   - Shrinking code and resources via R8
// ============================================

const { withAppBuildGradle } = require('expo/config-plugins');

function withAbiSplits(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    // 1. Add ABI splits block inside android { ... }
    // Only include arm architectures — no x86, no universal
    const abiSplitsBlock = `
    splits {
        abi {
            reset()
            include "arm64-v8a", "armeabi-v7a"
            universalApk false
        }
    }`;

    // Insert splits block before the buildTypes block
    if (!contents.includes('splits {')) {
      config.modResults.contents = contents.replace(
        /buildTypes\s*\{/,
        `${abiSplitsBlock}\n    buildTypes {`
      );
    }

    // 2. Enable R8 full mode, minification, and resource shrinking for release
    // Note: useProguard is removed in AGP 8+ — R8 is the default compiler now
    const releaseConfig = `
            // Smart Ride: R8 full mode + minify + shrink for smaller APK
            minifyEnabled true
            shrinkResources true`;

    const modContents = config.modResults.contents;

    // Find the release buildType and add optimization flags
    if (!modContents.includes('minifyEnabled true')) {
      // Try to find release { ... } and add after the opening brace
      config.modResults.contents = modContents.replace(
        /release\s*\{(\s*)/,
        `release {$1${releaseConfig}$1`
      );
    }

    // 3. Add ndk abiFilters to defaultConfig
    const ndkFilter = `
        ndk {
            abiFilters "arm64-v8a", "armeabi-v7a"
        }`;

    if (!modContents.includes('ndk {')) {
      config.modResults.contents = config.modResults.contents.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {${ndkFilter}`
      );
    }

    return config;
  });
}

module.exports = withAbiSplits;
