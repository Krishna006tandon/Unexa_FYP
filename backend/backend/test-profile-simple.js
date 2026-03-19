const http = require('http');

// Simple HTTP request function
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            data: body ? JSON.parse(body) : null
          };
          resolve(result);
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test profile endpoints
async function testProfileSimple() {
  try {
    console.log('🧪 Testing Profile Endpoints (Simple)...\n');

    // Test 1: Register user
    console.log('1️⃣ Registering test user...');
    const userData = {
      username: 'profiletest' + Date.now(),
      email: `profiletest${Date.now()}@test.com`,
      password: 'password123'
    };

    const registerOptions = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const registerResult = await makeRequest(registerOptions, userData);
    console.log('✅ Register status:', registerResult.status);
    
    if (registerResult.status !== 201) {
      console.log('❌ Registration failed:', registerResult.data);
      return;
    }

    const token = registerResult.data.token;
    const username = registerResult.data.username;

    // Test 2: Create profile
    console.log('\n2️⃣ Creating profile...');
    const profileData = {
      username: username,
      fullName: 'Profile Test User',
      bio: 'This is a test profile',
      email: registerResult.data.email,
      interests: ['testing', 'coding']
    };

    const profileOptions = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/profile',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const profileResult = await makeRequest(profileOptions, profileData);
    console.log('✅ Profile creation status:', profileResult.status);

    // Test 3: Get profile
    console.log('\n3️⃣ Getting profile...');
    const getOptions = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/profile/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const getResult = await makeRequest(getOptions);
    console.log('✅ Get profile status:', getResult.status);

    // Test 4: Friends endpoint (the failing one)
    console.log('\n4️⃣ Testing friends endpoint...');
    const friendsOptions = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/chat/friends',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const friendsResult = await makeRequest(friendsOptions);
    console.log('✅ Friends endpoint status:', friendsResult.status);
    
    if (friendsResult.status === 500) {
      console.log('❌ Friends endpoint error:', friendsResult.data);
    } else {
      console.log('✅ Friends endpoint working:', friendsResult.data);
    }

    console.log('\n🎉 Simple profile test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProfileSimple();
