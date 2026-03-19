// Comprehensive System Test - Tests all fixes without requiring Cloudinary credentials
const fs = require('fs');
const path = require('path');

console.log('🧪 RUNNING COMPREHENSIVE SYSTEM TEST\n');

// Test 1: Check if all required files exist and have correct content
console.log('📁 Test 1: File Structure and Content');
console.log('=====================================');

const requiredFiles = [
  'config/cloudinary.js',
  'controllers/profileController.js',
  'routes/uploadRoutes.js',
  'routes/mediaShare.js',
  'services/mediaService.js',
  'controllers/uploadController.js'
];

let filesTestPassed = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
    
    // Check content
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (file.includes('cloudinary.js')) {
      if (content.includes('cloudinary') && content.includes('CloudinaryStorage')) {
        console.log(`   ✅ Cloudinary configuration found`);
      } else {
        console.log(`   ❌ Cloudinary configuration missing`);
        filesTestPassed = false;
      }
    }
    
    if (file.includes('profileController.js')) {
      if (content.includes('uploadAvatar') && content.includes('req.file.path')) {
        console.log(`   ✅ Profile controller updated for Cloudinary`);
      } else {
        console.log(`   ❌ Profile controller not properly updated`);
        filesTestPassed = false;
      }
    }
    
    if (file.includes('uploadRoutes.js')) {
      if (content.includes('cloudinary') && !content.includes('diskStorage')) {
        console.log(`   ✅ Upload routes updated for Cloudinary`);
      } else {
        console.log(`   ❌ Upload routes not properly updated`);
        filesTestPassed = false;
      }
    }
    
    if (file.includes('mediaShare.js')) {
      if (content.includes('cloudinary') && content.includes('req.file.path')) {
        console.log(`   ✅ Media share routes updated for Cloudinary`);
      } else {
        console.log(`   ❌ Media share routes not properly updated`);
        filesTestPassed = false;
      }
    }
    
    if (file.includes('mediaService.js')) {
      if (!content.includes('192.168.29.104') && content.includes('cloudinary')) {
        console.log(`   ✅ Media service updated - hardcoded IP removed`);
      } else {
        console.log(`   ❌ Media service not properly updated`);
        filesTestPassed = false;
      }
    }
    
    if (file.includes('uploadController.js')) {
      if (content.includes('req.file.path') && !content.includes('uploadToS3')) {
        console.log(`   ✅ Upload controller updated for Cloudinary`);
      } else {
        console.log(`   ❌ Upload controller not properly updated`);
        filesTestPassed = false;
      }
    }
    
  } else {
    console.log(`❌ ${file} missing`);
    filesTestPassed = false;
  }
});

// Test 2: Check package.json for Cloudinary dependencies
console.log('\n📦 Test 2: Dependencies');
console.log('=======================');

try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const deps = packageJson.dependencies;
  
  if (deps.cloudinary) {
    console.log(`✅ cloudinary package installed: ${deps.cloudinary}`);
  } else {
    console.log('❌ cloudinary package not found');
    filesTestPassed = false;
  }
  
  if (deps['multer-storage-cloudinary']) {
    console.log(`✅ multer-storage-cloudinary package installed: ${deps['multer-storage-cloudinary']}`);
  } else {
    console.log('❌ multer-storage-cloudinary package not found');
    filesTestPassed = false;
  }
  
} catch (error) {
  console.log('❌ Error reading package.json');
  filesTestPassed = false;
}

// Test 3: Check environment setup
console.log('\n🔧 Test 3: Environment Setup');
console.log('==========================');

try {
  const envExample = fs.readFileSync(path.join(__dirname, '.env.example'), 'utf8');
  if (envExample.includes('CLOUDINARY_CLOUD_NAME')) {
    console.log('✅ .env.example has Cloudinary variables');
  } else {
    console.log('❌ .env.example missing Cloudinary variables');
    filesTestPassed = false;
  }
} catch (error) {
  console.log('❌ .env.example not found');
  filesTestPassed = false;
}

// Test 4: Test imports and module loading
console.log('\n🔌 Test 4: Module Loading');
console.log('========================');

let moduleTestPassed = true;

try {
  // Test Cloudinary config loading
  const cloudinaryConfig = require('./config/cloudinary.js');
  console.log('✅ Cloudinary config module loads successfully');
  
  if (cloudinaryConfig.cloudinary && cloudinaryConfig.upload) {
    console.log('✅ Cloudinary exports are correct');
  } else {
    console.log('❌ Cloudinary exports missing');
    moduleTestPassed = false;
  }
  
} catch (error) {
  console.log('❌ Error loading Cloudinary config:', error.message);
  moduleTestPassed = false;
}

try {
  // Test media service loading
  const mediaService = require('./services/mediaService.js');
  console.log('✅ Media service module loads successfully');
  
  if (mediaService.getMediaUrl && mediaService.uploadToCloudinary) {
    console.log('✅ Media service exports are correct');
  } else {
    console.log('❌ Media service exports missing');
    moduleTestPassed = false;
  }
  
} catch (error) {
  console.log('❌ Error loading media service:', error.message);
  moduleTestPassed = false;
}

// Test 5: Test URL generation logic
console.log('\n🔗 Test 5: URL Generation');
console.log('==========================');

let urlTestPassed = true;

try {
  const { getMediaUrl, getPublicIdFromUrl } = require('./services/mediaService.js');
  
  // Test Cloudinary URL handling
  const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/unexa/profiles/test.jpg';
  const processedUrl = getMediaUrl(cloudinaryUrl);
  
  if (processedUrl === cloudinaryUrl) {
    console.log('✅ Cloudinary URL handling works correctly');
  } else {
    console.log('❌ Cloudinary URL handling failed');
    urlTestPassed = false;
  }
  
  // Test public ID extraction
  const publicId = getPublicIdFromUrl(cloudinaryUrl);
  if (publicId === 'unexa/profiles/test') {
    console.log('✅ Public ID extraction works correctly');
  } else {
    console.log('❌ Public ID extraction failed');
    urlTestPassed = false;
  }
  
  // Test local URL fallback (should not be used but test for completeness)
  const localUrl = getMediaUrl('test.jpg');
  if (localUrl && (localUrl.startsWith('http://') || localUrl.startsWith('https://'))) {
    console.log('✅ Local URL fallback works');
  } else {
    console.log('❌ Local URL fallback failed');
    urlTestPassed = false;
  }
  
} catch (error) {
  console.log('❌ Error testing URL generation:', error.message);
  urlTestPassed = false;
}

// Test 6: Check for hardcoded IP addresses
console.log('\n🚫 Test 6: Hardcoded IP Check');
console.log('==============================');

let ipTestPassed = true;

const filesToCheck = ['services/mediaService.js', 'routes/uploadRoutes.js', 'routes/mediaShare.js'];

filesToCheck.forEach(file => {
  try {
    const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
    if (content.includes('192.168.29.104')) {
      console.log(`❌ Found hardcoded IP in ${file}`);
      ipTestPassed = false;
    } else {
      console.log(`✅ No hardcoded IP found in ${file}`);
    }
  } catch (error) {
    console.log(`❌ Error checking ${file}`);
    ipTestPassed = false;
  }
});

// Final Results
console.log('\n🎯 FINAL TEST RESULTS');
console.log('====================');

const allTestsPassed = filesTestPassed && moduleTestPassed && urlTestPassed && ipTestPassed;

if (allTestsPassed) {
  console.log('🎉 ALL TESTS PASSED! ✅');
  console.log('\n✅ System is ready for testing with actual Cloudinary credentials');
  console.log('\n📋 What was fixed:');
  console.log('   ✅ Chat media uploads now use Cloudinary');
  console.log('   ✅ Media share uploads now use Cloudinary');
  console.log('   ✅ Hardcoded IP address removed');
  console.log('   ✅ Proper URL generation implemented');
  console.log('   ✅ All required packages installed');
  console.log('   ✅ Module loading works correctly');
  
  console.log('\n🔄 Next steps:');
  console.log('   1. Add your real Cloudinary credentials to .env file');
  console.log('   2. Restart the backend server');
  console.log('   3. Test chat photo uploads in the app');
  console.log('   4. Test media sharing functionality');
  console.log('   5. Verify photos display correctly');
  
} else {
  console.log('❌ SOME TESTS FAILED! ⚠️');
  console.log('\n🔧 Issues found:');
  if (!filesTestPassed) console.log('   - File structure/content issues');
  if (!moduleTestPassed) console.log('   - Module loading issues');
  if (!urlTestPassed) console.log('   - URL generation issues');
  if (!ipTestPassed) console.log('   - Hardcoded IP still present');
}

console.log('\n📊 Test Summary:');
console.log(`   Files & Content: ${filesTestPassed ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   Module Loading: ${moduleTestPassed ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   URL Generation: ${urlTestPassed ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   IP Address Check: ${ipTestPassed ? '✅ PASS' : '❌ FAIL'}`);

process.exit(allTestsPassed ? 0 : 1);
