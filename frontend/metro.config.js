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
config.maxWorkers = 4; // Use 4 workers if available
config.resetCache = false; // DON'T reset cache every time (This makes it SLOW)

module.exports = config;
