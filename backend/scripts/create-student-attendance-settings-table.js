const pool = require('../config/db');

async function createStudentAttendanceSettingsTable() {
  try {
    console.log('\n========================================');
    console.log('⚙️  Creating Student Attendance Settings Table');
    console.log('========================================\n');

    // Create the settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS academic_student_attendance_settings (
        id SERIAL PRIMARY KEY,
        check_in_start_time TIME NOT NULL DEFAULT '07:00:00',
        check_in_end_time TIME NOT NULL DEFAULT '08:30:00',
        late_threshold_time TIME NOT NULL DEFAULT '08:00:00',
        absent_marking_time TIME NOT NULL DEFAULT '09:00:00',
        school_days TEXT[] NOT NULL DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        auto_absent_enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log('✅ Table created: academic_student_attendance_settings');

    // Insert default settings
    const checkExists = await pool.query('SELECT COUNT(*) FROM academic_student_attendance_settings');
    
    if (parseInt(checkExists.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO academic_student_attendance_settings (
          check_in_start_time,
          check_in_end_time,
          late_threshold_time,
          absent_marking_time,
          school_days,
          auto_absent_enabled
        ) VALUES (
          '07:00:00',
          '08:30:00',
          '08:00:00',
          '09:00:00',
          ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          true
        )
      `);
      console.log('✅ Default settings inserted');
    } else {
      console.log('ℹ️  Settings already exist, skipping insert');
    }

    console.log('\n========================================');
    console.log('✅ Student Attendance Settings Table Setup Complete');
    console.log('========================================\n');
    console.log('Default Settings:');
    console.log('  Check-in Start: 07:00 AM');
    console.log('  Check-in End: 08:30 AM');
    console.log('  Late Threshold: 08:00 AM');
    console.log('  Auto-Absent Time: 09:00 AM');
    console.log('  School Days: Monday-Friday');
    console.log('  Auto-Absent: Enabled');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createStudentAttendanceSettingsTable();
