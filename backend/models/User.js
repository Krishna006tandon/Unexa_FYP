const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../utils/encryption');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true, // Added unique constraint as per instruction note
      get: decrypt,
      set: encrypt
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      get: decrypt,
      set: encrypt
    },
    passwordHash: { type: String, required: true },
    profilePhoto: {
      type: String,
      default: "https://i.pravatar.cc/150",
      get: decrypt,
      set: encrypt
    },
    bio: { type: String, default: "" },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    closeFriends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pushToken: { type: String },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    otpExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String }
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
