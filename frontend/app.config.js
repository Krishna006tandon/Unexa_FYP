const config = {
  name: 'UNEXA',
  slug: 'unexa',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/Unexalogo.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/Unexalogo.png',
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
      foregroundImage: './assets/Unexalogo.png'
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
    favicon: './assets/Unexalogo.png',
    bundler: 'metro'
  },
  plugins: [
    'expo-audio',
    'expo-video',
    'expo-font',
    './plugins/withScreenShareRtmp',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow UNEXA to access your camera',
        microphonePermission: 'Allow UNEXA to access your microphone'
      }
    ]
  ],
  updates: {
    url: 'https://u.expo.dev/16ce1f59-3a00-442f-94a7-50bf0c6d17a9'
  },
  runtimeVersion: '1.0.0',
  extra: {
    eas: {
      projectId: '16ce1f59-3a00-442f-94a7-50bf0c6d17a9'
    },
    // Environment variables for Expo
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://unexa-fyp.onrender.com',
    cloudinaryCloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY,
  },
  scheme: 'unexa'
};

export default config;
