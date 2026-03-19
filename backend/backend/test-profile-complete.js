const mongoose = require('mongoose');
const Profile = require('./models/Profile');
const User = require('./models/User');

// Complete profile test
async function testProfileComplete() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://nexbyte:nexbyte@nexbyte.wplnzim.mongodb.net/unexa_new', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');

    // Step 1: Create a test user first
    const testUser = new User({
      username: 'testprofileuser',
      email: 'testprofile@example.com',
      passwordHash: 'hashedpassword123',
      profilePhoto: 'https://i.pravatar.cc/150?u=testprofileuser'
    });

    const savedUser = await testUser.save();
    console.log('✅ Test user created:', savedUser._id);

    // Step 2: Create a complete profile
    const completeProfile = new Profile({
      user: savedUser._id,
      username: 'testprofileuser',
      fullName: 'Test Profile User',
      bio: 'This is a complete test profile with all fields',
      avatar: 'https://i.pravatar.cc/150?u=testprofileuser',
      coverImage: 'https://via.placeholder.com/800x300',
      email: 'testprofile@example.com',
      phone: '+1234567890',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      location: {
        country: 'Test Country',
        state: 'Test State',
        city: 'Test City'
      },
      website: 'https://testwebsite.com',
      socialLinks: {
        instagram: '@testprofile',
        twitter: '@testprofile',
        linkedin: 'testprofile',
        facebook: 'testprofile',
        youtube: 'testprofile'
      },
      interests: ['coding', 'design', 'music', 'travel', 'photography'],
      skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express'],
      isVerified: true,
      isPrivate: false,
      followersCount: 150,
      followingCount: 75,
      postsCount: 25,
      notificationSettings: {
        pushNotifications: true,
        emailNotifications: true,
        messageNotifications: true,
        followNotifications: true,
        mentionNotifications: true
      },
      privacySettings: {
        showEmail: false,
        showPhone: false,
        showDateOfBirth: false,
        showLocation: true,
        allowFollowRequests: true
      }
    });

    const savedProfile = await completeProfile.save();
    console.log('✅ Complete profile created:', savedProfile._id);

    // Step 3: Test profile retrieval
    const foundProfile = await Profile.findOne({ user: savedUser._id })
      .populate('user', 'username email');
    console.log('✅ Profile found with user populated:', foundProfile.username);

    // Step 4: Test profile update
    foundProfile.bio = 'Updated bio for testing';
    await foundProfile.save();
    console.log('✅ Profile updated successfully');

    // Step 5: Test profile search
    const searchResults = await Profile.find({
      $or: [
        { username: new RegExp('testprofile', 'i') },
        { fullName: new RegExp('test', 'i') }
      ]
    }).limit(5);
    console.log('✅ Profile search results:', searchResults.length);

    // Step 6: Test virtual age calculation
    console.log('✅ Virtual age:', foundProfile.age);

    // Step 7: Test profile by identifier
    const profileByUsername = await Profile.findOne({ username: 'testprofileuser' });
    const profileById = await Profile.findOne({ user: savedUser._id });
    console.log('✅ Profile by username:', !!profileByUsername);
    console.log('✅ Profile by user ID:', !!profileById);

    // Step 8: Clean up
    await Profile.deleteOne({ user: savedUser._id });
    await User.deleteOne({ _id: savedUser._id });
    console.log('✅ Test data cleaned up');

    console.log('🎉 Complete profile functionality test PASSED!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

testProfileComplete();
