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
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();

    console.log(`🔐 [SECURITY] Sending Verification Link to ${cleanEmail}`);
    
    // Send Real Email with Verification Link
    try {
      const verifyUrl = `https://unexa-fyp.onrender.com/api/auth/verify-email/${verificationToken}`;

      await sendEmail({
        email: cleanEmail,
        subject: 'UNEXA Account Verification',
        message: `Click this link to verify your UNEXA account: ${verifyUrl}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7B61FF;">Welcome to UNEXA</h2>
            <p>You're almost there! We just need to verify your email address. Click the button below to complete your registration:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background-color: #7B61FF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">Verify Email Address</a>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 14px; word-break: break-all;">${verifyUrl}</p>
          </div>
        `
      });
    } catch (e) { console.error('Email error:', e); }

    res.status(201).json({
      message: 'Verification link sent to your email. Please verify to login.',
      email: cleanEmail
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

  if (!user.isVerified) {
    return res.status(401).json({ error: 'Please verify your email first. Check your inbox for the link.' });
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

// @desc    Verify Email Link
// @route   GET /api/auth/verify-email/:token
exports.verifyEmail = async (req, res) => {
  try {
     const token = req.params.token;
     const user = await User.findOne({ verificationToken: token });

     if (!user) {
        return res.status(401).send(`
          <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h1 style="color: #FF4444;">Verification Failed</h1>
            <p>This verification link is invalid or has already been used.</p>
          </div>
        `);
     }

     user.isVerified = true;
     user.verificationToken = undefined;
     await user.save();

     // Create default profile for the verified user
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
     } catch (err) { console.error('Profile creation error during verification', err); }

     res.send(`
       <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
         <h1 style="color: #7B61FF;">UNEXA</h1>
         <h2>Email Verified Successfully! 🎉</h2>
         <p style="color: #666; min-height: 40px;">You can now close this window and return to the app to login.</p>
       </div>
     `);
  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
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
