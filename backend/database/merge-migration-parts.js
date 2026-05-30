/**
 * Merge V1toV2Migration part files into main file
 */

const fs = require('fs');
const path = require('path');

// Read main file
const mainFile = path.join(__dirname, 'V1toV2Migration.js');
let mainContent = fs.readFileSync(mainFile, 'utf8');

// Find the last closing brace of the class (before module.exports)
const lines = mainContent.split('\n');
let classEndIndex = -1;

// Find the line with "module.exports"
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('module.exports')) {
    // Find the closing brace before this line
    for (let j = i - 1; j >= 0; j--) {
      if (lines[j].trim() === '}' && !lines[j-1].includes('catch') && !lines[j-1].includes('finally')) {
        classEndIndex = j;
        break;
      }
    }
    break;
  }
}

if (classEndIndex === -1) {
  console.error('✗ Could not find class closing brace');
  process.exit(1);
}

// Read part2 file and extract methods
const part2File = path.join(__dirname, 'V1toV2Migration-part2.js');
const part2Content = fs.readFileSync(part2File, 'utf8');

// Extract methods from part2 (everything after the comment header)
const part2Methods = part2Content
  .split('\n')
  .slice(7) // Skip the header comments
  .join('\n')
  .trim();

// Read part3 file and extract methods
const part3File = path.join(__dirname, 'V1toV2Migration-part3.js');
const part3Content = fs.readFileSync(part3File, 'utf8');

// Extract methods from part3
const part3Methods = part3Content
  .split('\n')
  .slice(7) // Skip the header comments
  .join('\n')
  .trim();

// Insert methods before the class closing brace
const beforeClass = lines.slice(0, classEndIndex).join('\n');
const afterClass = lines.slice(classEndIndex).join('\n');

const mergedContent = beforeClass + '\n\n  ' + part2Methods.replace(/\n/g, '\n  ') + '\n\n  ' + part3Methods.replace(/\n/g, '\n  ') + '\n' + afterClass;

// Write back to main file
fs.writeFileSync(mainFile, mergedContent);

console.log('✓ Successfully merged V1toV2Migration part files into main file');
console.log('  - Added methods from V1toV2Migration-part2.js');
console.log('  - Added methods from V1toV2Migration-part3.js');
console.log(`  - Inserted at line ${classEndIndex}`);

