module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      'nativewind/babel',
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
