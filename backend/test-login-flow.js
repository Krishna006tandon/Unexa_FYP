const axios = require('axios');

// Test complete login flow
async function testLoginFlow() {
  try {
    console.log('🧪 Testing Complete Login Flow...\n');

    // Step 1: Test login with existing user
    console.log('1️⃣ Testing login with existing user...');
    const loginResponse = await axios.post('http://192.168.29.104:5001/api/auth/login', {
      email: 'krishnatandon006@gmail.com',
      password: 'password123'
    });

    console.log('Login Response:', loginResponse.status);
    
    if (loginResponse.status === 200) {
      const token = loginResponse.data.token;
      const userId = loginResponse.data._id;
      
      console.log('✅ Login successful!');
      console.log('Token:', token.substring(0, 20) + '...');
      console.log('User ID:', userId);

      // Step 2: Test profile creation with this token
      console.log('\n2️⃣ Testing profile creation with valid token...');
      
      const profileResponse = await axios.post(
        'http://192.168.29.104:5001/api/profile',
        {
          username: 'testuser' + Date.now(),
          fullName: 'Login Test User',
          bio: 'Testing profile after login',
          email: loginResponse.data.email
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('Profile Creation Response:', profileResponse.status);
      
      if (profileResponse.status === 200) {
        console.log('✅ Profile created successfully!');
        console.log('Profile Username:', profileResponse.data.data.username);
      } else {
        console.log('❌ Profile creation failed:', profileResponse.data);
      }

      // Step 3: Test profile retrieval with same token
      console.log('\n3️⃣ Testing profile retrieval...');
      
      const getProfileResponse = await axios.get(
        'http://192.168.29.104:5001/api/profile/me',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('Get Profile Response:', getProfileResponse.status);
      
      if (getProfileResponse.status === 200) {
        console.log('✅ Profile retrieved successfully!');
        console.log('Profile Full Name:', getProfileResponse.data.data.fullName);
      } else {
        console.log('❌ Profile retrieval failed:', getProfileResponse.data);
      }

    } else {
      console.log('❌ Login failed:', loginResponse.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.error('Server error details:', error.response.data);
    }
  }
}

testLoginFlow();
