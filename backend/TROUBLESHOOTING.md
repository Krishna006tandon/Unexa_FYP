# Upload Troubleshooting Guide

## Network Error Solutions

### 1. Check Network Connection
- Open the app and tap "Add Story" → "Test Network"
- This will test connectivity to the backend server

### 2. Verify API URL Configuration
The app uses: `http://192.168.29.104:5000`

**If you're on a different WiFi network:**
1. Update the IP address in `frontend/src/screens/AuthScreen.js` line 9
2. Find your current IP by running `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Replace `192.168.29.104` with your current IP

**If using Android Emulator:**
Change to: `http://10.0.2.2:5000`

### 3. Check Backend Server
- Ensure backend is running: `cd backend && npm start`
- Should see: "🚀 UNEXA Backend Server running on port 5000"
- Test manually: Visit `http://192.168.29.104:5000/api/test` in browser

### 4. Firewall Issues
**Windows Firewall:**
1. Go to Windows Security → Firewall & network protection
2. Click "Allow an app through firewall"
3. Add "Node.js" with both Private and Public networks checked

### 5. Phone/Emulator Network Settings
**Physical Phone:**
- Ensure phone is on the same WiFi network as development machine
- Try toggling WiFi off/on
- Restart the Expo app

**Android Emulator:**
- Use `http://10.0.2.2:5000` instead of the IP address
- Restart the emulator if network issues persist

### 6. Debug Steps
1. Check console logs in Expo app
2. Check backend server logs for incoming requests
3. Try the "Test Network" option in the app
4. Test with different file types/sizes

### 7. Common Error Messages
- **"Network Error"**: Can't reach the server at all
- **"Bad Request 400"**: File format or authentication issue
- **"Unauthorized 401"**: Login token expired
- **"Server Error 500"**: Backend processing error

## Quick Fix Checklist
- [ ] Backend server running on port 5000
- [ ] Phone/emulator on same network as development machine
- [ ] Correct IP address in AuthScreen.js
- [ ] Firewall allows Node.js connections
- [ ] User is logged in (valid token)
- [ ] Test endpoint accessible: `http://[IP]:5000/api/test`

## Testing Upload Functionality
1. Open app and log in
2. Go to Stories screen
3. Tap "Add Story" → "Test Network"
4. If successful, try uploading a small image
5. Check both frontend and backend console logs
