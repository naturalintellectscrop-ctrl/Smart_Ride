// ============================================
// SMART RIDE - EXPO CONFIG PLUGIN
// withAbiSplits.js  (v5 — arm64-only + Agora voice-only trim)
// ============================================
// Makes the APK-size optimizations durable across `expo prebuild` (the android/
// folder is gitignored, so manual build.gradle edits would be lost). This
// plugin reproduces them from app config, which IS tracked in git.
//
// What it does:
//   1. gradle.properties → reactNativeArchitectures=arm64-v8a
//      Builds a single arm64-only APK. Drops x86/x86_64 (emulator-only) and
//      armeabi-v7a (legacy 32-bit) — the bulk of the old 436 MB. arm64 covers
//      virtually all Android phones from ~2015+. For a Play Store AAB, switch
//      this to "arm64-v8a,armeabi-v7a" and run bundleRelease (per-device split).
//   2. ndk abiFilters "arm64-v8a" + multiDexEnabled.
//   3. NO per-ABI `splits` block → one standard app-release.apk output.
//   4. packagingOptions:
//        - compress .so (useLegacyPackaging false)
//        - pickFirst duplicate .so
//        - strip license/dup resources
//        - EXCLUDE Agora video / AI-visual / spatial-audio extension libs
//          (~43 MB/ABI) — Smart Ride uses VOICE calls only. Audio extensions
//          (noise suppression, echo cancellation) are kept for call quality.
//   5. R8 minify + resource shrinking FORCED OFF (kept off: enabling R8 stripped
//      classes needed by expo-image-picker / @rnmapbox/maps → build + runtime
//      crashes). Size target is met without it.
//
// Result: app-release.apk ≈ 106 MB (was 436 MB).
// ============================================

const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

// Agora extension .so that a voice-only call never loads.
const AGORA_EXCLUDES = [
  'libagora_clear_vision_extension.so',
  'libagora_lip_sync_extension.so',
  'libagora_ffmpeg.so',
  'libagora_spatial_audio_extension.so',
  'libagora_segmentation_extension.so',
  'libagora_face_capture_extension.so',
  'libagora_face_detection_extension.so',
  'libagora_audio_beauty_extension.so',
  'libagora_content_inspect_extension.so',
  'libagora_video_quality_analyzer_extension.so',
  'libagora_video_av1_encoder_extension.so',
  'libagora_video_encoder_extension.so',
  'libagora_screen_capture_extension.so',
  'libvideo_enc.so',
  'libvideo_dec.so',
];

function withArm64Only(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;
    const existing = props.find((p) => p.type === 'property' && p.key === 'reactNativeArchitectures');
    if (existing) existing.value = 'arm64-v8a';
    else props.push({ type: 'property', key: 'reactNativeArchitectures', value: 'arm64-v8a' });
    return config;
  });
}

function withBuildGradleSize(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // 1. ndk abiFilters arm64-only + multiDex
    if (!contents.includes('ndk {')) {
      contents = contents.replace(/defaultConfig\s*\{/, `defaultConfig {\n        ndk {\n            abiFilters "arm64-v8a"\n        }`);
    } else {
      contents = contents.replace(/abiFilters[^\n]*/, 'abiFilters "arm64-v8a"');
    }
    if (!contents.includes('multiDexEnabled')) {
      contents = contents.replace(/defaultConfig\s*\{/, `defaultConfig {\n        multiDexEnabled true`);
    }

    // 2. Remove any per-ABI splits block (we want a single app-release.apk)
    contents = contents.replace(/\n\s*splits\s*\{[\s\S]*?\n\s*\}\n/, '\n');

    // 3. Force minify + shrink OFF in buildTypes.release (idempotent)
    if (!/minifyEnabled\s+false/.test(contents)) {
      contents = contents.replace(/(release\s*\{)/, `$1\n            minifyEnabled false\n            shrinkResources false`);
    }

    // 4. packagingOptions with Agora excludes
    const excludeList = AGORA_EXCLUDES.map((l) => `                '**/${l}'`).join(',\n');
    const packagingBlock = `
    packagingOptions {
        jniLibs {
            useLegacyPackaging false
            pickFirsts += ['**/libc++_shared.so', '**/libfbjni.so', '**/libhermes.so', '**/libreactnativejni.so']
            excludes += [
${excludeList}
            ]
        }
        resources {
            excludes += [
                '**/META-INF/DEPENDENCIES', '**/META-INF/LICENSE', '**/META-INF/LICENSE.txt',
                '**/META-INF/NOTICE', '**/META-INF/NOTICE.txt', '**/META-INF/*.kotlin_module',
                '**/META-INF/AL2.0', '**/META-INF/LGPL2.1', '**/kotlin-tooling-metadata.json'
            ]
        }
    }`;
    if (!contents.includes('packagingOptions {')) {
      contents = contents.replace(/buildTypes\s*\{/, `${packagingBlock}\n    buildTypes {`);
    } else if (!contents.includes('libagora_clear_vision_extension')) {
      // packagingOptions exists but lacks our jniLibs excludes — inject them.
      contents = contents.replace(
        /(jniLibs\s*\{)/,
        `$1\n            excludes += [\n${excludeList}\n            ]`,
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = function withAbiSplits(config) {
  config = withArm64Only(config);
  config = withBuildGradleSize(config);
  return config;
};
