// ============================================
// SMART RIDE - EXPO CONFIG PLUGIN
// withAbiSplits.js  (v3 — bulletproof)
// ============================================
// Custom Expo config plugin that modifies the
// Android build.gradle to:
//   1. Enable ABI splits (arm64-v8a + armeabi-v7a only)
//   2. FORCE R8 minify + resource shrinking OFF in the
//      buildTypes.release block (NOT signingConfigs.release)
//   3. Set ndk abiFilters to match the splits
//   4. Enable multiDex
//
// R8 minify is OFF because it was stripping classes needed by
// expo-image-picker, @rnmapbox/maps, and other native modules,
// causing "minifyReleaseWithR8 FAILED" build errors AND
// runtime crashes when the stripped APK was opened.
//
// v3 FIX: previous versions had a regex bug — `release {` appears
// TWICE in build.gradle (signingConfigs.release AND buildTypes.release),
// and the old regex matched the FIRST one (signingConfigs), leaving
// buildTypes.release untouched with minifyEnabled still true.
// v3 explicitly finds the buildTypes block first, then the release
// block INSIDE it.
// ============================================

const { withAppBuildGradle } = require('expo/config-plugins');

function withAbiSplits(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // 1. Add ABI splits block inside android { ... } (before buildTypes)
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

    // 2. FORCE minifyEnabled false + shrinkResources false in buildTypes.release
    //    The release block appears INSIDE buildTypes { ... }. We must find
    //    buildTypes first, then the release block within it, to avoid
    //    accidentally modifying signingConfigs.release.
    //
    // Strategy: locate the buildTypes { ... } block (top-level, balanced braces),
    // then within that block, find release { ... } and rewrite its
    // minifyEnabled / shrinkResources lines.
    const buildTypesStart = contents.indexOf('buildTypes');
    if (buildTypesStart === -1) {
      console.warn('[withAbiSplits] Could not find buildTypes block — skipping minify override');
    } else {
      // Find the opening brace of buildTypes
      let i = contents.indexOf('{', buildTypesStart);
      if (i === -1) {
        console.warn('[withAbiSplits] buildTypes has no opening brace — skipping');
      } else {
        // Walk forward to find the matching closing brace (balanced)
        let depth = 1;
        let j = i + 1;
        while (j < contents.length && depth > 0) {
          if (contents[j] === '{') depth++;
          else if (contents[j] === '}') depth--;
          j++;
        }
        // contents[i+1 .. j-1] is the inside of buildTypes (exclusive of braces)
        // contents[i .. j-1] includes the braces
        const buildTypesBlock = contents.slice(i, j); // includes outer { }
        const buildTypesInner = buildTypesBlock.slice(1, -1); // inner content

        // Now find the release { ... } block inside buildTypesInner
        const releaseStart = buildTypesInner.search(/\brelease\s*\{/);
        if (releaseStart === -1) {
          console.warn('[withAbiSplits] No release block inside buildTypes — skipping');
        } else {
          const releaseBraceIdx = buildTypesInner.indexOf('{', releaseStart);
          let depth2 = 1;
          let k = releaseBraceIdx + 1;
          while (k < buildTypesInner.length && depth2 > 0) {
            if (buildTypesInner[k] === '{') depth2++;
            else if (buildTypesInner[k] === '}') depth2--;
            k++;
          }
          // buildTypesInner[releaseBraceIdx .. k-1] is release { ... } with braces
          const releaseBlock = buildTypesInner.slice(releaseBraceIdx, k);
          const releaseInner = releaseBlock.slice(1, -1); // inner of release block

          // Remove any existing minifyEnabled / shrinkResources lines
          let cleanedRelease = releaseInner
            .replace(/^\s*minifyEnabled\s+.*$/gm, '')
            .replace(/^\s*shrinkResources\s+.*$/gm, '')
            .replace(/^\s*proguardFiles.*$/gm, '');

          // Inject forced-false values + proguardFiles reference
          const forcedConfig = `
            // Smart Ride v3: R8 minify FORCED OFF — prevents build failures + runtime crashes
            minifyEnabled false
            shrinkResources false
            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"`;

          const newReleaseBlock = '{' + forcedConfig + cleanedRelease + '}';

          // Rebuild buildTypesInner with the new release block
          const newBuildTypesInner =
            buildTypesInner.slice(0, releaseBraceIdx) +
            newReleaseBlock +
            buildTypesInner.slice(k);

          // Rebuild the full buildTypes block and splice back into contents
          const newBuildTypesBlock = '{' + newBuildTypesInner + '}';
          contents =
            contents.slice(0, i) +
            newBuildTypesBlock +
            contents.slice(j);
        }
      }
    }

    // 3. Add ndk abiFilters + multiDexEnabled to defaultConfig
    if (!contents.includes('ndk {')) {
      const ndkFilter = `
        ndk {
            abiFilters "arm64-v8a", "armeabi-v7a"
        }`;
      contents = contents.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {${ndkFilter}`
      );
    }

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
