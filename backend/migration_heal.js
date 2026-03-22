const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Setup dotenv
require('dotenv').config({ path: 'f:/Project/Unexa_FYP/backend/.env' });

async function migrate() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected!');

    const User = require('./models/User');
    const Profile = require('./models/Profile');

    const profiles = await Profile.find({ avatar: { $ne: '' } });
    console.log(`🚀 Found ${profiles.length} profiles with avatars. Starting migration...`);

    for (const p of profiles) {
       console.log(` 🔄 Attempting Sync: ${p.user} -> ${p.avatar}`);
       const result = await User.updateOne(
         { _id: p.user }, 
         { $set: { profilePhoto: p.avatar } }
       );
       console.log(`    ✅ Update Result: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
    }

    console.log('✅ DATABASE HEALED & SYNCED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during healing:', err.message);
    process.exit(1);
  }
}

migrate();
