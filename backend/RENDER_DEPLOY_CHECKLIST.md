# 🚀 Render Deployment Testing Guide

## 📱 **Deployed App Testing:**

### **🌐 App Access:**
- **URL**: https://unexa-fyp.onrender.com
- **Status**: ✅ Already deployed
- **API Test**: https://unexa-fyp.onrender.com/api/test

### 🔍 **Where to Check Logs:**

#### **Render Dashboard Logs:**
1. **Render.com** pe login karo
2. **Services** mein **"unexa-backend"** click karo
3. **Logs** tab mein real-time logs dikhenge
4. **Filter kar sakte ho**:
   - Error logs
   - Upload logs  
   - Auth logs

#### **Expected Backend Logs in Render:**
```
🔐 Auth Middleware - Request headers: { authorization: ✅ Present }
🔑 Token extracted: ✅
🔓 Token decoded successfully, user ID: [user-id]
✅ User authenticated: [user-id]

📤 Upload request received
📁 File details: { originalname: "photo.jpg", mimetype: "image/jpeg" }
✅ Cloudinary URL: https://res.cloudinary.com/...
```

### 📱 **Frontend Testing:**

#### **Expo Go App:**
1. **Expo project** open karo
2. **Environment variables** check karo:
   ```javascript
   // Console mein check karo
   console.log('API_URL:', ENVIRONMENT.API_URL);
   console.log('Cloudinary:', ENVIRONMENT.CLOUDINARY_CLOUD_NAME);
   ```
3. **Camera test karo**
4. **Console logs check karo** (DevTools mein)

#### **Network Tab Check:**
1. **Chrome DevTools** → Network tab
2. **Filter karo**: "upload"
3. **Request check karo**:
   - URL: https://unexa-fyp.onrender.com/api/upload
   - Method: POST
   - Status: 200/400/500
   - Response: { success: true/false }

### 🧪 **Testing Steps:**

#### **Step 1: API Health Check**
```bash
# Browser mein test karo
https://unexa-fyp.onrender.com/api/test
```

#### **Step 2: Upload Test**
1. **App open karo**
2. **Login karo**
3. **Chat mein jao**
4. **Camera se photo karo**
5. **Send button press karo**

#### **Step 3: Log Analysis**
**Render Dashboard mein check karo:**
- Auth logs
- Upload request logs
- Cloudinary response logs
- Error messages

### 🎯 **Success Indicators:**

#### **Backend (Render Logs):**
```
✅ Server started successfully
✅ MongoDB Connected Successfully
✅ Cloudinary API connection successful
🔐 Auth Middleware: User authenticated
📤 Upload request received
✅ Cloudinary URL generated
```

#### **Frontend (App Console):**
```
🔧 Environment Configuration:
   API_URL: https://unexa-fyp.onrender.com
   CLOUDINARY_CLOUD_NAME: ✅ Set

📤 Starting upload...
✅ Upload successful: { success: true, mediaUrl: "..." }
```

### 🚨 **Error Troubleshooting:**

#### **Common Errors & Solutions:**

**Error 1: 401 Unauthorized**
```
Render Logs: ❌ No token provided
Frontend: Network tab shows 401 status
```
**Solution**: User re-login karo

**Error 2: 400 Bad Request**
```
Render Logs: ❌ No file provided
Frontend: File selection issue
```
**Solution**: File selection check karo

**Error 3: 500 Server Error**
```
Render Logs: ❌ Upload error: Cloudinary API error
```
**Solution**: Cloudinary credentials check karo

**Error 4: Network Error**
```
Frontend: ❌ Upload error: Network Error
```
**Solution**: Internet connection check karo

### 📊 **Real-time Monitoring:**

#### **Render Dashboard:**
1. **Services** → **unexa-backend**
2. **Metrics** tab:
   - Response time
   - Error rate
   - Request count

3. **Events** tab:
   - Deployments
   - Build logs
   - Service restarts

### 📋 **Testing Checklist:**

#### **Before Testing:**
- [ ] Render service running
- [ ] Environment variables set
- [ ] Frontend environment configured
- [ ] App built successfully

#### **During Testing:**
- [ ] API health check passes
- [ ] User can login
- [ ] Camera opens
- [ ] File selection works
- [ ] Upload request sent
- [ ] Response received

#### **After Testing:**
- [ ] Backend logs show success
- [ ] Frontend shows success
- [ ] Photo displays in chat
- [ ] No error messages

### 🆘 **Quick Debug Commands:**

#### **Test API Directly:**
```bash
# Health check
curl https://unexa-fyp.onrender.com/api/test

# Upload test (with real token)
curl -X POST https://unexa-fyp.onrender.com/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "media=@test.jpg"
```

#### **Check Environment:**
```javascript
// Frontend console mein
console.log('ENVIRONMENT:', ENVIRONMENT);
```

---

## 🎯 **Ready for Deployed Testing!**

### ✅ **What's Ready:**
- Backend deployed on Render
- Debug logging active
- All endpoints accessible
- Error handling enhanced

### 🚀 **Test Now:**
1. **Open app**: https://unexa-fyp.onrender.com/api/test
2. **Check Render logs**: Dashboard → Logs
3. **Test upload**: Camera se photo
4. **Analyze results**: Console + Render logs

**Deployed app mein test karo aur logs check karo! 📱**
