const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walk(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = walk('./src');
let issues = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('key={') && !line.includes('index') && !line.includes('idx') && !line.includes('Idx') && !line.includes('i}') && !line.includes('i)') && !line.includes('i +') && !line.includes('i+')) {
      issues.push({ file, lineNum: idx + 1, text: line.trim() });
    }
  });
});

console.log('Remaining potential key issues count:', issues.length);
issues.forEach(i => console.log(i.file + ':' + i.lineNum + ' -> ' + i.text));
