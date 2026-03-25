# Expo Environment Variables Setup Guide

## 🎯 **Haan, Expo app mein bhi environment variables add karne padenge!**

## 📱 **Expo mein Environment Variables 3 Tarike se add kar sakte hain:**

### **Method 1: EAS Build (Production ke liye Best)**
```bash
# Terminal mein run karo
eas build:configure
```

Phir environment variables add karo:
```bash
eas secret:create --name API_URL --value "https://unexa-fyp.onrender.com"
eas secret:create --name CLOUDINARY_CLOUD_NAME --value "your_cloud_name"
eas secret:create --name CLOUDINARY_API_KEY --value "your_api_key"
eas secret:create --name CLOUDINARY_API_SECRET --value "your_api_secret"
```

### **Method 2: .env.local File (Development ke liye)**
Frontend mein `.env.local` file banayo:
```env
API_URL=https://unexa-fyp.onrender.com
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### **Method 3: Manual (Quick Testing ke liye)**
`app.config.js` mein directly values add karo:
```javascript
extra: {
  apiUrl: 'https://unexa-fyp.onrender.com',
  cloudinaryCloudName: 'your_cloud_name',
  cloudinaryApiKey: 'your_api_key',
}
```

## 🔧 **Setup Steps:**

### **Step 1: Install Required Package**
```bash
npm install dotenv
# ya
expo install dotenv
```

### **Step 2: Update app.config.js (Already Done ✅)**
```javascript
extra: {
  apiUrl: process.env.API_URL || 'https://unexa-fyp.onrender.com',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
}
```

### **Step 3: Use Environment in Code (Already Done ✅)**
```javascript
import ENVIRONMENT from '../config/environment';

const API_URL = ENVIRONMENT.API_URL;
const CLOUDINARY_CLOUD_NAME = ENVIRONMENT.CLOUDINARY_CLOUD_NAME;
```

## 🚀 **Recommended Approach:**

### **For Development:**
1. `.env.local` file banayo frontend mein
2. Values add karo
3. `expo start` karo

### **For Production:**
1. EAS secrets use karo
2. `eas build` karo
3. Deploy karo

## 📝 **Current Setup Status:**

### ✅ **Already Done:**
- ✅ `app.config.js` updated with environment variables
- ✅ `src/config/environment.js` created
- ✅ `profileService.js` updated to use environment
- ✅ Default API URL set to production URL

### ⚠️ **Need to Add:**
- ⏳ Cloudinary credentials in environment
- ⏳ `.env.local` file (for development)
- ⏳ EAS secrets (for production)

## 🔍 **Testing Environment Variables:**

App start karne par console mein check karo:
```
🔧 Environment Configuration:
   API_URL: https://unexa-fyp.onrender.com
   CLOUDINARY_CLOUD_NAME: ✅ Set (if configured)
   CLOUDINARY_API_KEY: ✅ Set (if configured)
   IS_DEV: true
```

## 📱 **Expo Go vs Development Build:**

### **Expo Go:**
- Environment variables work karte hain
- `.env.local` file se read karta hai
- Quick testing ke liye perfect

### **Development Build:**
- Better control over environment
- EAS secrets use kar sakte hain
- Production-like environment

## 🎯 **Next Steps:**

### **Immediate:**
1. **Cloudinary credentials le lo** (agar nahi hain)
2. **.env.local file banayo** frontend mein
3. **Values add karo**
4. **Expo restart karo**

### **For Production:**
1. **EAS CLI install karo**
2. **Secrets create karo**
3. **Build karo**
4. **Deploy karo**

## 🔐 **Security Notes:**

- **Never commit** `.env` files to Git
- **Use EAS secrets** for production
- **API keys secure rakhna**
- **Environment variables encrypt** ho jaate hain production mein

## 📞 **Troubleshooting:**

### **Environment Variables Not Working:**
1. **Check `.env.local` file name** (exact hona chahiye)
2. **Restart Expo** (`expo start --clear`)
3. **Check app.config.js** imports
4. **Console logs check karo**

### **Cloudinary Issues:**
1. **Credentials validate karo**
2. **Network connectivity check karo**
3. **CORS settings check karo** Cloudinary mein

---

**Status**: 🟢 **Environment setup ready**  
**Next**: Cloudinary credentials add karne hain
