const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_super_secret_jwt_key', {
    expiresIn: '30d',
  });
};

exports.registerUser = async (req, res) => {
    const { username, email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please Enter all the Fields' });
    }

    const userExists = await User.findOne({ email: cleanEmail });

  if (userExists) {
    return res.status(400).json({ error: 'User already exists' });
  }

    const user = await User.create({
      username,
      email: cleanEmail,
      passwordHash: password, // This will be hashed automatically by the pre-save hook
    });

  if (user) {
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePhoto: user.profilePhoto,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ error: 'Failed to create the user' });
  }
};

exports.authUser = async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: cleanEmail });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePhoto: user.profilePhoto,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ error: 'Invalid Email or Password' });
  }
};

// Simplified Reset Password (No OTP - as requested)
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ error: "User not found with this email" });
    }

    // Update password
    user.passwordHash = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: "Server error during password reset" });
  }
};

// Search users
exports.allUsers = async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { username: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
        ],
      }
    : {};

  const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
  res.send(users);
};
