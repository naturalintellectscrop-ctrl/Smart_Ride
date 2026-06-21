// ============================================
// SMART RIDE - EXPO CONFIG PLUGIN
// withSigningConfig.js
// ============================================
// Makes Gradle sign the release APK with the Smart Ride upload keystore
// (SHA-1 98:EA:9B:4B:...:78:F4, registered in Firebase) instead of the
// PC's debug keystore. Without this, Google Sign-In throws DEVELOPER_ERROR.
//
// HOW IT WORKS:
//   Inside buildTypes.release { ... }, we replace the default
//     signingConfig signingConfigs.debug
//   with an inline block that:
//     1. Creates a 'release' signing config on the fly via maybeCreate()
//        (safe — won't fail even if it already exists)
//     2. Configures it from gradle.properties vars:
//          SMART_RIDE_UPLOAD_STORE_FILE
//          SMART_RIDE_UPLOAD_STORE_PASSWORD
//          SMART_RIDE_UPLOAD_KEY_ALIAS
//          SMART_RIDE_UPLOAD_KEY_PASSWORD
//     3. Assigns it to the release build type
//     4. Falls back to signingConfigs.debug if vars are not set
//        (e.g. EAS cloud build, debug build)
//
// WHY INLINE (not a separate signingConfigs { } block):
//   A separate signingConfigs { release { } } block must be ordered
//   BEFORE buildTypes { } and the reference signingConfigs.release is
//   evaluated lazily. Across Expo SDK versions the template structure
//   varies, and a misplaced block causes:
//     "Could not get unknown property 'release' for SigningConfig container"
//   Creating + referencing the config at the same call site avoids this
//   ordering problem entirely.
// ============================================

const { withAppBuildGradle } = require('expo/config-plugins');

function withSigningConfig(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Only inject once
    if (contents.includes('SMART_RIDE_UPLOAD_STORE_FILE')) {
      return config;
    }

    // The inline block that creates + configures + assigns the release
    // signing config. Uses maybeCreate so it's idempotent.
    const releaseBlock = [
      '        // ─── Smart Ride release signing (auto-injected by withSigningConfig plugin) ───',
      '        if (project.hasProperty("SMART_RIDE_UPLOAD_STORE_FILE")) {',
      '            def sc = signingConfigs.maybeCreate("release")',
      '            sc.storeFile = file(project.findProperty("SMART_RIDE_UPLOAD_STORE_FILE"))',
      '            sc.storePassword = project.findProperty("SMART_RIDE_UPLOAD_STORE_PASSWORD")',
      '            sc.keyAlias = project.findProperty("SMART_RIDE_UPLOAD_KEY_ALIAS")',
      '            sc.keyPassword = project.findProperty("SMART_RIDE_UPLOAD_KEY_PASSWORD")',
      '            signingConfig sc',
      '        } else {',
      '            signingConfig signingConfigs.debug',
      '        }',
    ].join('\n');

    let modified = false;

    // CASE 1: The template has an explicit
    //   `signingConfig signingConfigs.debug`
    // line inside buildTypes.release. Replace it with our block.
    // This is the common case for Expo/RN templates.
    const signingRefRe = /([ \t]*)signingConfig[ \t]+signingConfigs\.(debug|release)[ \t]*\n/;
    if (signingRefRe.test(contents)) {
      contents = contents.replace(signingRefRe, releaseBlock + '\n');
      modified = true;
    }

    // CASE 2: No explicit signingConfig line found. Find the release block
    // inside buildTypes { ... } and inject our block right after the
    // opening brace of `release {`.
    if (!modified) {
      const buildTypesIdx = contents.indexOf('buildTypes');
      if (buildTypesIdx !== -1) {
        const afterBuildTypes = contents.slice(buildTypesIdx);
        const releaseMatch = afterBuildTypes.match(/release[ \t]*\{/);
        if (releaseMatch) {
          const releaseBraceIdx =
            buildTypesIdx + releaseMatch.index + releaseMatch[0].length;
          contents =
            contents.slice(0, releaseBraceIdx) +
            '\n' + releaseBlock +
            contents.slice(releaseBraceIdx);
          modified = true;
        }
      }
    }

    if (!modified) {
      console.warn(
        '[withSigningConfig] WARNING: could not find a place to inject ' +
          'signing config. The release APK will be signed with the debug ' +
          'keystore and Google Sign-In will fail with DEVELOPER_ERROR.'
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withSigningConfig;
