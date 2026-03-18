const mongoose = require('mongoose');
const Profile = require('./models/Profile');
const User = require('./models/User');

async function checkProfile() {
  try {
    await mongoose.connect('mongodb+srv://nexbyte:nexbyte@nexbyte.wplnzim.mongodb.net/unexa_new', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Checking for existing profiles...');
    const profiles = await Profile.find({}).populate('user', 'username email');
    console.log('Total profiles found:', profiles.length);
    
    profiles.forEach((profile, index) => {
      console.log(`Profile ${index + 1}:`);
      console.log('  Username:', profile.username);
      console.log('  User ID:', profile.user?._id);
      console.log('  Email:', profile.email);
      console.log('  Full Name:', profile.fullName);
      console.log('---');
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkProfile();
