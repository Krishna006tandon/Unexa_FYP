# Render Deployment Troubleshooting

## 🚨 **Problem: Deployment Failing Silently**

Render mein error show nahi ho raha but deployment fail ho raha hai. Yahan possible reasons hain:

## 🔍 **Common Issues & Solutions**

### **1. Environment Variables Not Set in Render Dashboard**
**Problem**: `sync: false` hai but variables add nahi kiye
**Solution**: 
1. Render dashboard → Your service → Environment tab
2. Manually add these variables:
   ```
   CLOUDINARY_CLOUD_NAME=ddw7kbm3k
   CLOUDINARY_API_KEY=225359785496153
   CLOUDINARY_API_SECRET=BnwN8thE81szYpnMFxCMAXzDUuA
   MONGO_URI=mongodb+srv://nexbyte:nexbyte@nexbyte.wplnzim.mongodb.net/unexa_new
   JWT_SECRET=unexa_super_app_jwt_secret_key_2024_production
   ```

### **2. Build Process Issues**
**Problem**: npm install fail ho raha hai
**Solution**:
```yaml
buildCommand: npm ci --production
# ya
buildCommand: npm install && npm run build
```

### **3. Start Command Issues**
**Problem**: Server start nahi ho raha properly
**Solution**:
```yaml
startCommand: npm start
# ya specific
startCommand: node server.js
```

### **4. Port Issues**
**Problem**: Port binding issues
**Solution**: Render automatically sets PORT, remove from env:
```yaml
# Remove this line:
# - key: PORT
#   value: 5000
```

## 🔧 **Fixed render.yaml**

```yaml
services:
  - type: web
    name: unexa-backend
    env: node
    plan: free
    buildCommand: npm ci
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGO_URI
        value: mongodb+srv://nexbyte:nexbyte@nexbyte.wplnzim.mongodb.net/unexa_new
      - key: JWT_SECRET
        value: unexa_super_app_jwt_secret_key_2024_production
      - key: CLOUDINARY_CLOUD_NAME
        value: ddw7kbm3k
      - key: CLOUDINARY_API_KEY
        value: 225359785496153
      - key: CLOUDINARY_API_SECRET
        value: BnwN8thE81szYpnMFxCMAXzDUuA
```

## 🚀 **Quick Fix Steps**

### **Step 1: Update render.yaml**
Copy the fixed configuration above

### **Step 2: Add Environment Variables in Render Dashboard**
1. Go to your service in Render
2. Click "Environment" tab
3. Add all variables manually

### **Step 3: Redeploy**
```bash
git add .
git commit -m "Fix deployment configuration"
git push origin main
```

### **Step 4: Check Render Logs**
1. Render dashboard → Your service → Logs tab
2. Look for specific error messages
3. Check build logs and runtime logs

## 🔍 **Debugging Commands**

### **Local Test for Production:**
```bash
# Test production environment locally
NODE_ENV=production node server.js
```

### **Check Dependencies:**
```bash
npm ls
npm outdated
```

### **Validate Environment:**
```bash
node -e "console.log('NODE_ENV:', process.env.NODE_ENV); console.log('CLOUDINARY:', !!process.env.CLOUDINARY_CLOUD_NAME);"
```

## 📋 **What to Check in Render Dashboard**

### **Service Settings:**
- ✅ Name: unexa-backend
- ✅ Type: Web Service
- ✅ Environment: Node
- ✅ Build Command: npm ci
- ✅ Start Command: node server.js

### **Environment Variables:**
- ✅ All required variables added
- ✅ No typos in variable names
- ✅ Correct values

### **Build Logs:**
- ✅ npm install successful
- ✅ No build errors
- ✅ Dependencies installed correctly

### **Runtime Logs:**
- ✅ Server starts successfully
- ✅ Database connects
- ✅ Port binding successful
- ✅ Cloudinary connection works

## 🆘 **If Still Not Working**

### **Option 1: Use Render's Auto-Deploy**
1. Connect GitHub repo to Render
2. Let Render handle deployment automatically
3. Check GitHub Actions for errors

### **Option 2: Manual Deployment**
1. Build locally: `npm run build`
2. Deploy build folder manually
3. Use Render's direct upload

### **Option 3: Contact Render Support**
- Check Render status page
- Create support ticket
- Check service status

---

**Next**: Update render.yaml with fixed configuration and redeploy!
