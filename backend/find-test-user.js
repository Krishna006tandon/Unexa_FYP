const mongoose = require('mongoose');
const User = require('./models/User');

async function findTestUser() {
  try {
    await mongoose.connect('mongodb+srv://nexbyte:nexbyte@nexbyte.wplnzim.mongodb.net/unexa_new', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Looking for user with simple password...');
    
    // Find user with simple password
    const users = await User.find({});
    
    let testUser = null;
    for (const user of users) {
      if (user.passwordHash === 'password123' || 
          user.passwordHash === 'test' ||
          user.passwordHash === 'admin') {
        testUser = user;
        break;
      }
    }
    
    if (testUser) {
      console.log('✅ Test User Found:');
      console.log('  Username:', testUser.username);
      console.log('  Email:', testUser.email);
      console.log('  User ID:', testUser._id);
      console.log('  Password:', testUser.passwordHash);
      console.log('\n🎯 Use these credentials to login:');
      console.log('  Email:', testUser.email);
      console.log('  Password:', testUser.passwordHash);
    } else {
      console.log('❌ No user with simple password found');
      console.log('💡 Available users:');
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.username} (${user.email}) - Password: ${user.passwordHash}`);
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findTestUser();
