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
    console.log(`🔐 [SECURITY] Sending Welcome Email to verify ${cleanEmail}`);
    
    // Send Real Email
    try {
      await sendEmail({
        email: cleanEmail,
        subject: 'Welcome to UNEXA SuperApp',
        message: `Welcome to UNEXA, ${username}! Your account has been successfully created.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; text-align: center;">
            <h2 style="color: #7B61FF;">Welcome to UNEXA, ${username}!</h2>
            <p>Your account has been successfully created and verified.</p>
            <p>Enjoy exploring the universe of UNEXA!</p>
          </div>
        `
      });

      // If email succeeds, mark as verified
      user.isVerified = true;
      await user.save();

      console.log(`✅ [AUTH] Registration and verification successful for ${cleanEmail}`);
      
      return res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePhoto: user.profilePhoto,
        token: generateToken(user._id),
      });

    } catch (e) { 
      console.error('❌ Email sending failed. Rejecting registration:', e.message);
      // Delete the unverified user since the email bounced/failed
      await User.findByIdAndDelete(user._id);
      return res.status(400).json({ error: 'Please provide a valid and active email address.' });
    }
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
