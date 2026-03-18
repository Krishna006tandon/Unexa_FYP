const axios = require('axios');

// Test profile endpoints
async function testProfileEndpoints() {
  try {
    console.log('🧪 Testing Profile Endpoints...\n');

    // Test 1: Create a test user first
    console.log('1️⃣ Creating test user...');
    const registerResponse = await axios.post('http://localhost:5001/api/auth', {
      username: 'profiletest' + Date.now(),
      email: `profiletest${Date.now()}@test.com`,
      password: 'password123'
    });
    
    console.log('✅ User created:', registerResponse.data.username);
    const token = registerResponse.data.token;
    const userId = registerResponse.data._id;

    // Test 2: Create profile
    console.log('\n2️⃣ Creating profile...');
    const profileData = {
      username: registerResponse.data.username,
      fullName: 'Profile Test User',
      bio: 'This is a test profile for endpoint testing',
      email: registerResponse.data.email,
      interests: ['testing', 'coding', 'development'],
      skills: ['JavaScript', 'Node.js', 'React'],
      location: {
        city: 'Test City',
        country: 'Test Country'
      }
    };

    const createProfileResponse = await axios.post(
      'http://localhost:5001/api/profile',
      profileData,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Profile created:', createProfileResponse.data.data.username);

    // Test 3: Get my profile
    console.log('\n3️⃣ Getting my profile...');
    const getProfileResponse = await axios.get(
      'http://localhost:5001/api/profile/me',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Profile retrieved:', getProfileResponse.data.data.fullName);

    // Test 4: Update profile
    console.log('\n4️⃣ Updating profile...');
    const updateData = {
      bio: 'Updated bio for testing',
      interests: ['testing', 'coding', 'development', 'updated']
    };

    const updateResponse = await axios.post(
      'http://localhost:5001/api/profile',
      updateData,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Profile updated:', updateResponse.data.data.bio);

    // Test 5: Search profiles
    console.log('\n5️⃣ Searching profiles...');
    const searchResponse = await axios.get(
      'http://localhost:5001/api/profile/search?q=test&limit=5',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Search results:', searchResponse.data.data.length, 'profiles found');

    // Test 6: Get profile by identifier
    console.log('\n6️⃣ Getting profile by identifier...');
    const profileByIdentifier = await axios.get(
      `http://localhost:5001/api/profile/${registerResponse.data.username}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Profile by identifier:', profileByIdentifier.data.data.fullName);

    // Test 7: Toggle visibility
    console.log('\n7️⃣ Toggling profile visibility...');
    const toggleResponse = await axios.patch(
      'http://localhost:5001/api/profile/visibility',
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Visibility toggled:', toggleResponse.data.data.isPrivate ? 'Private' : 'Public');

    // Test 8: Test friends endpoint (this was failing)
    console.log('\n8️⃣ Testing friends endpoint...');
    try {
      const friendsResponse = await axios.get(
        'http://localhost:5001/api/chat/friends',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('✅ Friends endpoint working:', friendsResponse.data.friends?.length || 0, 'friends found');
    } catch (friendsError) {
      console.log('❌ Friends endpoint failed:', friendsError.response?.data || friendsError.message);
    }

    console.log('\n🎉 Profile endpoints test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.error('Server error details:', error.response.data);
    }
  }
}

testProfileEndpoints();
