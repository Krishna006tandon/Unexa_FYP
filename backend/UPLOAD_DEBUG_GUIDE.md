# 🚨 Upload Debugging Guide - Step by Step

## 📱 **Current Status:**
- ✅ Server running on port 5000
- ✅ MongoDB connected
- ✅ File filter working (image/jpeg detected)
- ✅ Friends found: 1
- ❌ Upload still not working in chat

## 🔍 **Debug Steps:**

### **Step 1: Check Backend Logs**
Restart server and look for these messages:

```
🔐 Auth Middleware - Request headers: {
  authorization: ✅ Present / ❌ Missing,
  'content-type': multipart/form-data
}
🔑 Token extracted: ✅ / ❌
🔓 Token decoded successfully, user ID: 69b51f48871c4bb6ab73a0b4
✅ User authenticated: 69b51f48871c4bb6ab73a0b4

📤 Upload request received
📁 File details: { originalname, mimetype, size, path }
✅ Cloudinary URL: https://...
```

### **Step 2: Check Frontend Console**
When you try to upload, look for:

```
📤 Starting upload...
📁 File info: { uri, mimeType, filename }
🔑 Token: ✅ Present / ❌ Missing
📡 Sending request to: https://unexa-fyp.onrender.com/api/upload
✅ Upload successful: { success: true, mediaUrl: "..." }
```

### **Step 3: Common Issues & Solutions**

#### **Issue 1: Authentication Failed**
**Backend Logs:**
```
❌ No token provided
❌ Auth error: jwt malformed
❌ User not found for ID: ...
```

**Solution:**
- Check if user is logged in
- Verify token is valid
- Check AsyncStorage for token

#### **Issue 2: File Too Large**
**Backend Logs:**
```
❌ Multer error: File too large
```

**Solution:**
- Current limit: 50MB for chat
- Try with smaller image (<1MB)
- Check file size before upload

#### **Issue 3: File Type Rejected**
**Backend Logs:**
```
❌ File type rejected: application/octet-stream
```

**Solution:**
- Ensure file is image/jpeg, image/png
- Check file.mimetype in frontend
- Try with different image format

#### **Issue 4: Cloudinary Upload Failed**
**Backend Logs:**
```
❌ Upload error: Cloudinary API error
```

**Solution:**
- Check Cloudinary credentials
- Verify internet connection
- Check Cloudinary dashboard

## 🛠️ **Quick Test:**

### **Test 1: Simple Image Upload**
1. Take a small photo (<500KB)
2. Try to upload in chat
3. Check both console logs

### **Test 2: Check Token**
In app console:
```javascript
// Check if user has token
const userInfo = await AsyncStorage.getItem('userInfo');
const user = userInfo ? JSON.parse(userInfo) : null;
console.log('Token:', user?.token ? '✅' : '❌');
```

### **Test 3: Direct API Test**
```bash
# Test upload endpoint directly
curl -X POST https://unexa-fyp.onrender.com/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "media=@test.jpg"
```

## 📋 **What to Report:**

When you test again, please share:

### **Backend Console Logs:**
- Auth middleware messages
- Upload request received
- Any error messages

### **Frontend Console Logs:**
- Starting upload message
- File info
- Token status
- Any error messages

### **Network Tab:**
- Request URL
- Request headers
- Response status
- Response body

## 🎯 **Expected Working Flow:**

1. **User selects photo** → Frontend console: "📤 Starting upload..."
2. **Request sent** → Backend console: "🔐 Auth Middleware..."
3. **Auth success** → Backend console: "✅ User authenticated"
4. **File received** → Backend console: "📤 Upload request received"
5. **Cloudinary upload** → Backend console: "✅ Cloudinary URL: ..."
6. **Success response** → Frontend console: "✅ Upload successful"
7. **Message sent** → Chat shows photo

---

**Now restart server and test upload. Share the console logs! 📱**
