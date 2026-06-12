// Custom Babel plugin to strip console.log/info/debug in production (keeps warn & error)
const removeConsolePlugin = () => {
  const removedMethods = ['log', 'info', 'debug'];
  return {
    visitor: {
      MemberExpression(path) {
        if (
          path.node.object &&
          path.node.object.name === 'console' &&
          removedMethods.includes(path.node.property.name)
        ) {
          const callExpr = path.parentPath;
          if (callExpr && callExpr.isCallExpression()) {
            callExpr.remove();
          }
        }
      },
    },
  };
};

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
      ...(process.env.NODE_ENV === 'production' ? [removeConsolePlugin] : []),
    ],
  };
};
