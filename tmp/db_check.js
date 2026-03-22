const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Setup dotenv
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function checkDB() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!');

    const User = require('../backend/models/User');
    const Profile = require('../backend/models/Profile');

    const users = await User.find().select('username profilePhoto');
    const profiles = await Profile.find().select('user avatar username');

    console.log('\n👥 USERS in DB:');
    users.forEach(u => {
      console.log(` - ${u.username} (${u._id}): ${u.profilePhoto}`);
    });

    console.log('\n🖼️ PROFILES in DB:');
    profiles.forEach(p => {
      console.log(` - ${p.username} (for user ${p.user}): ${p.avatar}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkDB();
