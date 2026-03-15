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

      // Find user by decoded.id. If User model doesn't exist yet, we can mock it
      // req.user = await User.findById(decoded.id).select("-passwordHash");
      
      // Mock for now so the module can work independently of full User module
      req.user = { _id: decoded.id };

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
