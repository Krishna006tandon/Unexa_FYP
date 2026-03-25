const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Building APK for UNEXA SuperApp...');

// Build the APK
exec('npx expo build:android --type apk', {
  cwd: __dirname,
  stdio: 'inherit'
}, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Build failed: ${error}`);
    return;
  }
  console.log('✅ APK build completed!');
  console.log('📱 Check your Expo dashboard for download link');
});
