/**
 * SQL Injection Vulnerability Audit Script
 * 
 * Scans all JavaScript files for potential SQL injection vulnerabilities
 * Identifies queries that use string concatenation or template literals
 * with user input instead of parameterized queries.
 * 
 * Run: node backend/utils/audit-sql-injection.js
 */

const fs = require('fs');
const path = require('path');

const vulnerablePatterns = [
  // String concatenation in queries
  /pool\.query\([`'"].*\$\{.*\}.*[`'"]\)/g,
  /pool\.query\([`'"].*\+.*[`'"]\)/g,
  
  // Template literals with variables
  /pool\.query\(`[^`]*\$\{[^}]+\}[^`]*`\)/g,
  
  // String concatenation
  /pool\.query\(['"].*['"] \+ .* \+ ['"]/g,
];

const safePatterns = [
  // Parameterized queries (safe)
  /pool\.query\([`'"][^`'"]*\$\d+[^`'"]*[`'"],\s*\[/g,
];

const results = {
  vulnerable: [],
  safe: [],
  suspicious: [],
};

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }
    
    // Check for pool.query
    if (line.includes('pool.query')) {
      // Check if it's a safe parameterized query
      const isSafe = safePatterns.some(pattern => pattern.test(line));
      
      if (isSafe) {
        results.safe.push({
          file: filePath,
          line: lineNumber,
          code: line.trim(),
        });
        return;
      }
      
      // Check for vulnerable patterns
      const isVulnerable = vulnerablePatterns.some(pattern => pattern.test(line));
      
      if (isVulnerable) {
        results.vulnerable.push({
          file: filePath,
          line: lineNumber,
          code: line.trim(),
        });
      } else {
        // Might be safe, but needs manual review
        results.suspicious.push({
          file: filePath,
          line: lineNumber,
          code: line.trim(),
        });
      }
    }
  });
}

function scanDirectory(dir, exclude = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Skip excluded directories
    if (exclude.some(ex => filePath.includes(ex))) {
      return;
    }
    
    if (stat.isDirectory()) {
      scanDirectory(filePath, exclude);
    } else if (file.endsWith('.js')) {
      scanFile(filePath);
    }
  });
}

console.log('🔍 Scanning for SQL Injection Vulnerabilities...\n');

// Scan backend directory, excluding node_modules
scanDirectory(path.join(__dirname, '..'), ['node_modules', 'Uploads']);

console.log('=' .repeat(80));
console.log('📊 SQL INJECTION AUDIT RESULTS');
console.log('='.repeat(80));

console.log(`\n❌ VULNERABLE QUERIES (${results.vulnerable.length})`);
console.log('These queries use string concatenation or template literals with variables.');
console.log('They MUST be converted to parameterized queries.\n');

if (results.vulnerable.length > 0) {
  results.vulnerable.forEach((item, index) => {
    console.log(`${index + 1}. ${item.file}:${item.line}`);
    console.log(`   ${item.code}`);
    console.log('');
  });
} else {
  console.log('✅ No vulnerable queries found!\n');
}

console.log('='.repeat(80));
console.log(`\n⚠️  SUSPICIOUS QUERIES (${results.suspicious.length})`);
console.log('These queries need manual review to confirm they are safe.\n');

if (results.suspicious.length > 0) {
  // Show first 10 suspicious queries
  results.suspicious.slice(0, 10).forEach((item, index) => {
    console.log(`${index + 1}. ${item.file}:${item.line}`);
    console.log(`   ${item.code.substring(0, 100)}...`);
    console.log('');
  });
  
  if (results.suspicious.length > 10) {
    console.log(`... and ${results.suspicious.length - 10} more\n`);
  }
} else {
  console.log('✅ No suspicious queries found!\n');
}

console.log('='.repeat(80));
console.log(`\n✅ SAFE QUERIES (${results.safe.length})`);
console.log('These queries use parameterized queries (safe from SQL injection).\n');

console.log('='.repeat(80));
console.log('\n📈 SUMMARY');
console.log('='.repeat(80));
console.log(`Total Queries Found: ${results.vulnerable.length + results.safe.length + results.suspicious.length}`);
console.log(`✅ Safe (Parameterized): ${results.safe.length}`);
console.log(`⚠️  Suspicious (Needs Review): ${results.suspicious.length}`);
console.log(`❌ Vulnerable (Must Fix): ${results.vulnerable.length}`);

const safePercentage = ((results.safe.length / (results.vulnerable.length + results.safe.length + results.suspicious.length)) * 100).toFixed(2);
console.log(`\n🎯 Safety Score: ${safePercentage}%`);

if (results.vulnerable.length > 0) {
  console.log('\n⚠️  ACTION REQUIRED: Fix vulnerable queries before deployment!');
  process.exit(1);
} else {
  console.log('\n✅ No critical vulnerabilities found!');
  process.exit(0);
}
