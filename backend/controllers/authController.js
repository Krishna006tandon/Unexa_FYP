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
  console.log(`🔐 [AUTH-LOGIN] Login attempt for: ${cleanEmail}`);
  
  const user = await User.findOne({ email: cleanEmail });
  
  if (!user) {
    console.log(`❌ [AUTH-LOGIN] User not found for: ${cleanEmail}`);
    return res.status(401).json({ error: 'Invalid Email or Password' });
  }

  const isPasswordMatch = await user.matchPassword(password);
  console.log(`🔑 [AUTH-LOGIN] Password match result for ${cleanEmail}: ${isPasswordMatch}`);

  if (isPasswordMatch) {
    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry
    await user.save();

    console.log(`🔐 [2FA-SECURITY] Sending OTP ${otp} to ${email}`);
    // Audit Log for login attempt
    await logAudit(req, 'Login Attempt', { email: cleanEmail }, 'success');

    // Send Real Email with OTP
    try {
      await sendEmail({
        email: cleanEmail,
        subject: 'UNEXA Security Code',
        message: `Your UNEXA login verification code is: ${otp}. This code is valid for 10 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #7B61FF;">UNEXA SuperApp Security</h2>
            <p>Your one-time verification code (OTP) for login is:</p>
            <h1 style="background: #F4F4F4; padding: 15px; border-radius: 10px; text-align: center; letter-spacing: 12px; font-size: 32px; border: 1px dashed #7B61FF;">${otp}</h1>
            <p>This code is valid for <b>10 minutes</b>. If you didn't request this, please ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #EEE;" />
            <p style="font-size: 12px; color: #999;">Nexbyte Security Systems & UNEXA FYP Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('❌ [2FA-EMAIL-ERROR] Failed to send OTP email:', emailError.message);
      // Still log but response continues (OTP will still be in console for dev)
    }

    res.json({
      message: 'OTP sent to your email. Please verify to login.',
      email: email, // to be used in next step
      requiresOTP: true
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

     // Clear OTP after successful verify
     user.otp = undefined;
     user.otpExpires = undefined;
     await user.save();

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
exports.allUsers = async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { username: req.query.search },
          { email: req.query.search.toLowerCase().trim() },
        ],
      }
    : {};

  const users = await User.find(keyword)
    .find({ _id: { $ne: req.user._id } })
    .select('username profilePhoto');
  res.send(users);
};
