const { spawn } = require('child_process');
const fs = require('fs');

const tempDir = 'G:\\temp';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

process.env.TEMP = tempDir;
process.env.TMP = tempDir;

console.log('🚀 Redirecting build temp directory to G:\\temp (480GB+ free space)...');
console.log('📦 Starting EAS Build for Android (Production AAB)...\n');

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(npxCmd, ['eas-cli', 'build', '--platform', 'android', '--profile', 'production', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    TEMP: tempDir,
    TMP: tempDir,
  },
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
