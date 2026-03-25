const { exec } = require('child_process');

console.log('🚀 Building local APK...');

// Try different build approaches
const commands = [
  'npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res',
  'cd android && ./gradlew assembleRelease',
  'npx expo export --platform android'
];

commands.forEach((cmd, index) => {
  console.log(`\n📱 Trying build method ${index + 1}: ${cmd}`);
  
  exec(cmd, { 
    cwd: __dirname,
    stdio: 'inherit',
    shell: true 
  }, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Method ${index + 1} failed: ${error.message}`);
      if (index === commands.length - 1) {
        console.log('\n🔄 All methods failed. Try using Expo Go instead:');
        console.log('1. Download Expo Go app');
        console.log('2. Scan: https://expo.dev/@krishna0042/unexa');
        console.log('3. Test with production backend');
      }
    } else {
      console.log(`✅ Method ${index + 1} completed!`);
    }
  });
});
