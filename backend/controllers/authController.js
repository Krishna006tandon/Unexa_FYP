const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_super_secret_jwt_key', {
    expiresIn: '30d',
  });
};

exports.registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Please Enter all the Fields' });
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const user = await User.create({
    username,
    email,
    passwordHash: password, // For demo, using plain. In prod hash it.
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
  const user = await User.findOne({ email });

  if (user && user.passwordHash === password) {
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
