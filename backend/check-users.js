const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
  try {
    await mongoose.connect('mongodb+srv://nexbyte:nexbyte@nexbyte.wplnzim.mongodb.net/unexa_new', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Checking for existing users...');
    const users = await User.find({});
    console.log('Total users found:', users.length);
    
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log('  Username:', user.username);
      console.log('  Email:', user.email);
      console.log('  User ID:', user._id);
      console.log('---');
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUsers();
