# 🎯 Final Environment Variables for Complete Setup

## 📱 **For Expo Frontend (.env.local)**

```env
# API Configuration
EXPO_PUBLIC_API_URL=https://unexa-fyp.onrender.com

# Cloudinary Configuration
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
EXPO_PUBLIC_CLOUDINARY_API_KEY=your_cloudinary_api_key
EXPO_PUBLIC_CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# App Configuration
EXPO_PUBLIC_APP_NAME=UNEXA SuperApp
EXPO_PUBLIC_APP_VERSION=1.0.0
```

## 🔧 **For Backend (.env)**

```env
# MongoDB Configuration
MONGO_URI=mongodb+srv://nexbyte:nexbyte@nexbyte.wplnzim.mongodb.net/unexa_new

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Server Configuration
PORT=5000
NODE_ENV=production
```

## 🌐 **For Render Dashboard (Backend)**

| Variable | Value | Sync |
|-----------|--------|------|
| `NODE_ENV` | `production` | No |
| `MONGO_URI` | Your MongoDB connection | No |
| `JWT_SECRET` | Your JWT secret | No |
| `CLOUDINARY_CLOUD_NAME` | Your cloud name | No |
| `CLOUDINARY_API_KEY` | Your API key | No |
| `CLOUDINARY_API_SECRET` | Your API secret | No |
| `PORT` | `5000` | No |

## 🌐 **For Render Dashboard (Frontend)**

| Variable | Value | Sync |
|-----------|--------|------|
| `EXPO_PUBLIC_API_URL` | `https://unexa-fyp.onrender.com` | No |
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` | Your cloud name | No |
| `EXPO_PUBLIC_CLOUDINARY_API_KEY` | Your API key | No |

## 🚀 **Quick Setup Steps**

### **Step 1: Get Cloudinary Credentials**
1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up/Login
3. Go to Dashboard → Settings → API Keys
4. Copy:
   - Cloud name
   - API Key
   - API Secret

### **Step 2: Setup Backend**
```bash
# In backend folder
cp .env.example .env
# Edit .env with your Cloudinary credentials
```

### **Step 3: Setup Frontend**
```bash
# In frontend folder
cp .env.example .env.local
# Edit .env.local with your Cloudinary credentials
```

### **Step 4: Update Render Dashboard**
1. Go to Render dashboard
2. Select backend service
3. Add Cloudinary environment variables
4. Select frontend service (when deployed)
5. Add frontend environment variables

### **Step 5: Restart Services**
```bash
# Restart backend
# Restart frontend development server
expo start --clear
```

## 🎯 **Final Environment Variables Template**

### **Copy-Paste Ready Values:**

#### **For Expo .env.local:**
```env
EXPO_PUBLIC_API_URL=https://unexa-fyp.onrender.com
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
EXPO_PUBLIC_CLOUDINARY_API_KEY=your_cloudinary_api_key
EXPO_PUBLIC_CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

#### **For Backend .env:**
```env
MONGO_URI=mongodb+srv://nexbyte:nexbyte@nexbyte.wplnzim.mongodb.net/unexa_new
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
PORT=5000
NODE_ENV=production
```

## 📋 **What Each Variable Does:**

### **Frontend Variables:**
- `EXPO_PUBLIC_API_URL`: Backend server URL
- `EXPO_PUBLIC_CLOUDINARY_*`: Cloudinary credentials for direct uploads
- `EXPO_PUBLIC_APP_*`: App metadata

### **Backend Variables:**
- `MONGO_URI`: Database connection string
- `JWT_SECRET`: Token signing secret
- `CLOUDINARY_*`: Cloudinary server-side configuration
- `PORT`: Server port
- `NODE_ENV`: Environment mode

## 🔐 **Security Notes:**

- **Never commit** `.env` files to Git
- **Use different secrets** for development and production
- **Rotate keys** periodically
- **Use Render's sync: false** for sensitive data

## ✅ **Verification Checklist:**

After setup, verify:
- [ ] Backend starts without errors
- [ ] Frontend connects to backend
- [ ] Cloudinary uploads work
- [ ] Photos display correctly
- [ ] Media sharing works
- [ ] Chat functionality works

---

**Status**: 🟢 **All environment variables ready**  
**Next**: Add your Cloudinary credentials and test!
