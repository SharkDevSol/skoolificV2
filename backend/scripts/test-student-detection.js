// Script to test if student detection works
const pool = require('../config/db');

async function testStudentDetection() {
  console.log('\n========================================');
  console.log('🧪 Testing Student Detection Logic');
  console.log('========================================\n');

  try {
    // Test Machine ID 3001 (kalid abdulamid)
    const testMachineId = '3001';
    
    console.log(`Testing Machine ID: ${testMachineId}\n`);
    
    // Check if machine ID matches any STUDENT
    let isStudent = false;
    let studentInfo = null;
    
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      ORDER BY table_name
    `);
    
    console.log(`Found ${tablesResult.rows.length} class tables:\n`);
    
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      console.log(`Checking class: ${tableName}...`);
      
      const studentsResult = await pool.query(`
        SELECT 
          CAST(smachine_id AS VARCHAR) as smachine_id,
          student_name,
          CAST(school_id AS VARCHAR) as student_id,
          '${tableName}' as class_name
        FROM classes_schema."${tableName}"
        WHERE CAST(smachine_id AS VARCHAR) = $1
      `, [testMachineId]);
      
      if (studentsResult.rows.length > 0) {
        isStudent = true;
        studentInfo = studentsResult.rows[0];
        console.log(`   ✅ FOUND!`);
        break;
      } else {
        console.log(`   ❌ Not found`);
      }
    }
    
    console.log('\n========================================');
    console.log('Test Results:');
    console.log('========================================\n');
    
    if (isStudent && studentInfo) {
      console.log('✅ Machine ID is a STUDENT\n');
      console.log('Student Information:');
      console.log(`   Name: ${studentInfo.student_name}`);
      console.log(`   Student ID: ${studentInfo.student_id}`);
      console.log(`   Class: ${studentInfo.class_name}`);
      console.log(`   Machine ID: ${studentInfo.smachine_id}`);
      
      console.log('\n✅ When this student checks in on the machine:');
      console.log('   1. Machine sends log to backend (port 7788)');
      console.log('   2. Backend detects it\'s a student');
      console.log('   3. Backend saves to academic_student_attendance');
      console.log('   4. Frontend displays in Student Attendance page');
      
    } else {
      console.log('❌ Machine ID is NOT a student');
      console.log('   This Machine ID will be treated as staff');
    }
    
    console.log('\n========================================');
    console.log('Testing Complete');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testStudentDetection();
