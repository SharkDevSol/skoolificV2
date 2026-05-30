const pool = require('../config/db');

async function checkSalaryData() {
  try {
    console.log('🔍 CHECKING SALARY DATA\n');
    console.log('=' .repeat(60));
    
    // 1. Check hr_complete_salaries
    console.log('\n📊 HR_COMPLETE_SALARIES TABLE:\n');
    
    const salaries = await pool.query(`
      SELECT 
        id,
        staff_id,
        staff_name,
        staff_type,
        account_name,
        base_salary,
        tax_amount,
        net_salary,
        is_active,
        created_at
      FROM hr_complete_salaries
      ORDER BY staff_name, created_at DESC
    `);
    
    console.log(`Total records: ${salaries.rows.length}\n`);
    
    salaries.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.staff_name || '❌ NO NAME'}`);
      console.log(`   Staff ID: ${row.staff_id || 'NO ID'}`);
      console.log(`   Type: ${row.staff_type}`);
      console.log(`   Base Salary: ${row.base_salary} Birr`);
      console.log(`   Active: ${row.is_active ? '✅ Yes' : '❌ No'}`);
      console.log(`   Created: ${row.created_at}`);
      console.log('');
    });
    
    // 2. Count by staff_id
    console.log('=' .repeat(60));
    console.log('\n📈 DUPLICATES CHECK:\n');
    
    const duplicateCheck = await pool.query(`
      SELECT 
        staff_id,
        staff_name,
        COUNT(*) as count
      FROM hr_complete_salaries
      GROUP BY staff_id, staff_name
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    if (duplicateCheck.rows.length === 0) {
      console.log('✅ No duplicates found!\n');
    } else {
      console.log(`⚠️ Found ${duplicateCheck.rows.length} staff with duplicates:\n`);
      duplicateCheck.rows.forEach(row => {
        console.log(`   ${row.staff_name || 'NO NAME'} (ID: ${row.staff_id}) - ${row.count} records`);
      });
      console.log('');
    }
    
    // 3. Check for missing names
    console.log('=' .repeat(60));
    console.log('\n🔍 MISSING NAMES CHECK:\n');
    
    const missingNames = await pool.query(`
      SELECT COUNT(*) as count
      FROM hr_complete_salaries
      WHERE staff_name IS NULL OR staff_name = ''
    `);
    
    if (missingNames.rows[0].count > 0) {
      console.log(`⚠️ Found ${missingNames.rows[0].count} records with missing names\n`);
      
      const missingDetails = await pool.query(`
        SELECT id, staff_id, base_salary, created_at
        FROM hr_complete_salaries
        WHERE staff_name IS NULL OR staff_name = ''
        ORDER BY created_at DESC
      `);
      
      missingDetails.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Staff ID: ${row.staff_id || 'NO ID'}, Base: ${row.base_salary}, Created: ${row.created_at}`);
      });
      console.log('');
    } else {
      console.log('✅ All records have names!\n');
    }
    
    // 4. Count active vs inactive
    console.log('=' .repeat(60));
    console.log('\n📊 ACTIVE STATUS:\n');
    
    const activeCount = await pool.query(`
      SELECT 
        is_active,
        COUNT(*) as count
      FROM hr_complete_salaries
      GROUP BY is_active
    `);
    
    activeCount.rows.forEach(row => {
      console.log(`   ${row.is_active ? '✅ Active' : '❌ Inactive'}: ${row.count} records`);
    });
    console.log('');
    
    // 5. Expected staff count
    console.log('=' .repeat(60));
    console.log('\n🎯 EXPECTED VS ACTUAL:\n');
    
    const uniqueStaff = await pool.query(`
      SELECT COUNT(DISTINCT staff_id) as count
      FROM hr_complete_salaries
      WHERE is_active = true
    `);
    
    console.log(`   Expected staff: 6`);
    console.log(`   Actual unique staff (active): ${uniqueStaff.rows[0].count}`);
    console.log(`   Total active records: ${salaries.rows.filter(r => r.is_active).length}`);
    
    if (uniqueStaff.rows[0].count !== salaries.rows.filter(r => r.is_active).length) {
      console.log(`   ⚠️ MISMATCH: Some staff have multiple active records!`);
    } else {
      console.log(`   ✅ Match: Each staff has one active record`);
    }
    console.log('');
    
    // 6. Recommendations
    console.log('=' .repeat(60));
    console.log('\n💡 RECOMMENDATIONS:\n');
    
    if (duplicateCheck.rows.length > 0) {
      console.log('   ⚠️ Run: FIX_DUPLICATE_PAYROLL.bat');
      console.log('      This will remove duplicate salary records\n');
    }
    
    if (missingNames.rows[0].count > 0) {
      console.log('   ⚠️ Delete records with missing names:');
      console.log('      DELETE FROM hr_complete_salaries WHERE staff_name IS NULL OR staff_name = \'\';\n');
    }
    
    if (duplicateCheck.rows.length === 0 && missingNames.rows[0].count === 0) {
      console.log('   ✅ Data looks good! You can generate payroll.\n');
    }
    
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Error checking salary data:', error);
  } finally {
    await pool.end();
  }
}

checkSalaryData();
