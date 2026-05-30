// Script to check if there are any machine attendance records
const pool = require('../config/db');

async function checkMachineAttendance() {
  console.log('\n========================================');
  console.log('🔍 Checking Machine Attendance Records');
  console.log('========================================\n');

  try {
    // Check dual_mode_attendance for machine records
    console.log('1. Checking dual_mode_attendance table...');
    const dualResult = await pool.query(`
      SELECT * FROM dual_mode_attendance 
      WHERE source_type = 'machine' 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);
    
    console.log(`   Found ${dualResult.rows.length} machine records in dual_mode_attendance`);
    if (dualResult.rows.length > 0) {
      console.log('\n   Recent records:');
      dualResult.rows.forEach(r => {
        console.log(`   - Person ID: ${r.person_id}, Type: ${r.person_type}, Date: ${r.date}, Status: ${r.status}`);
      });
    }
    
    // Check academic_student_attendance for machine records
    console.log('\n2. Checking academic_student_attendance table...');
    const studentResult = await pool.query(`
      SELECT * FROM academic_student_attendance 
      WHERE notes LIKE '%machine%' OR notes LIKE '%AI06%'
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`   Found ${studentResult.rows.length} machine records in academic_student_attendance`);
    if (studentResult.rows.length > 0) {
      console.log('\n   Recent records:');
      studentResult.rows.forEach(r => {
        console.log(`   - Student: ${r.student_name} (${r.student_id}), Class: ${r.class_name}`);
        console.log(`     Date: ${r.ethiopian_day}/${r.ethiopian_month}/${r.ethiopian_year}`);
        console.log(`     Status: ${r.status}, Check-in: ${r.check_in_time}`);
        console.log(`     Notes: ${r.notes}\n`);
      });
    }
    
    // Check hr_ethiopian_attendance for machine records
    console.log('3. Checking hr_ethiopian_attendance table...');
    const staffResult = await pool.query(`
      SELECT * FROM hr_ethiopian_attendance 
      WHERE notes LIKE '%machine%' OR notes LIKE '%AI06%'
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`   Found ${staffResult.rows.length} machine records in hr_ethiopian_attendance`);
    if (staffResult.rows.length > 0) {
      console.log('\n   Recent records:');
      staffResult.rows.forEach(r => {
        console.log(`   - Staff: ${r.staff_name} (${r.staff_id})`);
        console.log(`     Date: ${r.ethiopian_day}/${r.ethiopian_month}/${r.ethiopian_year}`);
        console.log(`     Status: ${r.status}, Check-in: ${r.check_in}`);
        console.log(`     Notes: ${r.notes}\n`);
      });
    }
    
    // Check user_machine_mapping
    console.log('4. Checking user_machine_mapping table...');
    const mappingResult = await pool.query(`
      SELECT * FROM user_machine_mapping 
      ORDER BY created_at DESC
    `);
    
    console.log(`   Found ${mappingResult.rows.length} machine user mappings`);
    if (mappingResult.rows.length > 0) {
      console.log('\n   Mappings:');
      mappingResult.rows.forEach(r => {
        console.log(`   - Machine User ID: ${r.machine_user_id} → Person ID: ${r.person_id} (${r.person_type})`);
      });
    }
    
    console.log('\n========================================');
    console.log('✅ Check Complete');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkMachineAttendance();
