// ============================================
// SMART RIDE - EXPO CONFIG PLUGIN
// withAgoraPermissions.js
// ============================================
// Custom Expo config plugin that adds required
// Android and iOS permissions for Agora.io
// voice/video calling SDK.
//
// Android:
//   - RECORD_AUDIO (microphone)
//   - MODIFY_AUDIO_SETTINGS
//   - ACCESS_NETWORK_STATE
//   - ACCESS_WIFI_STATE
//   - FOREGROUND_SERVICE
//   - WAKE_LOCK
//
// iOS:
//   - NSMicrophoneUsageDescription
// ============================================

const {
  withAndroidManifest,
  withInfoPlist,
  createRunOncePlugin,
} = require('expo/config-plugins');

const MICROPHONE_DESCRIPTION =
  'Smart Ride needs access to your microphone for in-app voice calls with drivers and riders.';

function withAgoraAndroidPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Ensure <uses-permission> array exists
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.WAKE_LOCK',
    ];

    for (const permission of permissions) {
      const alreadyExists = manifest['uses-permission'].some(
        (p) => p.$['android:name'] === permission
      );
      if (!alreadyExists) {
        manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    }

    return config;
  });
}

function withAgoraIOSPermissions(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.NSMicrophoneUsageDescription =
      config.modResults.NSMicrophoneUsageDescription || MICROPHONE_DESCRIPTION;
    return config;
  });
}

function withAgoraPermissions(config) {
  config = withAgoraAndroidPermissions(config);
  config = withAgoraIOSPermissions(config);
  return config;
}

module.exports = createRunOncePlugin(
  withAgoraPermissions,
  'withAgoraPermissions',
  '1.0.0'
);
