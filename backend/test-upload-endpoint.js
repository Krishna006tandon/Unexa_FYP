require('dotenv').config();
const fs = require('fs');
const axios = require('axios');

// Test upload endpoint
const testUpload = async () => {
  try {
    console.log('🧪 Testing upload endpoint...');
    
    // Test the upload endpoint health
    const response = await axios.get('http://localhost:5000/api/upload', {
      timeout: 10000
    });
    
    console.log('✅ Upload endpoint health:', response.status);
    console.log('✅ Upload endpoint response:', response.data);
    
  } catch (error) {
    console.error('❌ Upload test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
};

// Test Cloudinary configuration
const testCloudinary = () => {
  console.log('☁️ Testing Cloudinary config...');
  const { cloudinary } = require('./config/cloudinary');
  
  cloudinary.api.ping()
    .then(result => {
      console.log('✅ Cloudinary connection:', result);
    })
    .catch(error => {
      console.error('❌ Cloudinary error:', error);
    });
};

// Run tests
testCloudinary();
testUpload();
