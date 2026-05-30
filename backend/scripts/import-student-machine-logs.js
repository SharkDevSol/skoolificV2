// Script to manually import student attendance from machine logs
const pool = require('../config/db');
const { convertToEthiopian, getEthiopianDayOfWeek } = require('../utils/ethiopianCalendar');

async function importStudentMachineLogs() {
  console.log('\n========================================');
  console.log('📥 Importing Student Machine Logs');
  console.log('========================================\n');

  try {
    // Step 1: Get all students with machine IDs
    console.log('Step 1: Getting all students with machine IDs...');
    
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      ORDER BY table_name
    `);
    
    let allStudents = [];
    
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      const studentsResult = await pool.query(`
        SELECT 
          CAST(smachine_id AS VARCHAR) as smachine_id,
          student_name,
          CAST(school_id AS VARCHAR) as student_id,
          '${tableName}' as class_name
        FROM classes_schema."${tableName}"
        WHERE smachine_id IS NOT NULL
      `);
      
      allStudents = allStudents.concat(studentsResult.rows);
    }
    
    console.log(`✅ Found ${allStudents.length} students with machine IDs:`);
    allStudents.forEach(s => {
      console.log(`   - ${s.student_name} (ID: ${s.student_id}, Machine ID: ${s.smachine_id}, Class: ${s.class_name})`);
    });
    
    if (allStudents.length === 0) {
      console.log('❌ No students with machine IDs found!');
      return;
    }
    
    // Step 2: Get machine logs from ai06_users table
    console.log('\nStep 2: Getting machine logs from ai06_users...');
    
    const logsResult = await pool.query(`
      SELECT user_id, name, timestamp
      FROM ai06_users
      WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY timestamp DESC
    `);
    
    console.log(`✅ Found ${logsResult.rows.length} machine logs from last 7 days`);
    
    if (logsResult.rows.length === 0) {
      console.log('❌ No machine logs found!');
      return;
    }
    
    // Step 3: Match logs with students and import
    console.log('\nStep 3: Matching logs with students...\n');
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const log of logsResult.rows) {
      const machineUserId = String(log.user_id);
      
      // Find student with this machine ID
      const student = allStudents.find(s => String(s.smachine_id) === machineUserId);
      
      if (!student) {
        console.log(`⏭️  Machine ID ${machineUserId} (${log.name}) - Not a student`);
        skipped++;
        continue;
      }
      
      // Convert timestamp to Ethiopian date
      const timestamp = new Date(log.timestamp);
      const ethDate = convertToEthiopian(timestamp);
      const dayOfWeek = getEthiopianDayOfWeek(ethDate.year, ethDate.month, ethDate.day);
      const weekNumber = Math.ceil(ethDate.day / 7);
      const checkInTime = timestamp.toTimeString().split(' ')[0]; // HH:MM:SS
      
      console.log(`\n📝 Processing: ${student.student_name} (Machine ID: ${machineUserId})`);
      console.log(`   Timestamp: ${timestamp.toISOString()}`);
      console.log(`   Ethiopian Date: ${ethDate.year}/${ethDate.month}/${ethDate.day} (${dayOfWeek})`);
      console.log(`   Check-in Time: ${checkInTime}`);
      
      // Check if already exists
      const existingResult = await pool.query(`
        SELECT * FROM academic_student_attendance
        WHERE student_id = $1 
          AND class_name = $2 
          AND ethiopian_year = $3 
          AND ethiopian_month = $4 
          AND ethiopian_day = $5
      `, [student.student_id, student.class_name, ethDate.year, ethDate.month, ethDate.day]);
      
      if (existingResult.rows.length > 0) {
        console.log(`   ⏭️  Already exists - skipping`);
        skipped++;
        continue;
      }
      
      // Get time settings to determine status
      let status = 'PRESENT';
      try {
        const settingsResult = await pool.query(
          'SELECT late_threshold_time FROM academic_student_attendance_settings ORDER BY id DESC LIMIT 1'
        );
        
        if (settingsResult.rows.length > 0) {
          const lateThreshold = settingsResult.rows[0].late_threshold_time;
          const checkInTimeOnly = checkInTime.substring(0, 5); // HH:MM
          
          if (checkInTimeOnly > lateThreshold) {
            status = 'LATE';
          }
        }
      } catch (err) {
        // Ignore
      }
      
      // Insert attendance record
      try {
        await pool.query(`
          INSERT INTO academic_student_attendance 
          (student_id, student_name, class_name, smachine_id,
           ethiopian_year, ethiopian_month, ethiopian_day,
           day_of_week, week_number, check_in_time, status, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          student.student_id,
          student.student_name,
          student.class_name,
          student.smachine_id,
          ethDate.year,
          ethDate.month,
          ethDate.day,
          dayOfWeek,
          weekNumber,
          checkInTime,
          status,
          'Imported from machine logs'
        ]);
        
        console.log(`   ✅ Imported successfully - Status: ${status}`);
        imported++;
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        errors++;
      }
    }
    
    console.log('\n========================================');
    console.log('📊 Import Summary:');
    console.log(`   Total Logs: ${logsResult.rows.length}`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log('========================================\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the import
importStudentMachineLogs();
