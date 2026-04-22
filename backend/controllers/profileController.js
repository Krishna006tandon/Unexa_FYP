const Profile = require('../models/Profile');
const User = require('../models/User');
const { deleteFromCloudinary } = require('../config/cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Streak = require('../models/Streak');
const { encrypt, decrypt } = require('../utils/encryption');

// @desc    Create or update profile
// @route   POST /api/profile
// @access  Private
const createOrUpdateProfile = async (req, res) => {
  try {
    const {
      username,
      fullName,
      bio,
      email,
      phone,
      dateOfBirth,
      gender,
      location,
      website,
      socialLinks,
      interests,
      skills,
      notificationSettings,
      privacySettings
    } = req.body;

    // Load existing profile once so we can preserve required fields on partial updates
    const existingProfileForUser = await Profile.findOne({ user: req.user.id });

    const resolvedUsername =
      (typeof username === 'string' && username.trim() ? username.trim() : null) ||
      existingProfileForUser?.username ||
      req.user?.username;

    const resolvedEmailRaw =
      (typeof email === 'string' && email.trim() ? email.trim() : null) ||
      existingProfileForUser?.email ||
      req.user?.email;

    const resolvedEmail =
      typeof resolvedEmailRaw === 'string' ? resolvedEmailRaw.toLowerCase().trim() : resolvedEmailRaw;

    const resolvedFullName =
      (typeof fullName === 'string' && fullName.trim() ? fullName.trim() : null) ||
      existingProfileForUser?.fullName ||
      req.user?.username ||
      'Unexa User';

    // Check if username is already taken by another user
    if (resolvedUsername) {
      const existingProfile = await Profile.findOne({ 
        username: resolvedUsername,
        user: { $ne: req.user.id } 
      });
      if (existingProfile) {
        // If the profile's linked user no longer exists (stale data), cleanup and allow reuse
        const linkedUserExists = await User.exists({ _id: existingProfile.user });
        if (!linkedUserExists) {
          await Profile.deleteOne({ _id: existingProfile._id });
        } else {
          return res.status(400).json({ message: 'Username already taken' });
        }
      }
    }

    if (resolvedEmail) {
      const existingProfile = await Profile.findOne({ 
        email: resolvedEmail,
        user: { $ne: req.user.id } 
      });
      if (existingProfile) {
        // If the profile's linked user no longer exists (stale data), cleanup and allow reuse
        const linkedUserExists = await User.exists({ _id: existingProfile.user });
        if (!linkedUserExists) {
          await Profile.deleteOne({ _id: existingProfile._id });
        } else {
          return res.status(400).json({ message: 'Email already taken' });
        }
      }
    }

    // Build a $set payload with only defined values, but always ensure required fields exist
    const profileData = { user: req.user.id, username: resolvedUsername, fullName: resolvedFullName, email: resolvedEmail };
    const optionalFields = {
      bio,
      phone,
      dateOfBirth,
      gender,
      location,
      website,
      socialLinks,
      interests,
      skills,
      notificationSettings,
      privacySettings
    };

    for (const [key, value] of Object.entries(optionalFields)) {
      if (typeof value !== 'undefined') profileData[key] = value;
    }

    let profile = existingProfileForUser;
    const wasCreated = !profile;

    if (profile) {
      // Update existing profile
      profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileData },
        { new: true, runValidators: true }
      ).populate('user', 'name');
    } else {
      // Create new profile
      profile = new Profile(profileData);
      await profile.save();
      await profile.populate('user', 'name');
    }

    // TODO: Fix socket.io integration
    // req.io.emit('profileUpdated', {
    //   profileId: profile._id,
    //   userId: req.user.id,
    //   profile: profile
    // });

    res.status(200).json({
      success: true,
      data: profile,
      message: wasCreated ? 'Profile created successfully' : 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error in createOrUpdateProfile:', error);

    // Common case: validation errors when required fields are missing/malformed
    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile data',
        error: error.message
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get current user's profile
// @route   GET /api/profile/me
// @access  Private
const getMyProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id })
      .populate('user', 'username email isOnline lastSeen');

    if (!profile) {
      return res.status(404).json({ 
        success: false,
        message: 'Profile not found' 
      });
    }

    // Calculate total streaks
    const streaks = await Streak.find({ users: req.user.id });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalStreaks = streaks.reduce((acc, curr) => {
      if (!curr.lastSharedDate) return acc;
      const lastShared = new Date(curr.lastSharedDate);
      lastShared.setHours(0, 0, 0, 0);
      const dayDiff = Math.floor((today - lastShared) / (1000 * 60 * 60 * 24));
      
      // If dayDiff > 1, streak is broken
      return acc + (dayDiff > 1 ? 0 : curr.currentStreak);
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        ...profile.toObject(),
        totalStreaks
      }
    });

  } catch (error) {
    console.error('Error in getMyProfile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get profile by username or ID
// @route   GET /api/profile/:identifier
// @access  Public
const getProfileByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;
    
    let query = {};
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      query.$or = [{ user: identifier }, { _id: identifier }];
    } else {
      query.username = identifier;
    }

    let profile = await Profile.findOne(query)
      .populate('user', 'username profilePhoto isOnline lastSeen')
      .select('-notificationSettings -privacySettings -email -phone');

    // If profile not found, let's try to find the user and create a default profile
    if (!profile) {
      console.log('📝 Profile not found for:', identifier, 'Checking User table...');
      const user = identifier.match(/^[0-9a-fA-F]{24}$/) 
         ? await User.findById(identifier) 
         : await User.findOne({ username: identifier });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Create a default profile
      profile = new Profile({
        user: user._id,
        username: user.username,
        fullName: user.username || 'Unexa User',
        email: user.email,
        bio: 'Welcome to making connections on Unexa!',
        avatar: user.profilePhoto || ''
      });
      await profile.save();
      await profile.populate('user', 'username profilePhoto');
      console.log('✅ Auto-created profile for existing user:', user.username);
    }

    // Check following status if logged in
    let isFollowing = false;
    let isCloseFriend = false;
    if (req.user) {
      const currentUser = await User.findById(req.user.id);
      isFollowing = currentUser.following.includes(profile.user._id);
      isCloseFriend = currentUser.closeFriends && currentUser.closeFriends.includes(profile.user._id);
    }

    // If profile is private and NOT owner and NOT following, return limited data
    if (profile.isPrivate && profile.user._id.toString() !== req.user?.id && !isFollowing) {
      const limitedProfile = {
        _id: profile._id,
        user: profile.user,
        username: profile.username,
        fullName: profile.fullName,
        avatar: profile.avatar,
        bio: "This profile is private. Follow to see their profile details.",
        followersCount: profile.followersCount,
        followingCount: profile.followingCount,
        postsCount: profile.postsCount,
        isVerified: profile.isVerified,
        isPrivate: profile.isPrivate,
        isFollowing,
        isCloseFriend
      };

      return res.status(200).json({
        success: true,
        data: limitedProfile,
        isLocked: true
      });
    }

    // Calculate total streaks for this profile user
    const streaks = await Streak.find({ users: profile.user._id });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalStreaks = streaks.reduce((acc, curr) => {
      if (!curr.lastSharedDate) return acc;
      const lastShared = new Date(curr.lastSharedDate);
      lastShared.setHours(0, 0, 0, 0);
      const dayDiff = Math.floor((today - lastShared) / (1000 * 60 * 60 * 24));
      
      return acc + (dayDiff > 1 ? 0 : curr.currentStreak);
    }, 0);

    const profileObj = profile.toObject();
    delete profileObj.email;
    delete profileObj.phone;

    res.status(200).json({
      success: true,
      data: {
        ...profileObj,
        isFollowing,
        isCloseFriend,
        totalStreaks
      }
    });

  } catch (error) {
    console.error('Error in getProfileByIdentifier:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Upload avatar
// @route   POST /api/profile/avatar
// @access  Private
const uploadAvatar = async (req, res) => {
  try {
    const uploadSingle = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = path.join(__dirname, '../uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
        }
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
    }).single('avatar');

    uploadSingle(req, res, async function (err) {
      if (err) {
        console.error('❌ Avatar upload error:', err);
        return res.status(400).json({ 
          success: false,
          message: err.message 
        });
      }

      if (!req.file) {
        console.log('❌ No file received for avatar upload');
        return res.status(400).json({ 
          success: false,
          message: 'No file uploaded' 
        });
      }

      console.log('📁 Avatar file received:', req.file.originalname);

      try {
        // Get the current profile to check if there's an existing avatar
        const currentProfile = await Profile.findOne({ user: req.user.id });
        
        // Delete old avatar from Cloudinary if it exists
        if (currentProfile && currentProfile.avatar) {
          // Extract public_id from Cloudinary URL
          const urlParts = currentProfile.avatar.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const publicId = fileName.split('.')[0];
          
          try {
            await deleteFromCloudinary(`unexa/profiles/${publicId}`);
            console.log('🗑️ Old avatar deleted from Cloudinary');
          } catch (deleteError) {
            console.log('Failed to delete old avatar:', deleteError.message);
            // Continue with upload even if deletion fails
          }
        }

        // Upload to Cloudinary directly
        console.log('☁️ Uploading avatar to Cloudinary...');
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        });
        
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'unexa/profiles',
          resource_type: 'auto'
        });
        
        const avatarUrl = result.secure_url;
        console.log('✅ Avatar uploaded to Cloudinary:', avatarUrl);

        // Clean up local file
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Local file cleaned up');

        const profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { 
            avatar: avatarUrl,
            // Also ensure basic fields are set if this is an upsert
            $setOnInsert: { 
               username: req.user.username || `user_${req.user.id.toString().substring(0,6)}`,
               fullName: req.user.username || 'New User',
               email: req.user.email || ''
            }
          },
          { new: true, runValidators: true, upsert: true }
        ).populate('user', 'username');

        // SYNC: Update the User model's profilePhoto as well for Chat/Global compatibility
        await User.findByIdAndUpdate(req.user.id, { profilePhoto: avatarUrl });

        console.log('✅ Profile (Upserted) and User models updated with new avatar');

        res.status(200).json({
          success: true,
          data: profile,
          message: 'Avatar uploaded successfully'
        });

      } catch (cloudinaryError) {
        console.error('❌ Cloudinary error:', cloudinaryError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload avatar to cloud storage',
          error: cloudinaryError.message
        });
      }
    });

  } catch (error) {
    console.error('❌ Error in uploadAvatar:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Upload cover image
// @route   POST /api/profile/cover
// @access  Private
const uploadCoverImage = async (req, res) => {
  try {
    const uploadSingle = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = path.join(__dirname, '../uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
        }
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
    }).single('coverImage');

    uploadSingle(req, res, async function (err) {
      if (err) {
        console.error('❌ Cover image upload error:', err);
        return res.status(400).json({ 
          success: false,
          message: err.message 
        });
      }

      if (!req.file) {
        console.log('❌ No file received for cover image upload');
        return res.status(400).json({ 
          success: false,
          message: 'No file uploaded' 
        });
      }

      console.log('📁 Cover image file received:', req.file.originalname);

      try {
        // Get the current profile to check if there's an existing cover image
        const currentProfile = await Profile.findOne({ user: req.user.id });
        
        // Delete old cover image from Cloudinary if it exists
        if (currentProfile && currentProfile.coverImage) {
          // Extract public_id from Cloudinary URL
          const urlParts = currentProfile.coverImage.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const publicId = fileName.split('.')[0];
          
          try {
            await deleteFromCloudinary(`unexa/profiles/${publicId}`);
            console.log('🗑️ Old cover image deleted from Cloudinary');
          } catch (deleteError) {
            console.log('Failed to delete old cover image:', deleteError.message);
            // Continue with upload even if deletion fails
          }
        }

        // Upload to Cloudinary directly
        console.log('☁️ Uploading cover image to Cloudinary...');
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        });
        
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'unexa/profiles',
          resource_type: 'auto'
        });
        
        const coverImageUrl = result.secure_url;
        console.log('✅ Cover image uploaded to Cloudinary:', coverImageUrl);

        // Clean up local file
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Local file cleaned up');

        const profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { coverImage: coverImageUrl },
          { new: true, runValidators: true }
        ).populate('user', 'name');

        console.log('✅ Profile updated with new cover image');

        res.status(200).json({
          success: true,
          data: profile,
          message: 'Cover image uploaded successfully'
        });

      } catch (cloudinaryError) {
        console.error('❌ Cloudinary error:', cloudinaryError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload cover image to cloud storage',
          error: cloudinaryError.message
        });
      }
    });

  } catch (error) {
    console.error('❌ Error in uploadCoverImage:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Search profiles
// @route   GET /api/profile/search?q=query&limit=10&page=1
// @access  Public
const searchProfiles = async (req, res) => {
  try {
    const { q, limit = 10, page = 1 } = req.query;
    
    if (!q) {
      return res.status(400).json({ 
        success: false,
        message: 'Search query is required' 
      });
    }

    const skip = (page - 1) * limit;

    const profiles = await Profile.find({
      $or: [
        { username: q },
        { fullName: q },
        { email: q }
      ],
      isActive: true
    })
    .populate('user', 'name')
    .select('-notificationSettings -privacySettings -email -phone')
    .sort({ followersCount: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    const total = await Profile.countDocuments({
      $or: [
        { username: q },
        { fullName: q },
        { email: q }
      ],
      isActive: true
    });

    res.status(200).json({
      success: true,
      data: profiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error in searchProfiles:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Delete profile
// @route   DELETE /api/profile
// @access  Private
const deleteProfile = async (req, res) => {
  try {
    const profile = await Profile.findOneAndDelete({ user: req.user.id });

    if (!profile) {
      return res.status(404).json({ 
        success: false,
        message: 'Profile not found' 
      });
    }

    // TODO: Fix socket.io integration
    // req.io.emit('profileDeleted', {
    //   profileId: profile._id,
    //   userId: req.user.id
    // });

    res.status(200).json({
      success: true,
      message: 'Profile deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteProfile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Toggle profile visibility
// @route   PATCH /api/profile/visibility
// @access  Private
const toggleVisibility = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    if (!profile) {
      return res.status(404).json({ 
        success: false,
        message: 'Profile not found' 
      });
    }

    profile.isPrivate = !profile.isPrivate;
    await profile.save();

    // TODO: Fix socket.io integration
    // req.io.emit('profileVisibilityChanged', {
    //   profileId: profile._id,
    //   userId: req.user.id,
    //   isPrivate: profile.isPrivate
    // });

    res.status(200).json({
      success: true,
      data: profile,
      message: `Profile is now ${profile.isPrivate ? 'private' : 'public'}`
    });

  } catch (error) {
    console.error('Error in toggleVisibility:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Follow a user
// @route   POST /api/profile/:id/follow
// @access  Private
const followUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Add to following
    if (!currentUser.following.includes(targetUserId)) {
      currentUser.following.push(targetUserId);
      await currentUser.save();
      // Update Profile count
      await Profile.findOneAndUpdate({ user: currentUserId }, { $inc: { followingCount: 1 } });
    }

    // Add to followers
    if (!targetUser.followers.includes(currentUserId)) {
      targetUser.followers.push(currentUserId);
      await targetUser.save();
      // Update Profile count
      await Profile.findOneAndUpdate({ user: targetUserId }, { $inc: { followersCount: 1 } });
    }

    res.json({ success: true, message: "Following user" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unfollow a user
// @route   POST /api/profile/:id/unfollow
// @access  Private
const unfollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Remove from following
    if (currentUser.following.includes(targetUserId)) {
      currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId);
      await currentUser.save();
      // Update Profile count
      await Profile.findOneAndUpdate({ user: currentUserId }, { $inc: { followingCount: -1 } });
    }

    // Remove from followers
    if (targetUser.followers.includes(currentUserId)) {
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId);
      await targetUser.save();
      // Update Profile count
      await Profile.findOneAndUpdate({ user: targetUserId }, { $inc: { followersCount: -1 } });
    }

    res.json({ success: true, message: "Unfollowed user" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle Close Friend status
// @route   POST /api/profile/:id/close-friend
// @access  Private
const toggleCloseFriend = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId);

    if (!currentUser.closeFriends) currentUser.closeFriends = [];

    const index = currentUser.closeFriends.indexOf(targetUserId);
    if (index > -1) {
      currentUser.closeFriends.splice(index, 1);
    } else {
      currentUser.closeFriends.push(targetUserId);
    }

    await currentUser.save();
    res.json({ success: true, isCloseFriend: index === -1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrUpdateProfile,
  getMyProfile,
  getProfileByIdentifier,
  uploadAvatar,
  uploadCoverImage,
  searchProfiles,
  deleteProfile,
  toggleVisibility,
  followUser,
  unfollowUser,
  toggleCloseFriend
};
