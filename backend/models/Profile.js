const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const profileSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      unique: true
    },
    username: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true,
      get: decrypt,
      set: encrypt
    },
    fullName: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 200, 
      get: decrypt,
      set: encrypt
    },
    bio: { 
      type: String, 
      trim: true,
      get: decrypt,
      set: encrypt,
      default: ''
    },
    avatar: { 
      type: String,
      get: decrypt,
      set: encrypt,
      default: ''
    },
    coverImage: {
      type: String,
      get: decrypt,
      set: encrypt,
      default: ''
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      get: decrypt,
      set: encrypt
    },
    phone: {
      type: String,
      trim: true,
      get: decrypt,
      set: encrypt
    },
    dateOfBirth: {
      type: Date
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say'
    },
    location: {
      country: { type: String, trim: true, get: decrypt, set: encrypt },
      state: { type: String, trim: true, get: decrypt, set: encrypt },
      city: { type: String, trim: true, get: decrypt, set: encrypt }
    },
    website: {
      type: String,
      trim: true,
      get: decrypt,
      set: encrypt
    },
    socialLinks: {
      instagram: { type: String, trim: true },
      twitter: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      facebook: { type: String, trim: true },
      youtube: { type: String, trim: true }
    },
    interests: [{
      type: String,
      trim: true
    }],
    skills: [{
      type: String,
      trim: true
    }],
    isVerified: {
      type: Boolean,
      default: false
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    followersCount: {
      type: Number,
      default: 0
    },
    followingCount: {
      type: Number,
      default: 0
    },
    postsCount: {
      type: Number,
      default: 0
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    notificationSettings: {
      pushNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      messageNotifications: { type: Boolean, default: true },
      followNotifications: { type: Boolean, default: true },
      mentionNotifications: { type: Boolean, default: true }
    },
    privacySettings: {
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false },
      showDateOfBirth: { type: Boolean, default: false },
      showLocation: { type: Boolean, default: true },
      allowFollowRequests: { type: Boolean, default: true }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true }
  }
);

// Virtual for age
profileSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Indexes for efficient queries
profileSchema.index({ user: 1 });
profileSchema.index({ username: 1 });
profileSchema.index({ email: 1 });
profileSchema.index({ followersCount: -1 });
profileSchema.index({ createdAt: -1 });

// Middleware to update lastSeen
profileSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastSeen = new Date();
  }
  next();
});

module.exports = mongoose.model('Profile', profileSchema);
