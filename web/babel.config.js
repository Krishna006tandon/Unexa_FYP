module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      production: {
        plugins: ['react-native-reanimated/plugin'],
      },
      development: {
        plugins: [
          [
            'module-resolver',
            {
              root: ['./src'],
              extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
              alias: {
                '@': './src',
              },
            },
          ],
          'react-native-reanimated/plugin',
        ],
      },
    },
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
