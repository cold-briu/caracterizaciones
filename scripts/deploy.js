const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const srcMainJsPath = path.join(projectRoot, 'src', 'main.js');
const distDir = path.join(projectRoot, 'dist');
const distMainJsPath = path.join(distDir, 'main.js');

// 1. Read and increase version number in package.json
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const versionParts = (pkg.version || '1.0.0').split('.');
const patch = parseInt(versionParts[2] || 0, 10) + 1;
const newVersion = `${versionParts[0] || 1}.${versionParts[1] || 0}.${patch}`;
pkg.version = newVersion;

fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`Increased package.json version to ${newVersion}`);

// 2. Copy src files to dist and prepend version number to main.js
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const files = fs.readdirSync(path.join(projectRoot, 'src'));
files.forEach(file => {
  if (file.endsWith('.js')) {
    const srcFilePath = path.join(projectRoot, 'src', file);
    const distFilePath = path.join(distDir, file);
    let content = fs.readFileSync(srcFilePath, 'utf8');
    
    if (file === 'main.js') {
      content = `// Version: ${newVersion}\n` + content;
      console.log(`Copied src/main.js to dist/main.js with prepended version ${newVersion}`);
    } else {
      console.log(`Copied src/${file} to dist/${file}`);
    }
    
    fs.writeFileSync(distFilePath, content, 'utf8');
  }
});

// 3. Push to Google Apps Script via clasp
console.log('Pushing to Google Apps Script via clasp...');
try {
  execSync('clasp push -f', { stdio: 'inherit', cwd: distDir });
  console.log('Successfully deployed to Google Apps Script.');
} catch (error) {
  console.error('Failed to push to Google Apps Script:', error.message);
  process.exit(1);
}
