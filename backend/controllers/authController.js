const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { encrypt, decrypt } = require('../utils/encryption');
const { logAudit } = require('../middlewares/auditMiddleware');
const sendEmail = require('../utils/email');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_super_secret_jwt_key', {
    expiresIn: '30d',
  });
};

exports.registerUser = async (req, res) => {
    const { username, email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    console.log(`📝 [AUTH-REG] Registration attempt for: ${cleanEmail}`);

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please Enter all the Fields' });
    }

    const userExists = await User.findOne({ email: cleanEmail });
    const usernameExists = await User.findOne({ username });

    if (userExists || usernameExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await User.create({
      username,
      email: cleanEmail,
      passwordHash: password, // This will be hashed automatically by the pre-save hook
    });

  if (user) {
    // Generate 6 digit OTP for new user
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log(`🔐 [2FA-SECURITY] Sending Verification OTP ${otp} to ${cleanEmail}`);
    
    // Send Real Email with OTP
    try {
      await sendEmail({
        email: cleanEmail,
        subject: 'UNEXA Account Verification',
        message: `Your UNEXA account verification code is: ${otp}.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; text-align: center;">
            <h2 style="color: #7B61FF;">Welcome to UNEXA</h2>
            <p>Please verify your email address. Your One-Time Password is:</p>
            <h1 style="background: #F4F4F4; padding: 15px; border-radius: 10px; letter-spacing: 12px; font-size: 32px; border: 1px dashed #7B61FF; display: inline-block;">${otp}</h1>
            <p>Valid for <b>10 minutes</b>.</p>
          </div>
        `
      });
    } catch (e) {
      console.error('Email error:', e.message);
      // Wait, if it fails to send, we should still delete it. The user explicitly liked this!
      await User.findByIdAndDelete(user._id);
      return res.status(400).json({ error: 'Failed to send OTP. Please provide a valid email.' });
    }

    res.status(201).json({
      message: 'OTP sent to your email. Please verify to complete registration.',
      email: cleanEmail,
      requiresOTP: true
    });
  } else {
    res.status(400).json({ error: 'Failed to create the user' });
  }
};

exports.authUser = async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();
  console.log(`🔐 [AUTH-LOGIN] Login attempt for: ${cleanEmail}`);
  
  const user = await User.findOne({ email: cleanEmail });
  
  if (!user) {
    console.log(`❌ [AUTH-LOGIN] User not found for: ${cleanEmail}`);
    return res.status(401).json({ error: 'Invalid Email or Password' });
  }

  const isPasswordMatch = await user.matchPassword(password);
  console.log(`🔑 [AUTH-LOGIN] Password match result for ${cleanEmail}: ${isPasswordMatch}`);

  if (isPasswordMatch) {
    console.log(`✅ [AUTH-LOGIN] Successful login for: ${cleanEmail}`);
    await logAudit(req, 'Login Success', { userId: user._id }, 'success');
    
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


// @desc    Verify OTP and return token
// @route   POST /api/auth/verify-otp
exports.verifyOTP = async (req, res) => {
  try {
     const { email, otp } = req.body;
     const cleanEmail = email.toLowerCase().trim();
     console.log(`📲 [AUTH-OTP] OTP Verification attempt for: ${cleanEmail}`);
     const user = await User.findOne({ email: cleanEmail });

     if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
        await logAudit(req, 'OTP Verification Failed', { email: cleanEmail }, 'failure');
        return res.status(401).json({ error: 'Invalid or Expired OTP' });
     }

     // Audit Log for success
     await logAudit(req, 'OTP Verification Success', { userId: user._id }, 'success');

     // Clear OTP
     user.otp = undefined;
     user.otpExpires = undefined;
     await user.save();

     // Auto-create profile
     try {
       const Profile = require('../models/Profile');
       const existingFormat = await Profile.findOne({ user: user._id });
       if (!existingFormat) {
          await Profile.create({
            user: user._id,
            username: user.username,
            fullName: user.username,
            email: user.email,
            bio: 'Welcome to UNEXA! 🎉'
          });
       }
     } catch (err) { console.error('Profile creation error during OTP', err); }

     res.json({
       _id: user._id,
       username: user.username,
       email: user.email,
       profilePhoto: user.profilePhoto,
       token: generateToken(user._id),
     });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
// Search users (In-memory filter mapping to bypass DB encryption blocks)
exports.allUsers = async (req, res) => {
  try {
    // Need to fetch all to decrypt them using Mongoose getters first
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('username email profilePhoto');

    if (req.query.search) {
      const searchKey = req.query.search.toLowerCase().trim();
      const filteredUsers = users.filter(u => {
        const uName = u.username ? u.username.toLowerCase() : '';
        const uEmail = u.email ? u.email.toLowerCase() : '';
        return uName.includes(searchKey) || uEmail.includes(searchKey);
      });
      return res.send(filteredUsers);
    }

    res.send(users);
  } catch (error) {
    console.error("Search Users Error:", error.message);
    res.status(500).json({ error: 'Server error during user search' });
  }
};

// Update Push Token
exports.updatePushToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token not provided" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.pushToken = token;
    await user.save();

    console.log(`📲 [PUSH] Updated token for user: ${user.username}`);
    res.json({ success: true, message: "Push token updated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
