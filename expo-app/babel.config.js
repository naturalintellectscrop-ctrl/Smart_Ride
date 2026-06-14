module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      // NOTE: 'nativewind/babel' removed — was causing style recalculation
      // on every render, which makes TextInput cursor jump on Android.
      // All styles use StyleSheet.create() directly instead.
    ],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@/src': './src',
          },
        },
      ],
      // Strip console.log/info/debug in production (keeps warn & error)
      ...(process.env.NODE_ENV === 'production'
        ? [
            [
              'transform-remove-console',
              { exclude: ['error', 'warn'] },
            ],
          ]
        : []),
    ],
  };
};
