#!/usr/bin/env node

/**
 * Script to help update route files for branch authentication
 * 
 * This script:
 * 1. Scans all route files
 * 2. Identifies which ones use authenticateToken
 * 3. Provides a report of what needs updating
 * 4. Optionally updates imports (manual review still needed for route logic)
 * 
 * Usage:
 *   node backend/scripts/update-routes-for-branch-auth.js --scan
 *   node backend/scripts/update-routes-for-branch-auth.js --update-imports
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../routes');
const REPORT_FILE = path.join(__dirname, '../BRANCH_AUTH_ROUTES_REPORT.md');

// Files to skip (already updated or special cases)
const SKIP_FILES = [
  'branchRoutes.js', // Already uses branch auth
  'healthRoutes.js', // No auth needed
];

// Scan a single file for authentication usage
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  const hasAuthImport = content.includes("require('../middleware/auth')") || 
                        content.includes('require("../middleware/auth")');
  const hasBranchAuthImport = content.includes("require('../middleware/branchAuth')") || 
                              content.includes('require("../middleware/branchAuth")');
  const usesAuthenticateToken = content.match(/authenticateToken/g);
  const usesAuthenticateWithBranch = content.match(/authenticateWithBranch/g);
  const usesDb = content.match(/\bdb\.(query|connect)/g);
  
  return {
    fileName,
    filePath,
    hasAuthImport,
    hasBranchAuthImport,
    authTokenCount: usesAuthenticateToken ? usesAuthenticateToken.length : 0,
    branchAuthCount: usesAuthenticateWithBranch ? usesAuthenticateWithBranch.length : 0,
    dbUsageCount: usesDb ? usesDb.length : 0,
    needsUpdate: hasAuthImport && !hasBranchAuthImport && usesAuthenticateToken,
    status: hasBranchAuthImport ? '✅ Updated' : 
            (hasAuthImport && usesAuthenticateToken ? '🔄 Needs Update' : 
            (hasAuthImport ? '⚠️ Has Auth Import' : '✓ No Auth'))
  };
}

// Recursively scan directory
function scanDirectory(dir, results = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath, results);
    } else if (file.endsWith('.js') && !file.endsWith('.backup') && !SKIP_FILES.includes(file)) {
      results.push(scanFile(filePath));
    }
  }
  
  return results;
}

// Generate markdown report
function generateReport(results) {
  const needsUpdate = results.filter(r => r.needsUpdate);
  const updated = results.filter(r => r.hasBranchAuthImport);
  const noAuth = results.filter(r => !r.hasAuthImport);
  
  let report = `# Branch Authentication Routes Update Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- **Total Route Files:** ${results.length}\n`;
  report += `- **Already Updated:** ${updated.length}\n`;
  report += `- **Needs Update:** ${needsUpdate.length}\n`;
  report += `- **No Authentication:** ${noAuth.length}\n\n`;
  
  report += `## Files Needing Update (${needsUpdate.length})\n\n`;
  report += `| File | Auth Usage | DB Usage | Priority |\n`;
  report += `|------|------------|----------|----------|\n`;
  
  // Sort by auth usage count (descending)
  needsUpdate.sort((a, b) => b.authTokenCount - a.authTokenCount);
  
  for (const file of needsUpdate) {
    const priority = file.authTokenCount > 10 ? '🔴 High' : 
                    file.authTokenCount > 5 ? '🟡 Medium' : '🟢 Low';
    report += `| ${file.fileName} | ${file.authTokenCount} routes | ${file.dbUsageCount} queries | ${priority} |\n`;
  }
  
  report += `\n## Already Updated (${updated.length})\n\n`;
  for (const file of updated) {
    report += `- ✅ ${file.fileName}\n`;
  }
  
  report += `\n## No Authentication (${noAuth.length})\n\n`;
  for (const file of noAuth) {
    report += `- ✓ ${file.fileName}\n`;
  }
  
  report += `\n## Update Instructions\n\n`;
  report += `For each file that needs update:\n\n`;
  report += `1. **Update imports:**\n`;
  report += `   \`\`\`javascript\n`;
  report += `   // Add this import\n`;
  report += `   const { authenticateWithBranch, validateBranchCode } = require('../middleware/branchAuth');\n`;
  report += `   \`\`\`\n\n`;
  report += `2. **Replace middleware in routes:**\n`;
  report += `   \`\`\`javascript\n`;
  report += `   // OLD\n`;
  report += `   router.get('/route', authenticateToken, (req, res) => { ... });\n\n`;
  report += `   // NEW\n`;
  report += `   router.get('/route', authenticateWithBranch, (req, res) => { ... });\n`;
  report += `   \`\`\`\n\n`;
  report += `3. **Update database queries:**\n`;
  report += `   \`\`\`javascript\n`;
  report += `   // OLD\n`;
  report += `   const result = await db.query('SELECT ...');\n\n`;
  report += `   // NEW\n`;
  report += `   const pool = req.branchPool;\n`;
  report += `   const result = await pool.query('SELECT ...');\n`;
  report += `   \`\`\`\n\n`;
  
  return report;
}

// Update imports in a file
function updateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Check if already has branch auth import
  if (content.includes("require('../middleware/branchAuth')") || 
      content.includes('require("../middleware/branchAuth")')) {
    console.log(`⏭️  ${fileName} - Already has branch auth import`);
    return false;
  }
  
  // Check if has auth import
  const authImportRegex = /const\s+{([^}]+)}\s*=\s*require\(['"]\.\.\/middleware\/auth['"]\);?/;
  const match = content.match(authImportRegex);
  
  if (!match) {
    console.log(`⏭️  ${fileName} - No auth import found`);
    return false;
  }
  
  // Add branch auth import after auth import
  const authImportLine = match[0];
  const newImport = `const { authenticateWithBranch, validateBranchCode } = require('../middleware/branchAuth');`;
  
  content = content.replace(authImportLine, `${authImportLine}\n${newImport}`);
  
  // Write back
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ ${fileName} - Added branch auth import`);
  return true;
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🔍 Scanning route files...\n');
  const results = scanDirectory(ROUTES_DIR);
  
  if (command === '--scan' || !command) {
    // Generate and save report
    const report = generateReport(results);
    fs.writeFileSync(REPORT_FILE, report, 'utf8');
    console.log(`\n📊 Report generated: ${REPORT_FILE}`);
    console.log(`\n📈 Summary:`);
    console.log(`   Total files: ${results.length}`);
    console.log(`   Needs update: ${results.filter(r => r.needsUpdate).length}`);
    console.log(`   Already updated: ${results.filter(r => r.hasBranchAuthImport).length}`);
  } else if (command === '--update-imports') {
    // Update imports in all files that need it
    console.log('\n🔧 Updating imports...\n');
    let updated = 0;
    
    for (const file of results.filter(r => r.needsUpdate)) {
      if (updateImports(file.filePath)) {
        updated++;
      }
    }
    
    console.log(`\n✅ Updated ${updated} files`);
    console.log(`\n⚠️  Note: You still need to manually update route handlers to use authenticateWithBranch and req.branchPool`);
  } else {
    console.log('Usage:');
    console.log('  node update-routes-for-branch-auth.js --scan          # Generate report');
    console.log('  node update-routes-for-branch-auth.js --update-imports # Add branch auth imports');
  }
}

main();
