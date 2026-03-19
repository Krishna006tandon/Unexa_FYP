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

// Test complete login flow
async function testLoginSimple() {
  try {
    console.log('🧪 Testing Complete Login Flow (Simple)...\n');

    // Step 1: Test login
    console.log('1️⃣ Testing login...');
    const loginOptions = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const loginResult = await makeRequest(loginOptions, {
      email: 'krishnatandon006@gmail.com',
      password: 'password123'
    });

    console.log('Login Status:', loginResult.status);
    
    if (loginResult.status === 200) {
      const token = loginResult.data.token;
      const userId = loginResult.data._id;
      
      console.log('✅ Login successful!');
      console.log('User ID:', userId);

      // Step 2: Test profile creation
      console.log('\n2️⃣ Testing profile creation...');
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

      const profileResult = await makeRequest(profileOptions, {
        username: 'testuser' + Date.now(),
        fullName: 'Login Test User',
        bio: 'Testing profile after login',
        email: loginResult.data.email
      });

      console.log('Profile Creation Status:', profileResult.status);
      
      if (profileResult.status === 200) {
        console.log('✅ Profile created successfully!');
        console.log('Profile Username:', profileResult.data.data.username);
      } else {
        console.log('❌ Profile creation failed:', profileResult.data);
      }

      // Step 3: Test profile retrieval
      console.log('\n3️⃣ Testing profile retrieval...');
      const getProfileOptions = {
        hostname: 'localhost',
        port: 5001,
        path: '/api/profile/me',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const getProfileResult = await makeRequest(getProfileOptions);
      console.log('Get Profile Status:', getProfileResult.status);
      
      if (getProfileResult.status === 200) {
        console.log('✅ Profile retrieved successfully!');
        console.log('Profile Full Name:', getProfileResult.data.data.fullName);
      } else {
        console.log('❌ Profile retrieval failed:', getProfileResult.data);
      }

    } else {
      console.log('❌ Login failed:', loginResult.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLoginSimple();
