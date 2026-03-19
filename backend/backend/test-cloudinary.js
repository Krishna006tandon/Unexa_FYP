require('dotenv').config();
const { cloudinary } = require('./config/cloudinary');

// Test Cloudinary connection
const testCloudinaryConnection = async () => {
  try {
    console.log('🔍 Testing Cloudinary configuration...');
    
    // Check if environment variables are set
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.error('❌ CLOUDINARY_CLOUD_NAME is not set');
      return false;
    }
    
    if (!process.env.CLOUDINARY_API_KEY) {
      console.error('❌ CLOUDINARY_API_KEY is not set');
      return false;
    }
    
    if (!process.env.CLOUDINARY_API_SECRET) {
      console.error('❌ CLOUDINARY_API_SECRET is not set');
      return false;
    }
    
    console.log('✅ Environment variables are set');
    console.log(`Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    
    // Test API connection by getting account info
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary API connection successful');
    console.log('API Response:', result);
    
    // Test upload (optional - requires a test image)
    console.log('📤 Cloudinary is ready for file uploads');
    
    return true;
    
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
    return false;
  }
};

// Run the test
testCloudinaryConnection().then(success => {
  if (success) {
    console.log('🎉 Cloudinary setup is complete and working!');
  } else {
    console.log('⚠️  Please check your Cloudinary configuration');
  }
  process.exit(success ? 0 : 1);
});
