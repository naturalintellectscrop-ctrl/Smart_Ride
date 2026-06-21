// ============================================
// SMART RIDE - EXPO CONFIG PLUGIN
// withSigningConfig.js
// ============================================
// Makes Gradle sign the release APK with the Smart Ride upload keystore
// (SHA-1 98:EA:9B:4B:...:78:F4, registered in Firebase) instead of the
// PC's debug keystore. Without this, Google Sign-In throws DEVELOPER_ERROR.
//
// HOW IT WORKS:
//   Locates buildTypes { release { ... } } by counting braces, then
//   replaces the `signingConfig signingConfigs.debug` line INSIDE THAT
//   BLOCK ONLY with an inline block that:
//     1. Creates a 'release' signing config on the fly via maybeCreate()
//        (safe — won't fail even if it already exists)
//     2. Configures it from gradle.properties vars:
//          SMART_RIDE_UPLOAD_STORE_FILE
//          SMART_RIDE_UPLOAD_STORE_PASSWORD
//          SMART_RIDE_UPLOAD_KEY_ALIAS
//          SMART_RIDE_UPLOAD_KEY_PASSWORD
//     3. Assigns it to the release build type
//     4. Falls back to signingConfigs.debug if vars are not set
//
// WHY BRACE-COUNTING (not a regex on the whole file):
//   Expo's template has `signingConfig signingConfigs.debug` in BOTH the
//   debug build type and the release build type. A global regex replaces
//   only the FIRST match (the debug one), leaving release untouched →
//   APK still signed with debug keystore. By locating the release block
//   via brace-matching and only modifying within it, we guarantee the
//   release build type is the one that gets the upload keystore.
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

    // Locate buildTypes { ... }
    const buildTypesIdx = contents.indexOf('buildTypes');
    if (buildTypesIdx === -1) {
      console.warn(
        '[withSigningConfig] WARNING: buildTypes block not found. ' +
          'Release APK will be signed with debug keystore.'
      );
      config.modResults.contents = contents;
      return config;
    }

    // Find 'release {' after buildTypes (the release build type)
    const afterBuildTypes = contents.slice(buildTypesIdx);
    const releaseMatch = afterBuildTypes.match(/release\s*\{/);
    if (!releaseMatch) {
      console.warn(
        '[withSigningConfig] WARNING: release block not found in buildTypes. ' +
          'Release APK will be signed with debug keystore.'
      );
      config.modResults.contents = contents;
      return config;
    }

    // releaseStart = index of the character right after 'release {'
    const releaseStart = buildTypesIdx + releaseMatch.index + releaseMatch[0].length;

    // Find the matching closing brace of the release block by counting.
    // Start at depth 1 (we're already inside the release { opening brace).
    let depth = 1;
    let i = releaseStart;
    while (i < contents.length && depth > 0) {
      const ch = contents[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    // i is now positioned just AFTER the closing brace of the release block.
    // releaseEnd = index of the closing brace itself.
    const releaseEnd = i - 1;

    // Extract just the release block's inner content
    const releaseContent = contents.slice(releaseStart, releaseEnd);

    // Within the release block ONLY, replace the signingConfig line.
    // This avoids touching the debug build type's signingConfig line.
    const signingRefRe = /[ \t]*signingConfig[ \t]+signingConfigs\.(debug|release)[ \t]*\n/;
    let newReleaseContent;
    if (signingRefRe.test(releaseContent)) {
      newReleaseContent = releaseContent.replace(signingRefRe, releaseBlock + '\n');
    } else {
      // No existing signingConfig line in the release block — inject at the top
      newReleaseContent = '\n' + releaseBlock + releaseContent;
    }

    // Reassemble: everything before release block + new release content + everything after
    contents =
      contents.slice(0, releaseStart) +
      newReleaseContent +
      contents.slice(releaseEnd);

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withSigningConfig;
