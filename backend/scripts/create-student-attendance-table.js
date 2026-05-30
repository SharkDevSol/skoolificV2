const pool = require('../config/db');

async function createStudentAttendanceTable() {
  try {
    console.log('\n========================================');
    console.log('📋 Creating Student Attendance Table');
    console.log('========================================\n');

    // Create the table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS academic_student_attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id VARCHAR(255) NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        class_name VARCHAR(255) NOT NULL,
        smachine_id VARCHAR(50),
        ethiopian_year INTEGER NOT NULL,
        ethiopian_month INTEGER NOT NULL,
        ethiopian_day INTEGER NOT NULL,
        day_of_week VARCHAR(20) NOT NULL,
        week_number INTEGER NOT NULL,
        check_in_time TIME NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PRESENT',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(student_id, class_name, ethiopian_year, ethiopian_month, ethiopian_day)
      )
    `);

    console.log('✅ Table created: academic_student_attendance');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_student_attendance_week 
      ON academic_student_attendance(class_name, ethiopian_year, ethiopian_month, week_number)
    `);

    console.log('✅ Index created: idx_student_attendance_week');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_student_attendance_date 
      ON academic_student_attendance(ethiopian_year, ethiopian_month, ethiopian_day)
    `);

    console.log('✅ Index created: idx_student_attendance_date');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_student_attendance_student 
      ON academic_student_attendance(student_id, class_name)
    `);

    console.log('✅ Index created: idx_student_attendance_student');

    console.log('\n========================================');
    console.log('✅ Student Attendance Table Setup Complete');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createStudentAttendanceTable();
