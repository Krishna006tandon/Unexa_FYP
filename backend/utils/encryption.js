const crypto = require('crypto');

const algorithm = 'aes-256-cbc';

// Support both HEX (from secure generators) and UTF8 (fallback)
const encryptionKeyRaw = process.env.ENCRYPTION_KEY || 'abcdefghijklmnopqrstuvwxyz0123456789abcdef';
const key = encryptionKeyRaw.length === 64 
  ? Buffer.from(encryptionKeyRaw, 'hex') 
  : Buffer.from(encryptionKeyRaw, 'utf8').slice(0, 32);

const encryptionIvRaw = process.env.ENCRYPTION_IV || '0123456789abcdef';
const iv = encryptionIvRaw.length === 32 
  ? Buffer.from(encryptionIvRaw, 'hex') 
  : Buffer.from(encryptionIvRaw, 'utf8').slice(0, 16);

// Encrypt string
const encrypt = (text) => {
  if (!text) return text;
  try {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `enc:${encrypted}`; // Prefix to identify encrypted strings
  } catch (err) {
    console.error('Encryption Error:', err);
    return text;
  }
};

// Decrypt string
const decrypt = (text) => {
  if (!text || !text.startsWith('enc:')) return text;
  try {
    const encryptedText = text.replace('enc:', '');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption Error:', err);
    return text;
  }
};

module.exports = { encrypt, decrypt };
