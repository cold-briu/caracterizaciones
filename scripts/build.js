const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const distDir = path.join(projectRoot, 'dist');

// 1. Read package.json version
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = pkg.version || '1.0.0';

// 2. Ensure distDir exists and clean up JS/HTML files in dist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const distFiles = fs.readdirSync(distDir);
distFiles.forEach(file => {
  if (file.endsWith('.js') || file.endsWith('.html')) {
    fs.unlinkSync(path.join(distDir, file));
  }
});

// 3. Read and sort source files (putting main.js last)
const files = fs.readdirSync(path.join(projectRoot, 'src'))
  .filter(file => file.endsWith('.js'));

files.sort((a, b) => {
  if (a === 'main.js') return 1;
  if (b === 'main.js') return -1;
  return a.localeCompare(b);
});

let bundledContent = `// Version: ${version}\n`;

files.forEach(file => {
  const filePath = path.join(projectRoot, 'src', file);
  const content = fs.readFileSync(filePath, 'utf8');
  bundledContent += `\n// --- File: ${file} ---\n` + content + '\n';
  console.log(`Bundled src/${file}`);
});

// 4. Stringify and inject src/template.html
const templatePath = path.join(projectRoot, 'src', 'template.html');
if (fs.existsSync(templatePath)) {
  const templateHtml = fs.readFileSync(templatePath, 'utf8');
  // Escape backticks, backslashes, and dollar signs for JS string template literal
  const escapedHtml = templateHtml
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
  
  // Inject into the placeholder
  bundledContent = bundledContent.replace(/__TEMPLATE_HTML_CONTENT__/g, escapedHtml);
  console.log('Successfully stringified and injected src/template.html');
} else {
  console.warn('Warning: src/template.html not found!');
}

const distBundlePath = path.join(distDir, 'dist.js');
fs.writeFileSync(distBundlePath, bundledContent, 'utf8');
console.log(`Saved bundle to dist/dist.js`);

// Copy .clasp.json to distDir so clasp uses distDir as its project root
const claspJsonSrc = path.join(projectRoot, '.clasp.json');
const claspJsonDist = path.join(distDir, '.clasp.json');
if (fs.existsSync(claspJsonSrc)) {
  fs.copyFileSync(claspJsonSrc, claspJsonDist);
}
