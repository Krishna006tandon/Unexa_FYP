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

const extraArgs = process.argv.slice(2).join(' ');
const cmd = `npx eas-cli build --platform android --profile production ${extraArgs}`.trim();

const child = spawn(cmd, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    TEMP: tempDir,
    TMP: tempDir,
  },
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
