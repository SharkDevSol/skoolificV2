#!/usr/bin/env node

/**
 * Script to replace authenticateToken with authenticateWithBranch in route files
 * 
 * This script:
 * 1. Finds all instances of authenticateToken in route definitions
 * 2. Replaces them with authenticateWithBranch
 * 3. Creates backups before modifying
 * 
 * Usage:
 *   node backend/scripts/replace-auth-middleware.js --dry-run  # Preview changes
 *   node backend/scripts/replace-auth-middleware.js --apply    # Apply changes
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../routes');

// Files to skip
const SKIP_FILES = [
  'branchRoutes.js', // Already uses branch auth
  'healthRoutes.js', // No auth needed
  'staff_auth.js', // Authentication routes - special handling needed
];

// Replace authenticateToken with authenticateWithBranch in route definitions
function replaceAuthMiddleware(filePath, dryRun = true) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Pattern to match route definitions with authenticateToken
  // Matches: router.get('/path', authenticateToken, ...)
  //          router.post('/path', authenticateToken, authorizeRoles(...), ...)
  const pattern = /\b(authenticateToken)\b/g;
  
  const matches = content.match(pattern);
  if (!matches) {
    return { fileName, changed: false, count: 0 };
  }
  
  if (dryRun) {
    return { fileName, changed: true, count: matches.length, dryRun: true };
  }
  
  // Create backup
  const backupPath = filePath + '.backup-auth';
  if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, content, 'utf8');
  }
  
  // Replace all instances
  const newContent = content.replace(pattern, 'authenticateWithBranch');
  
  // Write back
  fs.writeFileSync(filePath, newContent, 'utf8');
  
  return { fileName, changed: true, count: matches.length, dryRun: false };
}

// Recursively process directory
function processDirectory(dir, dryRun = true, results = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath, dryRun, results);
    } else if (file.endsWith('.js') && !file.endsWith('.backup') && !file.endsWith('.backup-auth') && !SKIP_FILES.includes(file)) {
      const result = replaceAuthMiddleware(filePath, dryRun);
      if (result.changed) {
        results.push(result);
      }
    }
  }
  
  return results;
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === '--dry-run' || !command) {
    console.log('🔍 Scanning for authenticateToken usage (DRY RUN)...\n');
    const results = processDirectory(ROUTES_DIR, true);
    
    if (results.length === 0) {
      console.log('✅ No files need updating!');
      return;
    }
    
    console.log(`Found ${results.length} files with authenticateToken:\n`);
    for (const result of results) {
      console.log(`  📄 ${result.fileName} - ${result.count} instance(s)`);
    }
    
    console.log(`\n💡 Run with --apply to make changes`);
    console.log(`   Backups will be created as .backup-auth files`);
    
  } else if (command === '--apply') {
    console.log('🔧 Replacing authenticateToken with authenticateWithBranch...\n');
    const results = processDirectory(ROUTES_DIR, false);
    
    if (results.length === 0) {
      console.log('✅ No files need updating!');
      return;
    }
    
    let totalReplacements = 0;
    for (const result of results) {
      console.log(`  ✅ ${result.fileName} - Replaced ${result.count} instance(s)`);
      totalReplacements += result.count;
    }
    
    console.log(`\n✅ Updated ${results.length} files (${totalReplacements} replacements)`);
    console.log(`\n⚠️  IMPORTANT: You still need to update database queries to use req.branchPool`);
    console.log(`   Example:`);
    console.log(`     OLD: const result = await db.query('SELECT ...');`);
    console.log(`     NEW: const pool = req.branchPool;`);
    console.log(`          const result = await pool.query('SELECT ...');`);
    
  } else if (command === '--restore') {
    console.log('🔄 Restoring from backups...\n');
    let restored = 0;
    
    function restoreBackups(dir) {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          restoreBackups(filePath);
        } else if (file.endsWith('.backup-auth')) {
          const originalPath = filePath.replace('.backup-auth', '');
          fs.copyFileSync(filePath, originalPath);
          fs.unlinkSync(filePath);
          console.log(`  ✅ Restored ${path.basename(originalPath)}`);
          restored++;
        }
      }
    }
    
    restoreBackups(ROUTES_DIR);
    console.log(`\n✅ Restored ${restored} files`);
    
  } else {
    console.log('Usage:');
    console.log('  node replace-auth-middleware.js --dry-run   # Preview changes');
    console.log('  node replace-auth-middleware.js --apply     # Apply changes');
    console.log('  node replace-auth-middleware.js --restore   # Restore from backups');
  }
}

main();
