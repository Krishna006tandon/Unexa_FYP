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
    bundleIdentifier: 'com.unexa.superapp',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
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
  updates: {
    url: 'https://u.expo.dev/d0033147-bdaf-48b1-8af8-68077eaa17dc'
  },
  runtimeVersion: '1.0.0',
  extra: {
    eas: {
      projectId: 'd0033147-bdaf-48b1-8af8-68077eaa17dc'
    },
    // Environment variables for Expo
    apiUrl: process.env.API_URL || 'https://unexa-fyp.onrender.com',
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  },
  scheme: 'unexa'
};

export default config;
