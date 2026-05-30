const pool = require('../config/db');

/**
 * Attendance System Initializer
 * Runs automatically on server startup
 * Ensures all systems work even after device changes or data deletion
 */

class AttendanceSystemInitializer {
  async initialize() {
    console.log('\n🚀 Initializing Attendance Systems...');
    
    try {
      await this.initializeShiftSettings();
      await this.initializeGlobalSettings();
      await this.initializeEthiopianAttendance();
      await this.initializeClassTeachers();
      
      console.log('✅ All Attendance Systems Initialized\n');
      return true;
    } catch (error) {
      console.error('❌ Attendance System Initialization Error:', error.message);
      console.error('⚠️  Server will continue, but some features may not work correctly');
      return false;
    }
  }

  async initializeShiftSettings() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS shift_time_settings (
          id SERIAL PRIMARY KEY,
          shift_name VARCHAR(20) NOT NULL UNIQUE CHECK (shift_name IN ('shift1', 'shift2')),
          check_in_time TIME NOT NULL DEFAULT '08:00',
          check_out_time TIME NOT NULL DEFAULT '17:00',
          late_threshold TIME NOT NULL DEFAULT '08:15',
          minimum_work_hours DECIMAL(4,2) NOT NULL DEFAULT 8.0,
          half_day_threshold DECIMAL(4,2) NOT NULL DEFAULT 4.0,
          grace_period_minutes INTEGER NOT NULL DEFAULT 15,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await pool.query(`
        INSERT INTO shift_time_settings (shift_name, check_in_time, check_out_time, late_threshold)
        VALUES 
          ('shift1', '08:00', '17:00', '08:15'),
          ('shift2', '14:00', '22:00', '14:15')
        ON CONFLICT (shift_name) DO NOTHING
      `);
      
      console.log('   ✅ Shift settings initialized');
    } catch (error) {
      console.error('   ❌ Shift settings error:', error.message);
      throw error;
    }
  }

  async initializeGlobalSettings() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS hr_attendance_time_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          standard_check_in TIME NOT NULL DEFAULT '08:00',
          late_threshold TIME NOT NULL DEFAULT '08:15',
          standard_check_out TIME NOT NULL DEFAULT '17:00',
          minimum_work_hours DECIMAL(4, 2) NOT NULL DEFAULT 8.0,
          half_day_threshold DECIMAL(4, 2) NOT NULL DEFAULT 4.0,
          grace_period_minutes INTEGER NOT NULL DEFAULT 15,
          max_checkout_hours DECIMAL(4, 2) DEFAULT 3.0,
          absent_threshold_time TIME DEFAULT '15:00',
          weekend_days INTEGER[] DEFAULT ARRAY[]::INTEGER[],
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      const settingsCheck = await pool.query('SELECT id FROM hr_attendance_time_settings LIMIT 1');
      if (settingsCheck.rows.length === 0) {
        await pool.query(`
          INSERT INTO hr_attendance_time_settings 
          (standard_check_in, late_threshold, standard_check_out, minimum_work_hours, half_day_threshold, grace_period_minutes)
          VALUES ('08:00', '08:15', '17:00', 8.0, 4.0, 15)
        `);
      }
      
      console.log('   ✅ Global settings initialized');
    } catch (error) {
      console.error('   ❌ Global settings error:', error.message);
      throw error;
    }
  }

  async initializeEthiopianAttendance() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS hr_ethiopian_attendance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_id VARCHAR(255) NOT NULL,
          staff_name VARCHAR(255) NOT NULL,
          department_name VARCHAR(255),
          ethiopian_year INTEGER NOT NULL,
          ethiopian_month INTEGER NOT NULL,
          ethiopian_day INTEGER NOT NULL,
          check_in TIME NOT NULL,
          check_out TIME,
          working_hours DECIMAL(5, 2),
          status VARCHAR(50) NOT NULL DEFAULT 'PRESENT',
          shift_type VARCHAR(20),
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT hr_ethiopian_attendance_unique_record 
          UNIQUE (staff_id, ethiopian_year, ethiopian_month, ethiopian_day, shift_type)
        )
      `);
      
      // Add indexes if they don't exist
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_hr_ethiopian_attendance_staff 
        ON hr_ethiopian_attendance(staff_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_hr_ethiopian_attendance_date 
        ON hr_ethiopian_attendance(ethiopian_year, ethiopian_month, ethiopian_day)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_hr_ethiopian_attendance_status 
        ON hr_ethiopian_attendance(status)
      `);
      
      console.log('   ✅ Ethiopian attendance initialized');
    } catch (error) {
      console.error('   ❌ Ethiopian attendance error:', error.message);
      throw error;
    }
  }

  async initializeClassTeachers() {
    try {
      await pool.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS school_schema_points.class_teachers (
          id SERIAL PRIMARY KEY,
          global_staff_id INTEGER NOT NULL,
          teacher_name VARCHAR(100) NOT NULL,
          assigned_class VARCHAR(100) NOT NULL,
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(assigned_class)
        )
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_class_teachers_staff_id 
        ON school_schema_points.class_teachers(global_staff_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_class_teachers_class 
        ON school_schema_points.class_teachers(assigned_class)
      `);
      
      console.log('   ✅ Class teachers initialized');
    } catch (error) {
      console.error('   ❌ Class teachers error:', error.message);
      throw error;
    }
  }
}

module.exports = new AttendanceSystemInitializer();
