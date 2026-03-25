const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const email = process.argv[2];
const newPassword = process.argv[3] || '123456';

if (!email) {
  console.log('❌ Please provide an email address');
  console.log('Usage: node fix-password.js <email> <newPassword>');
  process.exit(1);
}

const mongoURI = process.env.MONGO_URI || 'mongodb+srv://nexbyte:nexbyte@nexbyte.wplnzim.mongodb.net/unexa_new';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found with email:', email);
      process.exit(1);
    }
    
    // Set the passwordHash directly. 
    // IMPORTANT: Because our fixed pre-save hook check if isModified('passwordHash'),
    // setting it now will trigger a clean, single hash.
    user.passwordHash = newPassword;
    await user.save();
    
    console.log(`🚀 Password for ${email} has been reset to: ${newPassword}`);
    console.log('Try logging in now!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
