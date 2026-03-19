const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Add a dummy User model later if needed for full app

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      //decodes token id
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key');

      // Find user by decoded.id. 
      req.user = await User.findById(decoded.id).select("-passwordHash");
      
      if (!req.user) {
        return res.status(401).json({ error: "Not authorized, user missing" });
      }

      next();
    } catch (error) {
      res.status(401).json({ error: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ error: "Not authorized, no token" });
  }
};

module.exports = { protect };
