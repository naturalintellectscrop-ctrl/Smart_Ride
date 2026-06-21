// ============================================
// SMART RIDE - EXPO CONFIG PLUGIN
// withSigningConfig.js
// ============================================
// Injects a signingConfigs.release block into android/app/build.gradle
// so the release APK is signed with the upload keystore (NOT the debug
// keystore).
//
// WHY THIS IS NEEDED:
//   Expo's default build.gradle signs release builds with the DEBUG
//   keystore (~/.android/debug.keystore). The debug keystore has a
//   different SHA-1 on every machine, so Google Sign-In throws
//   DEVELOPER_ERROR because the PC's debug SHA-1 isn't registered in
//   Firebase.
//
//   This plugin adds a signingConfigs.release block that reads the
//   keystore path/password/alias from gradle.properties:
//     SMART_RIDE_UPLOAD_STORE_FILE=<path to smartride-upload.keystore>
//     SMART_RIDE_UPLOAD_STORE_PASSWORD=<password>
//     SMART_RIDE_UPLOAD_KEY_ALIAS=smartride
//     SMART_RIDE_UPLOAD_KEY_PASSWORD=<password>
//
//   And sets buildTypes.release.signingConfig = signingConfigs.release
//
//   If the SMART_RIDE_UPLOAD_* vars are NOT set (e.g. during a debug
//   build or EAS cloud build), it falls back to the debug keystore so
//   the build doesn't fail.
// ============================================

const { withAppBuildGradle } = require('expo/config-plugins');

function withSigningConfig(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Only inject once
    if (contents.includes('SMART_RIDE_UPLOAD_STORE_FILE')) {
      return config;
    }

    // 1. Add signingConfigs.release block inside android { ... }
    //    Place it before buildTypes { ... }
    const signingConfigBlock = `
    signingConfigs {
        release {
            // Smart Ride upload keystore — SHA-1 registered in Firebase
            // Falls back to debug keystore if vars not set (EAS cloud build)
            if (project.hasProperty('SMART_RIDE_UPLOAD_STORE_FILE')) {
                storeFile file(project.findProperty('SMART_RIDE_UPLOAD_STORE_FILE'))
                storePassword project.findProperty('SMART_RIDE_UPLOAD_STORE_PASSWORD')
                keyAlias project.findProperty('SMART_RIDE_UPLOAD_KEY_ALIAS')
                keyPassword project.findProperty('SMART_RIDE_UPLOAD_KEY_PASSWORD')
            }
        }
    }`;

    if (!contents.includes('signingConfigs {')) {
      // Insert before buildTypes {
      contents = contents.replace(
        /buildTypes\s*\{/,
        `${signingConfigBlock}\n    buildTypes {`
      );
    }

    // 2. Inside buildTypes.release { ... }, replace
    //    signingConfig signingConfigs.debug
    //    with
    //    signingConfig signingConfigs.release
    //    (only if the release signing config vars are set)
    const releaseSigningConfigLine = `
            // Smart Ride: use release signing config if keystore vars are set
            if (project.hasProperty('SMART_RIDE_UPLOAD_STORE_FILE')) {
                signingConfig signingConfigs.release
            } else {
                signingConfig signingConfigs.debug
            }`;

    // Remove any existing signingConfig line inside release block
    contents = contents.replace(
      /^\s*signingConfig\s+signingConfigs\.(debug|release)\s*$/gm,
      ''
    );

    // Find buildTypes { release { ... } } and inject the signing config
    // We look for 'release {' inside buildTypes and add after the opening brace
    const buildTypesIdx = contents.indexOf('buildTypes');
    if (buildTypesIdx !== -1) {
      // Find the release block inside buildTypes
      const releaseMatch = contents.slice(buildTypesIdx).match(/release\s*\{/);
      if (releaseMatch) {
        const releaseBraceIdx = buildTypesIdx + releaseMatch.index + releaseMatch[0].length;
        contents =
          contents.slice(0, releaseBraceIdx) +
          releaseSigningConfigLine +
          contents.slice(releaseBraceIdx);
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withSigningConfig;
