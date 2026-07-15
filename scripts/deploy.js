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

// 2. Bundle src files into dist/dist.js and clean up old files
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Clean up existing JS files in dist
const distFiles = fs.readdirSync(distDir);
distFiles.forEach(file => {
  if (file.endsWith('.js')) {
    fs.unlinkSync(path.join(distDir, file));
  }
});

// Read and sort source files (putting main.js last)
const files = fs.readdirSync(path.join(projectRoot, 'src'))
  .filter(file => file.endsWith('.js'));

files.sort((a, b) => {
  if (a === 'main.js') return 1;
  if (b === 'main.js') return -1;
  return a.localeCompare(b);
});

let bundledContent = `// Version: ${newVersion}\n`;

files.forEach(file => {
  const filePath = path.join(projectRoot, 'src', file);
  const content = fs.readFileSync(filePath, 'utf8');
  bundledContent += `\n// --- File: ${file} ---\n` + content + '\n';
  console.log(`Bundled src/${file}`);
});

const distBundlePath = path.join(distDir, 'dist.js');
fs.writeFileSync(distBundlePath, bundledContent, 'utf8');
console.log(`Saved bundle to dist/dist.js`);

// Copy .clasp.json to distDir so clasp uses distDir as its project root
const claspJsonSrc = path.join(projectRoot, '.clasp.json');
const claspJsonDist = path.join(distDir, '.clasp.json');
if (fs.existsSync(claspJsonSrc)) {
  fs.copyFileSync(claspJsonSrc, claspJsonDist);
}

// 3. Push to Google Apps Script via clasp
console.log('Pushing to Google Apps Script via clasp...');
try {
  execSync('clasp push -f', { stdio: 'inherit', cwd: distDir });
  console.log('Successfully deployed to Google Apps Script.');
} catch (error) {
  console.error('Failed to push to Google Apps Script:', error.message);
  process.exit(1);
}
