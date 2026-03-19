const fs = require('fs');
const path = require('path');

// Create simple PNG files (base64 encoded 1x1 pixel)
const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

const assets = [
  'assets/icon.png',
  'assets/adaptive-icon.png', 
  'assets/splash.png',
  'assets/favicon.png'
];

assets.forEach(asset => {
  const dir = path.dirname(asset);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(asset, transparentPixel);
  console.log(`✅ Created ${asset}`);
});

console.log('🎨 All assets created successfully!');
