const config = {
  name: 'UNEXA SuperApp',
  slug: 'unexa-superapp',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0A'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.unexa.superapp'
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#0A0A0A',
      foregroundImage: './assets/adaptive-icon.png'
    },
    package: 'com.unexa.superapp'
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro'
  },
  plugins: [
    'expo-audio',
    'expo-video',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow UNEXA to access your camera'
      }
    ]
  ],
  extra: {
    eas: {
      projectId: 'your-project-id-here'
    }
  },
  scheme: 'unexa'
};

export default config;
