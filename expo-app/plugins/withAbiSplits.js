// ============================================
// SMART RIDE - EXPO CONFIG PLUGIN
// withAbiSplits.js
// ============================================
// Custom Expo config plugin that modifies the
// Android build.gradle to:
//   1. Enable ABI splits (arm64-v8a + armeabi-v7a only)
//      — eliminates x86/x86_64 and universal APK
//   2. FORCE R8 minify + resource shrinking OFF for release
//      builds (overrides any Expo-generated minifyEnabled true)
//   3. Set ndk abiFilters to match the splits
//
// This reduces APK size from ~174MB to ~40-50MB by:
//   - Removing unused CPU architectures (x86, x86_64)
//   - Not generating a universal (fat) APK
//
// R8 minify is OFF because it was stripping classes needed by
// expo-image-picker, @rnmapbox/maps, and other native modules,
// causing "minifyReleaseWithR8 FAILED" build errors AND
// runtime crashes when the stripped APK was opened.
// ============================================

const { withAppBuildGradle } = require('expo/config-plugins');

function withAbiSplits(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

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

    if (!contents.includes('splits {')) {
      contents = contents.replace(
        /buildTypes\s*\{/,
        `${abiSplitsBlock}\n    buildTypes {`
      );
    }

    // 2. FORCE minifyEnabled false + shrinkResources false in release block.
    //    This is critical — Expo prebuild may generate `minifyEnabled enableProguardInReleaseBuilds`
    //    or `minifyEnabled true`. We MUST override to false, otherwise R8 strips
    //    classes and the release APK crashes on open.
    //
    // Strategy: find the release { ... } block, remove any existing minifyEnabled
    // and shrinkResources lines inside it, then inject our own false values.
    const releaseBlockRegex = /(release\s*\{)([\s\S]*?)(\n\s*\})/;
    const releaseMatch = contents.match(releaseBlockRegex);

    if (releaseMatch) {
      const [fullMatch, openBrace, blockBody, closeBrace] = releaseMatch;

      // Remove existing minifyEnabled / shrinkResources lines from the release block
      let cleanedBody = blockBody
        .replace(/^\s*minifyEnabled\s+.*$/gm, '')
        .replace(/^\s*shrinkResources\s+.*$/gm, '');

      // Inject our forced-false values right after the opening brace
      const forcedConfig = `
            // Smart Ride: R8 minify FORCED OFF — prevents build failures + runtime crashes
            minifyEnabled false
            shrinkResources false`;

      const newReleaseBlock = openBrace + forcedConfig + cleanedBody + closeBrace;
      contents = contents.replace(fullMatch, newReleaseBlock);
    }

    // 3. Add ndk abiFilters to defaultConfig
    const ndkFilter = `
        ndk {
            abiFilters "arm64-v8a", "armeabi-v7a"
        }`;

    if (!contents.includes('ndk {')) {
      contents = contents.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {${ndkFilter}`
      );
    }

    // 4. Ensure multiDexEnabled true (prevents "Cannot fit requested classes
    //    in a single dex file" crash on Android < 21 / large apps)
    if (!contents.includes('multiDexEnabled')) {
      contents = contents.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {\n        multiDexEnabled true`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAbiSplits;
