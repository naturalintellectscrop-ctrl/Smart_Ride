// ============================================
// SMART RIDE MOBILE - BABEL CONFIG
// ============================================
// react-native-reanimated plugin MUST be last
// ============================================

module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated plugin MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
