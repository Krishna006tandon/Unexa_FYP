const Profile = require('../models/Profile');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profiles/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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

    // Check if username is already taken by another user
    if (username) {
      const existingProfile = await Profile.findOne({ 
        username, 
        user: { $ne: req.user.id } 
      });
      if (existingProfile) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    // Check if email is already taken by another user
    if (email) {
      const existingProfile = await Profile.findOne({ 
        email, 
        user: { $ne: req.user.id } 
      });
      if (existingProfile) {
        return res.status(400).json({ message: 'Email already taken' });
      }
    }

    const profileData = {
      user: req.user.id,
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
    };

    let profile = await Profile.findOne({ user: req.user.id });

    if (profile) {
      // Update existing profile
      profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileData },
        { new: true, runValidators: true }
      ).populate('user', 'name email');
    } else {
      // Create new profile
      profile = new Profile(profileData);
      await profile.save();
      await profile.populate('user', 'name email');
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
      message: profile.isNew ? 'Profile created successfully' : 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error in createOrUpdateProfile:', error);
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
      .populate('user', 'name email');

    if (!profile) {
      return res.status(404).json({ 
        success: false,
        message: 'Profile not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: profile
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
    // Check if identifier is a valid ObjectId
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      query.user = identifier;
    } else {
      query.username = identifier;
    }

    const profile = await Profile.findOne(query)
      .populate('user', 'name email')
      .select('-notificationSettings -privacySettings');

    if (!profile) {
      return res.status(404).json({ 
        success: false,
        message: 'Profile not found' 
      });
    }

    // If profile is private and not the owner, return limited data
    if (profile.isPrivate && profile.user._id.toString() !== req.user?.id) {
      const limitedProfile = {
        _id: profile._id,
        username: profile.username,
        fullName: profile.fullName,
        avatar: profile.avatar,
        bio: profile.bio,
        followersCount: profile.followersCount,
        followingCount: profile.followingCount,
        postsCount: profile.postsCount,
        isVerified: profile.isVerified,
        isPrivate: profile.isPrivate
      };

      return res.status(200).json({
        success: true,
        data: limitedProfile
      });
    }

    res.status(200).json({
      success: true,
      data: profile
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
    const uploadSingle = upload.single('avatar');

    uploadSingle(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ 
          success: false,
          message: err.message 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          message: 'No file uploaded' 
        });
      }

      const avatarUrl = `/uploads/profiles/${req.file.filename}`;

      const profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { avatar: avatarUrl },
        { new: true, runValidators: true }
      ).populate('user', 'name email');

      // TODO: Fix socket.io integration
      // req.io.emit('avatarUpdated', {
      //   profileId: profile._id,
      //   userId: req.user.id,
      //   avatarUrl: avatarUrl
      // });

      res.status(200).json({
        success: true,
        data: profile,
        message: 'Avatar uploaded successfully'
      });
    });

  } catch (error) {
    console.error('Error in uploadAvatar:', error);
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
    const uploadSingle = upload.single('coverImage');

    uploadSingle(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ 
          success: false,
          message: err.message 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          message: 'No file uploaded' 
        });
      }

      const coverImageUrl = `/uploads/profiles/${req.file.filename}`;

      const profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { coverImage: coverImageUrl },
        { new: true, runValidators: true }
      ).populate('user', 'name email');

      // TODO: Fix socket.io integration
      // req.io.emit('coverImageUpdated', {
      //   profileId: profile._id,
      //   userId: req.user.id,
      //   coverImageUrl: coverImageUrl
      // });

      res.status(200).json({
        success: true,
        data: profile,
        message: 'Cover image uploaded successfully'
      });
    });

  } catch (error) {
    console.error('Error in uploadCoverImage:', error);
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
    const searchRegex = new RegExp(q, 'i');

    const profiles = await Profile.find({
      $or: [
        { username: searchRegex },
        { fullName: searchRegex },
        { bio: searchRegex }
      ],
      isActive: true
    })
    .populate('user', 'name email')
    .select('-notificationSettings -privacySettings')
    .sort({ followersCount: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    const total = await Profile.countDocuments({
      $or: [
        { username: searchRegex },
        { fullName: searchRegex },
        { bio: searchRegex }
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

module.exports = {
  createOrUpdateProfile,
  getMyProfile,
  getProfileByIdentifier,
  uploadAvatar,
  uploadCoverImage,
  searchProfiles,
  deleteProfile,
  toggleVisibility
};
