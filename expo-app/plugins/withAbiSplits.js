// ============================================
// SMART RIDE - EXPO CONFIG PLUGIN
// withAbiSplits.js  (v4 — size-optimized)
// ============================================
// Custom Expo config plugin that modifies the
// Android build.gradle to:
//   1. Enable ABI splits (arm64-v8a + armeabi-v7a only)
//      with universalApk false → produces TWO smaller
//      per-ABI APKs instead of one giant universal APK.
//   2. FORCE R8 minify + resource shrinking OFF in the
//      buildTypes.release block (NOT signingConfigs.release)
//   3. Set ndk abiFilters to match the splits
//   4. Enable multiDex
//   5. Add packagingOptions to:
//        - jniLibs useLegacyPackaging false (compress .so in APK)
//        - resources excludes (strip unused licenses/dups)
//        - jniLibs pickFirst (silence duplicate .so conflicts)
//      Together these shrink a 399 MB universal APK down to
//      ~40–70 MB per ABI.
//
// R8 minify is OFF because it was stripping classes needed by
// expo-image-picker, @rnmapbox/maps, and other native modules,
// causing "minifyReleaseWithR8 FAILED" build errors AND
// runtime crashes when the stripped APK was opened.
//
// v4 FIX: added packagingOptions block. The previous v3 left
// useLegacyPackaging=true (set by expo-build-properties in
// app.json) which stores .so files UNCOMPRESSED inside the
// APK — the #1 cause of the 399 MB APK size complaint.
// We now override that here so the build is small regardless
// of what app.json says.
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
    const buildTypesStart = contents.indexOf('buildTypes');
    if (buildTypesStart === -1) {
      console.warn('[withAbiSplits] Could not find buildTypes block — skipping minify override');
    } else {
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
          const releaseBlock = buildTypesInner.slice(releaseBraceIdx, k);
          const releaseInner = releaseBlock.slice(1, -1);

          // Remove any existing minifyEnabled / shrinkResources / proguardFiles lines
          let cleanedRelease = releaseInner
            .replace(/^\s*minifyEnabled\s+.*$/gm, '')
            .replace(/^\s*shrinkResources\s+.*$/gm, '')
            .replace(/^\s*proguardFiles.*$/gm, '');

          // Inject forced-false values + proguardFiles reference
          const forcedConfig = `
            // Smart Ride v4: R8 minify FORCED OFF — prevents build failures + runtime crashes
            minifyEnabled false
            shrinkResources false
            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"`;

          const newReleaseBlock = '{' + forcedConfig + cleanedRelease + '}';

          const newBuildTypesInner =
            buildTypesInner.slice(0, releaseBraceIdx) +
            newReleaseBlock +
            buildTypesInner.slice(k);

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

    // 4. Add packagingOptions block inside android { ... }
    //    - useLegacyPackaging false → compress .so files inside the APK
    //      (the #1 size win; app.json sets it to true which inflates the APK)
    //    - pickFirst for duplicate .so conflicts (Mapbox + RN both ship libhermes.so etc.)
    //    - resources excludes for bloat we never need at runtime
    const packagingBlock = `
    packagingOptions {
        // Compress native libs inside the APK instead of extracting at install.
        // Smart Ride targets Android 6+ (API 23+) which supports compressed libs.
        jniLibs {
            useLegacyPackaging false
            pickFirsts += ['**/libc++_shared.so', '**/libfbjni.so', '**/libhermes.so', '**/libreactnativejni.so']
        }
        resources {
            excludes += [
                '**/META-INF/DEPENDENCIES',
                '**/META-INF/LICENSE',
                '**/META-INF/LICENSE.txt',
                '**/META-INF/license.txt',
                '**/META-INF/NOTICE',
                '**/META-INF/NOTICE.txt',
                '**/META-INF/notice.txt',
                '**/META-INF/ASL2.0',
                '**/META-INF/*.kotlin_module',
                '**/META-INF/AL2.0',
                '**/META-INF/LGPL2.1',
                '**/kotlin-tooling-metadata.json',
                '**/android-versions.txt'
            ]
        }
    }`;

    if (!contents.includes('packagingOptions {')) {
      // Insert packagingOptions right before the splits block (or before buildTypes if no splits)
      if (contents.includes('splits {')) {
        contents = contents.replace(/(\n\s*splits \{)/, `${packagingBlock}\n$1`);
      } else {
        contents = contents.replace(/buildTypes\s*\{/, `${packagingBlock}\n    buildTypes {`);
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAbiSplits;
