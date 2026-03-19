const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUserPassword() {
  try {
    await mongoose.connect('mongodb+srv://nexbyte:nexbyte@nexbyte.wplnzim.mongodb.net/unexa_new', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Checking user passwords...');
    
    // Check specific user
    const user = await User.findOne({ email: 'krishnatandon006@gmail.com' });
    
    if (user) {
      console.log('User Found:');
      console.log('  Username:', user.username);
      console.log('  Email:', user.email);
      console.log('  Password Hash:', user.passwordHash);
      console.log('  Stored Hash Length:', user.passwordHash.length);
      
      // Test password comparison
      const testPassword = 'password123';
      const isMatch = user.passwordHash === testPassword; // Plain text comparison for testing
      
      console.log('  Test Password:', testPassword);
      console.log('  Password Match:', isMatch);
      
      if (!isMatch) {
        console.log('❌ Password does not match!');
        console.log('💡 This is expected - passwords should be hashed in production');
      }
    } else {
      console.log('❌ User not found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUserPassword();
