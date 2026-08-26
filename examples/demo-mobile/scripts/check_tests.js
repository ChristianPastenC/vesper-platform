const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

const allFiles = getFiles(srcDir);
const tsxFiles = allFiles.filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));
const hookFiles = allFiles.filter(f => f.endsWith('.ts') && path.basename(f).startsWith('use') && !f.endsWith('.test.ts'));

console.log('Components to check:', tsxFiles.length);
console.log('Hooks to check:', hookFiles.length);

const missingTests = [];

for (const file of [...tsxFiles, ...hookFiles]) {
  const ext = path.extname(file);
  const testFile = file.replace(ext, `.test${ext}`);
  if (!fs.existsSync(testFile)) {
    missingTests.push(file);
  }
}

if (missingTests.length > 0) {
  console.log('Missing tests for:', missingTests.length);
  console.log(missingTests.map(f => path.relative(srcDir, f)).join('\n'));
  process.exit(1);
} else {
  console.log('All components and hooks have test files!');
  process.exit(0);
}
