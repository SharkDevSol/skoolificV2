#!/usr/bin/env node

/**
 * Script to update database queries to use req.branchPool
 * 
 * This script:
 * 1. Finds routes using authenticateWithBranch
 * 2. Identifies db.query() calls in those routes
 * 3. Adds const pool = req.branchPool at the start of route handlers
 * 4. Replaces db.query with pool.query
 * 
 * Usage:
 *   node backend/scripts/update-db-queries.js --scan      # Analyze files
 *   node backend/scripts/update-db-queries.js --report    # Generate detailed report
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../routes');
const REPORT_FILE = path.join(__dirname, '../DB_QUERIES_UPDATE_REPORT.md');

// Files to skip
const SKIP_FILES = [
  'branchRoutes.js', // Already uses branch pool correctly
  'healthRoutes.js', // No auth needed
];

// Analyze a file for database query usage
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Check if file uses authenticateWithBranch
  const usesAuthWithBranch = content.includes('authenticateWithBranch');
  
  // Count db.query usage
  const dbQueryMatches = content.match(/\bdb\.(query|connect)/g);
  const dbQueryCount = dbQueryMatches ? dbQueryMatches.length : 0;
  
  // Count pool.query usage (already updated)
  const poolQueryMatches = content.match(/\bpool\.(query|connect)/g);
  const poolQueryCount = poolQueryMatches ? poolQueryMatches.length : 0;
  
  // Count branchPool usage
  const branchPoolMatches = content.match(/req\.branchPool/g);
  const branchPoolCount = branchPoolMatches ? branchPoolMatches.length : 0;
  
  // Check if db is imported
  const hasDbImport = content.includes("require('../config/db')") || 
                      content.includes('require("../config/db")');
  
  return {
    fileName,
    filePath,
    usesAuthWithBranch,
    hasDbImport,
    dbQueryCount,
    poolQueryCount,
    branchPoolCount,
    needsUpdate: usesAuthWithBranch && dbQueryCount > 0,
    status: branchPoolCount > 0 ? '✅ Uses branchPool' :
            (usesAuthWithBranch && dbQueryCount > 0 ? '🔄 Needs Update' :
            (dbQueryCount > 0 ? '⚠️ Has DB queries' : '✓ No DB queries'))
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
    } else if (file.endsWith('.js') && !file.endsWith('.backup') && !file.endsWith('.backup-auth') && !SKIP_FILES.includes(file)) {
      results.push(analyzeFile(filePath));
    }
  }
  
  return results;
}

// Generate markdown report
function generateReport(results) {
  const needsUpdate = results.filter(r => r.needsUpdate);
  const updated = results.filter(r => r.branchPoolCount > 0);
  const noQueries = results.filter(r => r.dbQueryCount === 0 && r.poolQueryCount === 0);
  
  let report = `# Database Queries Update Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- **Total Route Files:** ${results.length}\n`;
  report += `- **Already Using branchPool:** ${updated.length}\n`;
  report += `- **Needs Update:** ${needsUpdate.length}\n`;
  report += `- **No Database Queries:** ${noQueries.length}\n\n`;
  
  report += `## Files Needing Update (${needsUpdate.length})\n\n`;
  report += `These files use authenticateWithBranch but still use db.query instead of req.branchPool:\n\n`;
  report += `| File | DB Queries | Priority |\n`;
  report += `|------|------------|----------|\n`;
  
  // Sort by query count (descending)
  needsUpdate.sort((a, b) => b.dbQueryCount - a.dbQueryCount);
  
  for (const file of needsUpdate) {
    const priority = file.dbQueryCount > 20 ? '🔴 High' : 
                    file.dbQueryCount > 10 ? '🟡 Medium' : '🟢 Low';
    report += `| ${file.fileName} | ${file.dbQueryCount} | ${priority} |\n`;
  }
  
  report += `\n## Already Using branchPool (${updated.length})\n\n`;
  for (const file of updated) {
    report += `- ✅ ${file.fileName} (${file.branchPoolCount} usage(s))\n`;
  }
  
  report += `\n## Update Instructions\n\n`;
  report += `For each route handler that uses authenticateWithBranch:\n\n`;
  report += `1. **Add pool variable at the start of the handler:**\n`;
  report += `   \`\`\`javascript\n`;
  report += `   router.get('/route', authenticateWithBranch, async (req, res) => {\n`;
  report += `     const pool = req.branchPool; // Add this line\n`;
  report += `     // ... rest of handler\n`;
  report += `   });\n`;
  report += `   \`\`\`\n\n`;
  report += `2. **Replace all db.query with pool.query:**\n`;
  report += `   \`\`\`javascript\n`;
  report += `   // OLD\n`;
  report += `   const result = await db.query('SELECT * FROM table');\n\n`;
  report += `   // NEW\n`;
  report += `   const result = await pool.query('SELECT * FROM table');\n`;
  report += `   \`\`\`\n\n`;
  report += `3. **Replace db.connect() with pool.connect():**\n`;
  report += `   \`\`\`javascript\n`;
  report += `   // OLD\n`;
  report += `   const client = await db.connect();\n\n`;
  report += `   // NEW\n`;
  report += `   const client = await pool.connect();\n`;
  report += `   \`\`\`\n\n`;
  report += `4. **Optional: Remove db import if no longer needed:**\n`;
  report += `   \`\`\`javascript\n`;
  report += `   // If all queries now use req.branchPool, you can remove:\n`;
  report += `   // const db = require('../config/db');\n`;
  report += `   \`\`\`\n\n`;
  
  report += `## Important Notes\n\n`;
  report += `- **Branch Context:** req.branchPool is only available in routes using authenticateWithBranch\n`;
  report += `- **Connection Pooling:** Each branch has its own connection pool managed by DatabaseConnectionManager\n`;
  report += `- **Error Handling:** Branch validation errors return 404 with clear messages\n`;
  report += `- **Testing:** Test each updated route with valid and invalid branch codes\n\n`;
  
  report += `## Manual Update Required\n\n`;
  report += `This is a complex transformation that requires manual review:\n\n`;
  report += `1. Each route handler needs individual attention\n`;
  report += `2. Some routes may use db in callbacks or nested functions\n`;
  report += `3. Transaction handling (client.query) needs special care\n`;
  report += `4. Error handling should be preserved\n\n`;
  
  report += `**Recommendation:** Update files one at a time, starting with high-priority files.\n`;
  
  return report;
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🔍 Analyzing database query usage...\n');
  const results = scanDirectory(ROUTES_DIR);
  
  if (command === '--scan' || !command) {
    // Simple summary
    const needsUpdate = results.filter(r => r.needsUpdate);
    const updated = results.filter(r => r.branchPoolCount > 0);
    
    console.log(`📊 Summary:`);
    console.log(`   Total files: ${results.length}`);
    console.log(`   Already using branchPool: ${updated.length}`);
    console.log(`   Needs update: ${needsUpdate.length}`);
    
    if (needsUpdate.length > 0) {
      console.log(`\n🔄 Files needing update:`);
      needsUpdate.sort((a, b) => b.dbQueryCount - a.dbQueryCount);
      for (const file of needsUpdate.slice(0, 10)) {
        console.log(`   - ${file.fileName} (${file.dbQueryCount} db.query calls)`);
      }
      if (needsUpdate.length > 10) {
        console.log(`   ... and ${needsUpdate.length - 10} more`);
      }
    }
    
    console.log(`\n💡 Run with --report to generate detailed report`);
    
  } else if (command === '--report') {
    // Generate detailed report
    const report = generateReport(results);
    fs.writeFileSync(REPORT_FILE, report, 'utf8');
    console.log(`📊 Detailed report generated: ${REPORT_FILE}`);
    
    const needsUpdate = results.filter(r => r.needsUpdate);
    console.log(`\n⚠️  ${needsUpdate.length} files need manual update`);
    console.log(`   This requires careful review of each route handler`);
    console.log(`   See the report for detailed instructions`);
    
  } else {
    console.log('Usage:');
    console.log('  node update-db-queries.js --scan    # Quick summary');
    console.log('  node update-db-queries.js --report  # Detailed report');
  }
}

main();
