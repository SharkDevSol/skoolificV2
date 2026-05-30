#!/usr/bin/env node

/**
 * Staff Attendance System Setup Script
 * 
 * This script:
 * 1. Creates all necessary database tables
 * 2. Migrates existing staff to the attendance system
 * 3. Verifies the setup
 * 
 * Usage: node backend/scripts/setup-staff-attendance.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'school_management2',
  password: process.env.DB_PASSWORD || '12345678',
  port: process.env.DB_PORT || 5432,
});

async function setupAttendanceSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Staff Attendance System Setup...\n');

    // Step 1: Create tables
    console.log('📋 Step 1: Creating database tables...');
    
    await client.query(`
      -- Main attendance table
      CREATE TABLE IF NOT EXISTS staff_attendance (
          id SERIAL PRIMARY KEY,
          staff_id VARCHAR(50) NOT NULL,
          staff_name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL CHECK (role IN ('Teacher', 'General Staff', 'Administrator', 'Support Staff')),
          date DATE NOT NULL,
          time_in TIMESTAMP NOT NULL,
          time_out TIMESTAMP,
          step1_timestamp TIMESTAMP,
          step2_timestamp TIMESTAMP,
          verification_status VARCHAR(20) DEFAULT 'single_step' CHECK (verification_status IN ('single_step', 'verified', 'pending')),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(staff_id, date)
      );
    `);
    console.log('  ✓ staff_attendance table created');

    await client.query(`
      -- Staff attendance profiles
      CREATE TABLE IF NOT EXISTS staff_attendance_profiles (
          id SERIAL PRIMARY KEY,
          staff_id VARCHAR(50) NOT NULL UNIQUE,
          staff_name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('  ✓ staff_attendance_profiles table created');

    await client.query(`
      -- Pending verification table
      CREATE TABLE IF NOT EXISTS staff_attendance_pending (
          id SERIAL PRIMARY KEY,
          staff_id VARCHAR(50) NOT NULL,
          staff_name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          step1_timestamp TIMESTAMP NOT NULL,
          status VARCHAR(20) DEFAULT 'pending_step2' CHECK (status IN ('pending_step2', 'completed', 'cancelled', 'expired')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP,
          expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes')
      );
    `);
    console.log('  ✓ staff_attendance_pending table created');

    await client.query(`
      -- Attendance logs
      CREATE TABLE IF NOT EXISTS staff_attendance_logs (
          id SERIAL PRIMARY KEY,
          attendance_id INTEGER REFERENCES staff_attendance(id) ON DELETE CASCADE,
          action VARCHAR(50) NOT NULL,
          performed_by VARCHAR(50),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          details JSONB
      );
    `);
    console.log('  ✓ staff_attendance_logs table created');

    // Step 2: Create indexes
    console.log('\n📊 Step 2: Creating indexes...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_id ON staff_attendance(staff_id);
      CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(date);
      CREATE INDEX IF NOT EXISTS idx_staff_attendance_role ON staff_attendance(role);
      CREATE INDEX IF NOT EXISTS idx_staff_attendance_verification ON staff_attendance(verification_status);
      CREATE INDEX IF NOT EXISTS idx_staff_attendance_profiles_staff_id ON staff_attendance_profiles(staff_id);
      CREATE INDEX IF NOT EXISTS idx_staff_attendance_profiles_active ON staff_attendance_profiles(is_active);
      CREATE INDEX IF NOT EXISTS idx_pending_staff_id ON staff_attendance_pending(staff_id);
      CREATE INDEX IF NOT EXISTS idx_pending_status ON staff_attendance_pending(status);
    `);
    console.log('  ✓ All indexes created');

    // Step 3: Create triggers
    console.log('\n⚙️  Step 3: Creating triggers and functions...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION log_attendance_change()
      RETURNS TRIGGER AS $$
      BEGIN
          IF TG_OP = 'INSERT' THEN
              INSERT INTO staff_attendance_logs (attendance_id, action, details)
              VALUES (NEW.id, 'CLOCK_IN', row_to_json(NEW));
          ELSIF TG_OP = 'UPDATE' AND OLD.time_out IS NULL AND NEW.time_out IS NOT NULL THEN
              INSERT INTO staff_attendance_logs (attendance_id, action, details)
              VALUES (NEW.id, 'CLOCK_OUT', row_to_json(NEW));
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS attendance_change_trigger ON staff_attendance;
      CREATE TRIGGER attendance_change_trigger
      AFTER INSERT OR UPDATE ON staff_attendance
      FOR EACH ROW
      EXECUTE FUNCTION log_attendance_change();
    `);
    console.log('  ✓ Triggers created');

    // Step 4: Create views
    console.log('\n👁️  Step 4: Creating views...');
    
    await client.query(`
      CREATE OR REPLACE VIEW daily_attendance_summary AS
      SELECT 
          date,
          role,
          COUNT(*) as total_staff,
          COUNT(CASE WHEN time_out IS NOT NULL THEN 1 END) as clocked_out,
          COUNT(CASE WHEN time_out IS NULL THEN 1 END) as still_present,
          AVG(EXTRACT(EPOCH FROM (time_out - time_in))/3600) as avg_hours_worked
      FROM staff_attendance
      GROUP BY date, role
      ORDER BY date DESC, role;
    `);
    console.log('  ✓ daily_attendance_summary view created');

    await client.query(`
      CREATE OR REPLACE VIEW staff_attendance_history AS
      SELECT 
          sa.staff_id,
          sa.staff_name,
          sa.role,
          sa.date,
          sa.time_in,
          sa.time_out,
          CASE 
              WHEN sa.time_out IS NOT NULL THEN 
                  EXTRACT(EPOCH FROM (sa.time_out - sa.time_in))/3600
              ELSE NULL
          END as hours_worked,
          sa.verification_status,
          CASE 
              WHEN sa.role = 'Teacher' AND sa.verification_status = 'verified' THEN
                  EXTRACT(EPOCH FROM (sa.step2_timestamp - sa.step1_timestamp))
              ELSE NULL
          END as verification_time_seconds
      FROM staff_attendance sa
      ORDER BY sa.date DESC, sa.time_in DESC;
    `);
    console.log('  ✓ staff_attendance_history view created');

    // Step 5: Migrate existing staff
    console.log('\n👥 Step 5: Migrating existing staff...');
    
    const schemas = ['teachers', 'administrators', 'support_staff', 'general_staff'];
    let migratedCount = 0;
    let skippedCount = 0;

    for (const schema of schemas) {
      try {
        // Check if schema exists
        const schemaCheck = await client.query(`
          SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name = $1
        `, [schema]);

        if (schemaCheck.rows.length === 0) {
          console.log(`  ⊘ Schema "${schema}" not found, skipping...`);
          continue;
        }

        // Get all tables in this schema
        const tablesResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = $1 
          AND table_type = 'BASE TABLE'
        `, [schema]);

        for (const tableRow of tablesResult.rows) {
          const tableName = tableRow.table_name;
          
          try {
            // Check if required columns exist
            const columnsCheck = await client.query(`
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_schema = $1 
              AND table_name = $2 
              AND column_name IN ('global_staff_id', 'name')
            `, [schema, tableName]);

            if (columnsCheck.rows.length < 2) {
              continue; // Skip tables without required columns
            }

            // Get staff from this table
            const staffResult = await client.query(`
              SELECT global_staff_id, name, role 
              FROM "${schema}"."${tableName}"
              WHERE global_staff_id IS NOT NULL 
              AND name IS NOT NULL
            `);

            for (const staff of staffResult.rows) {
              try {
                // Determine role
                const attendanceRole = staff.role || 
                                      (schema === 'teachers' ? 'Teacher' : 'General Staff');

                // Insert profile
                const insertResult = await client.query(`
                  INSERT INTO staff_attendance_profiles 
                  (staff_id, staff_name, role, created_at)
                  VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                  ON CONFLICT (staff_id) DO NOTHING
                  RETURNING id
                `, [staff.global_staff_id.toString(), staff.name, attendanceRole]);

                if (insertResult.rows.length > 0) {
                  migratedCount++;
                  console.log(`  ✓ Migrated: ${staff.name} (${attendanceRole})`);
                } else {
                  skippedCount++;
                }
              } catch (e) {
                console.log(`  ✗ Failed for ${staff.name}: ${e.message}`);
              }
            }
          } catch (e) {
            // Silently skip tables that don't have the right structure
            continue;
          }
        }
      } catch (e) {
        console.log(`  ✗ Error processing schema ${schema}: ${e.message}`);
      }
    }

    console.log(`\n  📊 Migration Summary:`);
    console.log(`     • Migrated: ${migratedCount} staff members`);
    console.log(`     • Skipped: ${skippedCount} (already existed)`);

    // Step 6: Verify setup
    console.log('\n✅ Step 6: Verifying setup...');
    
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'staff_attendance%'
      ORDER BY table_name
    `);
    
    console.log(`  ✓ Found ${tableCheck.rows.length} attendance tables:`);
    tableCheck.rows.forEach(row => {
      console.log(`     • ${row.table_name}`);
    });

    const profileCount = await client.query(`
      SELECT COUNT(*) as count FROM staff_attendance_profiles
    `);
    console.log(`  ✓ Total staff profiles: ${profileCount.rows[0].count}`);

    console.log('\n🎉 Setup completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Restart your backend server');
    console.log('  2. Navigate to /staff/my-attendance');
    console.log('  3. Start using the attendance system!\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
setupAttendanceSystem();
