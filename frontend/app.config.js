const config = {
  name: 'UNEXA',
  slug: 'unexa',
  version: '1.2.11',
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
    bundleIdentifier: 'com.unexa.application',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    softwareKeyboardLayoutMode: 'resize',
    adaptiveIcon: {
      backgroundColor: '#000000',
      foregroundImage: './assets/Unexalogo.png'
    },
    package: 'com.unexa.application',
    versionCode: 4,
    permissions: [
      "RECORD_AUDIO",
      "CAMERA",
      "MODIFY_AUDIO_SETTINGS",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "READ_MEDIA_IMAGES",
      "READ_MEDIA_VIDEO",
      "READ_MEDIA_AUDIO",
      "POST_NOTIFICATIONS",
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
    'expo-video',
    'expo-font',
    './plugins/withScreenShareRtmp',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow UNEXA to access your camera',
        microphonePermission: 'Allow UNEXA to access your microphone'
      }
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow UNEXA to access your photos to share media and set thumbnails'
      }
    ],
    'expo-notifications',
    'expo-local-authentication'
  ],
  updates: {
    url: 'https://u.expo.dev/2f5c4478-8850-473b-9b46-cd5121d02f24'
  },
  runtimeVersion: '1.0.0',
  extra: {
    eas: {
      projectId: '2f5c4478-8850-473b-9b46-cd5121d02f24'
    },
    // Environment variables for Expo
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://unexa-fyp.onrender.com',
    cloudinaryCloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY,
  },
  scheme: 'unexa'
};

export default config;
