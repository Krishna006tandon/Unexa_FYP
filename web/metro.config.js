const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable fast refresh
config.resolver.platforms = ['ios', 'android', 'web', 'native'];

// Increase watch sensitivity for faster updates
config.watchFolders = [__dirname];

// Enable fast refresh for all file types
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Optimize bundling for development
config.maxWorkers = 2;
config.resetCache = true;

module.exports = config;
