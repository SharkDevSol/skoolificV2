/**
 * Script to fix duplicate authenticateWithBranch imports
 * 
 * This script removes duplicate imports of authenticateWithBranch that exist
 * in both '../middleware/auth' and '../middleware/branchAuth'
 * 
 * Usage: node backend/scripts/fix-duplicate-imports.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all files with duplicate imports
const findFilesWithDuplicates = () => {
  try {
    const result = execSync(
      'grep -r "authenticateWithBranch.*require.*auth" backend/routes --include="*.js" -l',
      { encoding: 'utf8' }
    );
    return result.trim().split('\n').filter(f => f);
  } catch (error) {
    // grep returns non-zero exit code when no matches found
    return [];
  }
};

function fixDuplicateImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file has both imports
    const hasAuthImport = content.includes("require('../middleware/auth')") || 
                         content.includes("require('../../middleware/auth')");
    const hasBranchAuthImport = content.includes("require('../middleware/branchAuth')") ||
                               content.includes("require('../../middleware/branchAuth')");
    
    if (!hasAuthImport || !hasBranchAuthImport) {
      return false; // No duplicate
    }
    
    // Check if authenticateWithBranch is in both
    const authImportMatch = content.match(/const\s*{([^}]+)}\s*=\s*require\(['"]\.\.\/middleware\/auth['"]\)/);
    const branchAuthImportMatch = content.match(/const\s*{([^}]+)}\s*=\s*require\(['"]\.\.\/middleware\/branchAuth['"]\)/);
    
    if (!authImportMatch || !branchAuthImportMatch) {
      return false;
    }
    
    const authImports = authImportMatch[1].split(',').map(s => s.trim());
    const branchAuthImports = branchAuthImportMatch[1].split(',').map(s => s.trim());
    
    // Check if authenticateWithBranch is in both
    const hasAuthInBoth = authImports.includes('authenticateWithBranch') && 
                         branchAuthImports.includes('authenticateWithBranch');
    
    if (!hasAuthInBoth) {
      return false;
    }
    
    // Remove authenticateWithBranch from the auth import
    const newAuthImports = authImports.filter(imp => imp !== 'authenticateWithBranch');
    
    if (newAuthImports.length === 0) {
      // Remove the entire auth import line
      content = content.replace(/const\s*{[^}]*authenticateWithBranch[^}]*}\s*=\s*require\(['"]\.\.\/middleware\/auth['"]\);\s*\n/, '');
    } else {
      // Update the auth import to exclude authenticateWithBranch
      const newAuthImportLine = `const { ${newAuthImports.join(', ')} } = require('../middleware/auth');`;
      content = content.replace(/const\s*{[^}]+}\s*=\s*require\(['"]\.\.\/middleware\/auth['"]\);/, newAuthImportLine);
    }
    
    // Write back
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`✗ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing duplicate authenticateWithBranch imports...\n');
  
  // Get all route files
  const routeFiles = [];
  
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (file.endsWith('.js')) {
        routeFiles.push(fullPath);
      }
    }
  }
  
  scanDirectory(path.join(__dirname, '..', 'routes'));
  
  let fixedCount = 0;
  let skippedCount = 0;
  
  for (const file of routeFiles) {
    const result = fixDuplicateImports(file);
    if (result) {
      fixedCount++;
    } else {
      skippedCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   ✓ Fixed: ${fixedCount}`);
  console.log(`   ⚠️  Skipped (no duplicates): ${skippedCount}`);
  console.log(`   📁 Total files scanned: ${routeFiles.length}`);
  
  console.log('\n✅ Duplicate imports have been fixed.');
}

main();
