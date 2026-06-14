// Babel config for Expo/React Native
// Next.js uses its own SWC-based compiler and ignores this file
// unless explicitly configured to use Babel.
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
