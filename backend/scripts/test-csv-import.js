require('dotenv').config();
const aasImportService = require('../services/aasImportService');
const fs = require('fs');
const path = require('path');

/**
 * Test script for AAS 6.0 CSV import
 * Creates a sample CSV file and tests the import process
 */

async function createSampleCSV() {
  const csvContent = `Department,Name,Staff Code,Date,Week,Time1,Time2,Time3,Time4,Time5,Time6,Time7,Time8,Time9,Time10,Time11,Time12
IT,khalid,00000001,1/27/2026,Monday,23:29,23:36,,,,,,,,,,
HR,Ahmed,00000002,1/27/2026,Monday,08:15,12:30,13:45,,,,,,,,,
Admin,Sara,00000003,1/28/2026,Tuesday,09:00,,,,,,,,,,,
IT,khalid,00000001,1/28/2026,Tuesday,08:45,12:00,13:15,17:30,,,,,,,,`;

  const testFilePath = path.join(__dirname, 'test-aas-import.csv');
  fs.writeFileSync(testFilePath, csvContent);
  console.log(`✅ Created sample CSV file: ${testFilePath}`);
  return testFilePath;
}

async function testImport() {
  console.log('🧪 Testing AAS 6.0 CSV Import\n');
  console.log('='.repeat(50));

  try {
    // Create sample CSV
    const csvPath = await createSampleCSV();

    console.log('\n📊 Sample CSV Content:');
    console.log('- khalid (Staff Code: 00000001) - 2 days, multiple check-ins');
    console.log('- Ahmed (Staff Code: 00000002) - 1 day, 3 check-ins');
    console.log('- Sara (Staff Code: 00000003) - 1 day, 1 check-in');

    // Run import
    console.log('\n🔄 Running import...\n');
    const result = await aasImportService.importFromCSV(csvPath);

    // Display results
    console.log('='.repeat(50));
    console.log('📋 IMPORT RESULTS:');
    console.log('='.repeat(50));
    console.log(`✅ Success: ${result.success}`);
    console.log(`📝 Records Processed: ${result.recordsProcessed}`);
    console.log(`💾 Records Saved: ${result.recordsSaved}`);
    
    if (result.unmappedStaffCodes.length > 0) {
      console.log(`\n⚠️  Unmapped Staff Codes (${result.unmappedStaffCodes.length}):`);
      result.unmappedStaffCodes.forEach(code => {
        console.log(`   - Staff Code: ${code}`);
      });
      console.log('\n💡 These staff codes need to be mapped to database person IDs');
      console.log('   Use the user mapping API to create mappings');
    }

    if (result.errors.length > 0) {
      console.log(`\n❌ Errors (${result.errors.length}):`);
      result.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Test completed successfully!');
    console.log('='.repeat(50));

    // Show next steps
    console.log('\n📌 NEXT STEPS:');
    console.log('1. Create user mappings for unmapped staff codes');
    console.log('2. Re-run import to process previously unmapped records');
    console.log('3. Verify attendance records in dual_mode_attendance table');
    console.log('4. Check attendance_audit_log for import details');

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error);
    process.exit(1);
  }
}

// Run test
testImport()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
