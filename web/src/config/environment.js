import Constants from 'expo-constants';

// Environment variables for Expo app
const ENVIRONMENT = {
  // API Configuration (supports ngrok/local overrides via app.config.js extra.apiUrl)
  API_URL: 'https://unexa-fyp.onrender.com',

  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: Constants.expoConfig?.extra?.cloudinaryCloudName,
  CLOUDINARY_API_KEY: Constants.expoConfig?.extra?.cloudinaryApiKey,
  CLOUDINARY_API_SECRET: Constants.expoConfig?.extra?.cloudinaryApiSecret,

  // App Configuration
  APP_NAME: Constants.expoConfig?.name || 'UNEXA SuperApp',
  VERSION: Constants.expoConfig?.version || '1.0.0',

  // Development/Production Detection
  IS_DEV: __DEV__,
  IS_PROD: !__DEV__,
};

// Validation
console.log('ðŸ”§ Environment Configuration:');
console.log('   API_URL:', ENVIRONMENT.API_URL);

export default ENVIRONMENT;

