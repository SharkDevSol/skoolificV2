const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Searching for AAS 6.0 Database...\n');
console.log('='.repeat(60));

// Common locations to check
const commonPaths = [
  'C:\\Program Files\\ZKTeco',
  'C:\\Program Files (x86)\\ZKTeco',
  'C:\\ZKTeco',
  'C:\\AAS',
  'C:\\Program Files\\AAS',
  'C:\\Program Files (x86)\\AAS',
];

console.log('\n📁 Checking common installation paths:\n');

commonPaths.forEach(basePath => {
  if (fs.existsSync(basePath)) {
    console.log(`✅ Found: ${basePath}`);
    
    // List contents
    try {
      const files = fs.readdirSync(basePath, { recursive: true });
      const dbFiles = files.filter(f => 
        f.endsWith('.mdb') || 
        f.endsWith('.accdb') || 
        f.endsWith('.db') ||
        f.endsWith('.mdf')
      );
      
      if (dbFiles.length > 0) {
        console.log('   📊 Database files found:');
        dbFiles.forEach(f => {
          console.log(`      - ${path.join(basePath, f)}`);
        });
      }
    } catch (e) {
      console.log(`   ⚠️  Cannot read directory: ${e.message}`);
    }
  } else {
    console.log(`❌ Not found: ${basePath}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('\n🔎 Searching entire C: drive for database files...');
console.log('(This may take a few minutes)\n');

try {
  // Search for .mdb files
  console.log('Searching for .mdb files...');
  const mdbCommand = 'powershell "Get-ChildItem -Path C:\\ -Recurse -ErrorAction SilentlyContinue -Filter *.mdb | Where-Object { $_.Name -like \'*att*\' -or $_.Name -like \'*AAS*\' -or $_.Name -like \'*zk*\' } | Select-Object FullName"';
  const mdbResult = execSync(mdbCommand, { encoding: 'utf8', timeout: 60000 });
  if (mdbResult.trim()) {
    console.log('✅ Found .mdb files:');
    console.log(mdbResult);
  }
} catch (e) {
  console.log('⚠️  Search timeout or error');
}

try {
  // Search for .accdb files
  console.log('\nSearching for .accdb files...');
  const accdbCommand = 'powershell "Get-ChildItem -Path C:\\ -Recurse -ErrorAction SilentlyContinue -Filter *.accdb | Where-Object { $_.Name -like \'*att*\' -or $_.Name -like \'*AAS*\' -or $_.Name -like \'*zk*\' } | Select-Object FullName"';
  const accdbResult = execSync(accdbCommand, { encoding: 'utf8', timeout: 60000 });
  if (accdbResult.trim()) {
    console.log('✅ Found .accdb files:');
    console.log(accdbResult);
  }
} catch (e) {
  console.log('⚠️  Search timeout or error');
}

console.log('\n' + '='.repeat(60));
console.log('\n📋 NEXT STEPS:');
console.log('1. If database files were found above, copy the full path');
console.log('2. If not found, check AAS 6.0 software settings');
console.log('3. Look in: Tools → Options → Database');
console.log('4. Or check the AAS 6.0 installation directory manually');
console.log('\n' + '='.repeat(60));
