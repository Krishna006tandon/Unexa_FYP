const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Add a dummy User model later if needed for full app

const protect = async (req, res, next) => {
  let token;

  console.log('🔐 Auth Middleware - Request headers:', {
    authorization: req.headers.authorization ? '✅ Present' : '❌ Missing',
    'content-type': req.headers['content-type']
  });

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      console.log('🔑 Token extracted:', token ? '✅' : '❌');

      //decodes token id
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key');
      console.log('🔓 Token decoded successfully, user ID:', decoded.id);

      // Find user by decoded.id. 
      req.user = await User.findById(decoded.id).select("-passwordHash");
      
      if (!req.user) {
        console.log('❌ User not found for ID:', decoded.id);
        return res.status(401).json({ error: "Not authorized, user missing" });
      }

      console.log('✅ User authenticated:', req.user._id);
      next();
    } catch (error) {
      console.error('❌ Auth error:', error.message);
      return res.status(401).json({ error: "Not authorized, token failed" });
    }
  }

  if (!token) {
    console.log('❌ No token provided');
    res.status(401).json({ error: "Not authorized, no token" });
  }
};

const optionalProtect = async (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) return next();
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key');
    req.user = await User.findById(decoded.id).select('-passwordHash');
  } catch (_) {
    // ignore invalid token for optional auth
  }
  next();
};

module.exports = { protect, optionalProtect };
