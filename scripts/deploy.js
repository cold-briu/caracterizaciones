const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const distDir = path.join(projectRoot, 'dist');

// 1. Read and increase version number in package.json
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const versionParts = (pkg.version || '1.0.0').split('.');
const patch = parseInt(versionParts[2] || 0, 10) + 1;
const newVersion = `${versionParts[0] || 1}.${versionParts[1] || 0}.${patch}`;
pkg.version = newVersion;

fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`Increased package.json version to ${newVersion}`);

// 2. Build the project
console.log('Building bundle...');
try {
  execSync('node scripts/build.js', { stdio: 'inherit', cwd: projectRoot });
} catch (error) {
  console.error('Build step failed:', error.message);
  process.exit(1);
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
