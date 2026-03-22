const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Setup dotenv
require('dotenv').config({ path: 'f:/Project/Unexa_FYP/backend/.env' });

async function checkDB() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected!');

    const User = require('./models/User');
    const Profile = require('./models/Profile');

    const users = await User.find().select('username profilePhoto');
    const profiles = await Profile.find().select('user avatar username');

    console.log('\n👥 USERS in DB:');
    users.forEach(u => {
      console.log(` - ${u.username} (${u._id}): ${u.profilePhoto}`);
    });

    console.log('\n🖼️ PROFILES in DB:');
    profiles.forEach(p => {
      console.log(` - Profile for user ${p.user}: Avatar -> ${p.avatar}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkDB();
