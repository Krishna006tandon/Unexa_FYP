const config = {
  name: 'UNEXA',
  slug: 'unexa',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#000000'
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
      backgroundColor: '#000000',
      foregroundImage: './assets/adaptive-icon.png'
    },
    package: 'com.unexa.superapp',
    permissions: [
      "RECORD_AUDIO",
      "CAMERA",
      "MODIFY_AUDIO_SETTINGS",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "VIBRATE",
      "ACCESS_NETWORK_STATE",
      "INTERNET"
    ]
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
        cameraPermission: 'Allow UNEXA to access your camera',
        microphonePermission: 'Allow UNEXA to access your microphone'
      }
    ]
  ],
  updates: {
    url: 'https://u.expo.dev/00e58f94-d139-4858-ae55-077ea71f067e'
  },
  runtimeVersion: '1.0.0',
  extra: {
    eas: {
      projectId: '00e58f94-d139-4858-ae55-077ea71f067e'
    },
    // Environment variables for Expo
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000',
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  },
  scheme: 'unexa'
};

export default config;
