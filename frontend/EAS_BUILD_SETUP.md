# 📱 EAS Build Credentials Setup

## 🔐 **Current Credentials Status:**

### **Application Identifier:**
- **Bundle ID**: `com.unexa.superapp`
- **Status**: ✅ Properly configured

### **Android Build Credentials:**
- **Credentials ID**: `ncLcjJIwpS`
- **Type**: JKS (Java KeyStore)
- **Status**: ✅ Already uploaded
- **Upload Date**: Mar 21, 2026 1:12 AM

### **Fingerprints:**
- **MD5**: `9B:6F...C6:B3`
- **SHA-1**: `B7:31...ED:75`
- **SHA-256**: `8F:2F...0F:75`

## 🚀 **Build Process:**

### **Option 1: Use Existing Credentials**
```bash
# Build with existing credentials
eas build --platform android --profile production
```

### **Option 2: Create New Credentials**
```bash
# Create new credentials
eas credentials:manager

# Then build
eas build --platform android
```

### **Option 3: Development Build**
```bash
# Quick development build
eas build --platform android --profile development
```

## 📋 **Build Profiles Setup:**

### **eas.json Configuration:**
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "channel": "development",
      "distribution": "internal"
    },
    "preview": {
      "channel": "preview",
      "distribution": "internal"
    },
    "production": {
      "channel": "production",
      "distribution": "store"
    }
  },
  "submit": {
    "production": {}
  }
}
```

## 🛠️ **Build Commands:**

### **Development Build (Fast):**
```bash
# For testing
eas build --platform android --profile development
```

### **Preview Build (Shareable):**
```bash
# For sharing with others
eas build --platform android --profile preview
```

### **Production Build (Play Store):**
```bash
# For Google Play Store
eas build --platform android --profile production
```

## 📱 **After Build:**

### **Install APK:**
```bash
# Install on device
adb install build-apk-file.apk

# Or scan QR code from EAS dashboard
```

### **Testing Deployed App:**
1. **Install APK** on device
2. **Test camera upload**
3. **Check logs** in EAS dashboard
4. **Monitor Render logs** for backend

## 🔍 **Debug Deployed APK:**

### **Console Logs:**
```javascript
// In deployed APK, logs will appear in:
// - EAS Dashboard → Build → Logs
// - Expo DevTools (if development build)
// - ADB logs (if connected via USB)
```

### **ADB Debug:**
```bash
# Connect device and check logs
adb logcat | grep "UNEXA" | grep "Upload"
```

## 🎯 **Recommended Build Flow:**

### **Step 1: Development Build**
```bash
# Fast build for testing
eas build --platform android --profile development
```

### **Step 2: Test Upload**
- Install APK
- Test camera upload
- Check Render logs
- Verify functionality

### **Step 3: Production Build**
```bash
# Final build for release
eas build --platform android --profile production
```

## 📊 **Build Monitoring:**

### **EAS Dashboard:**
- **Build Status**: Real-time updates
- **Build Logs**: Detailed build process
- **Download**: APK download links
- **Analytics**: Build performance

### **Render Dashboard:**
- **Backend Logs**: Upload requests
- **API Monitoring**: Request/response
- **Error Tracking**: Failed uploads

## 🚨 **Common Build Issues:**

### **Issue 1: Credentials Expired**
```
Solution: Update credentials in EAS dashboard
```

### **Issue 2: Build Timeout**
```
Solution: Check internet connection, retry build
```

### **Issue 3: APK Not Installing**
```
Solution: Enable "Unknown Sources" in device settings
```

### **Issue 4: Upload Not Working**
```
Solution: Check Render logs, verify API URL
```

## 📋 **Testing Checklist:**

### **Pre-Build:**
- [ ] App name: "UNEXA"
- [ ] Bundle ID: com.unexa.superapp
- [ ] Environment variables set
- [ ] Credentials ready

### **Post-Build:**
- [ ] APK installs successfully
- [ ] App opens correctly
- [ ] Camera permission granted
- [ ] Upload functionality works
- [ ] Backend logs show requests

---

## 🎯 **Ready to Build!**

### ✅ **Current Setup:**
- Credentials: ✅ Ready
- Bundle ID: ✅ Configured
- App Name: ✅ "UNEXA"
- Backend: ✅ Deployed

### 🚀 **Build Now:**
```bash
# Development build for testing
eas build --platform android --profile development

# Then test upload functionality!
```

**Build kar lo aur deployed APK mein test karo! 📱**
