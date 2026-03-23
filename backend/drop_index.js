const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../backend/.env' });

async function dropIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    await mongoose.connection.collection('stories').dropIndex('expiresAt_1');
    console.log('Index dropped');
  } catch(e) {
    console.log('No index found or err:', e.message);
  } finally {
    process.exit(0);
  }
}
dropIndex();
