const pool = require('../config/db');

async function fixDuplicateSalaries() {
  try {
    console.log('🔍 Checking for duplicate salaries...\n');
    
    // Check current salaries
    const allSalaries = await pool.query(`
      SELECT 
        id,
        staff_id,
        staff_name,
        staff_type,
        base_salary,
        is_active,
        created_at
      FROM hr_complete_salaries
      ORDER BY staff_name, created_at DESC
    `);
    
    console.log(`📊 Total salary records: ${allSalaries.rows.length}\n`);
    
    // Group by staff_id to find duplicates
    const staffGroups = {};
    allSalaries.rows.forEach(salary => {
      const key = salary.staff_id || 'NO_ID';
      if (!staffGroups[key]) {
        staffGroups[key] = [];
      }
      staffGroups[key].push(salary);
    });
    
    console.log('📋 Current salary records:\n');
    Object.keys(staffGroups).forEach(staffId => {
      const records = staffGroups[staffId];
      console.log(`Staff ID: ${staffId}`);
      records.forEach((record, index) => {
        console.log(`  ${index + 1}. Name: ${record.staff_name || 'NO NAME'}, Base: ${record.base_salary}, Active: ${record.is_active}, Created: ${record.created_at}`);
      });
      console.log('');
    });
    
    // Find duplicates
    const duplicates = Object.keys(staffGroups).filter(key => staffGroups[key].length > 1);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!\n');
      
      // Check for missing names
      const missingNames = allSalaries.rows.filter(s => !s.staff_name || s.staff_name.trim() === '');
      if (missingNames.length > 0) {
        console.log(`⚠️ Found ${missingNames.length} records with missing names:`);
        missingNames.forEach(record => {
          console.log(`   ID: ${record.id}, Staff ID: ${record.staff_id}, Base: ${record.base_salary}`);
        });
        console.log('\n❓ Do you want to delete records with missing names? (You need to run this manually)');
        console.log('   DELETE FROM hr_complete_salaries WHERE staff_name IS NULL OR staff_name = \'\';');
      }
      
      await pool.end();
      return;
    }
    
    console.log(`⚠️ Found ${duplicates.length} staff with duplicate salary records\n`);
    
    // For each staff with duplicates, keep only the most recent active one
    for (const staffId of duplicates) {
      const records = staffGroups[staffId];
      console.log(`\n🔧 Fixing duplicates for Staff ID: ${staffId} (${records[0].staff_name || 'NO NAME'})`);
      console.log(`   Found ${records.length} records`);
      
      // Sort by created_at DESC (most recent first)
      records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // Keep the first active record, or the most recent if none are active
      const keepRecord = records.find(r => r.is_active) || records[0];
      const deleteRecords = records.filter(r => r.id !== keepRecord.id);
      
      console.log(`   ✅ Keeping: ${keepRecord.staff_name || 'NO NAME'} - Base: ${keepRecord.base_salary} (${keepRecord.is_active ? 'Active' : 'Inactive'})`);
      
      if (deleteRecords.length > 0) {
        console.log(`   ❌ Deleting ${deleteRecords.length} duplicate(s):`);
        
        for (const record of deleteRecords) {
          console.log(`      - ${record.staff_name || 'NO NAME'} - Base: ${record.base_salary} (Created: ${record.created_at})`);
          
          await pool.query(
            `DELETE FROM hr_complete_salaries WHERE id = $1`,
            [record.id]
          );
        }
      }
    }
    
    console.log('\n✅ Duplicate cleanup complete!\n');
    
    // Show final count
    const finalCount = await pool.query(`
      SELECT COUNT(*) as count FROM hr_complete_salaries WHERE is_active = true
    `);
    
    console.log(`📊 Final active salary records: ${finalCount.rows[0].count}\n`);
    
    // Show final list
    const finalList = await pool.query(`
      SELECT staff_id, staff_name, staff_type, base_salary
      FROM hr_complete_salaries
      WHERE is_active = true
      ORDER BY staff_name
    `);
    
    console.log('📋 Final salary list:');
    finalList.rows.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.staff_name || 'NO NAME'} (${record.staff_type}) - ${record.base_salary} Birr`);
    });
    
    console.log('\n✅ Done! You can now generate payroll again.');
    
  } catch (error) {
    console.error('❌ Error fixing duplicate salaries:', error);
  } finally {
    await pool.end();
  }
}

fixDuplicateSalaries();
