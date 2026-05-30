// Migration script to update hr_ethiopian_attendance table structure
// Run this to add check_in, check_out, and working_hours columns

const pool = require('../config/db');

async function migrateAttendanceTable() {
  try {
    console.log('🔄 Starting attendance table migration...');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'hr_ethiopian_attendance'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('📋 Table exists. Checking for old structure...');

      // Check if check_in column exists
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'hr_ethiopian_attendance' 
        AND column_name = 'check_in';
      `);

      if (columnCheck.rows.length === 0) {
        console.log('⚠️  Old table structure detected. Backing up and recreating...');

        // Backup old data
        const backupData = await pool.query(`
          SELECT * FROM hr_ethiopian_attendance;
        `);

        console.log(`📦 Backed up ${backupData.rows.length} records`);

        // Drop old table
        await pool.query(`DROP TABLE IF EXISTS hr_ethiopian_attendance;`);
        console.log('🗑️  Dropped old table');

        // Create new table with updated structure
        await pool.query(`
          CREATE TABLE hr_ethiopian_attendance (
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
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(staff_id, ethiopian_year, ethiopian_month, ethiopian_day)
          );
        `);

        console.log('✅ Created new table with check_in/check_out columns');

        // Try to migrate old data with default times
        if (backupData.rows.length > 0) {
          console.log('🔄 Migrating old records with default times...');
          
          let migratedCount = 0;
          for (const record of backupData.rows) {
            try {
              // Set default times based on old status
              let checkIn = '08:00';
              let checkOut = '17:00';
              let workingHours = 9.0;

              if (record.status === 'LATE') {
                checkIn = '08:30'; // Late arrival
                workingHours = 8.5;
              } else if (record.status === 'HALF_DAY') {
                checkOut = '12:00'; // Half day
                workingHours = 4.0;
              } else if (record.status === 'ABSENT') {
                // Skip absent records as they don't have check-in
                continue;
              }

              await pool.query(`
                INSERT INTO hr_ethiopian_attendance 
                (staff_id, staff_name, department_name, ethiopian_year, ethiopian_month, ethiopian_day, 
                 check_in, check_out, working_hours, status, notes, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              `, [
                record.staff_id,
                record.staff_name,
                record.department_name,
                record.ethiopian_year,
                record.ethiopian_month,
                record.ethiopian_day,
                checkIn,
                checkOut,
                workingHours,
                record.status,
                record.notes,
                record.created_at,
                record.updated_at
              ]);

              migratedCount++;
            } catch (err) {
              console.warn(`⚠️  Could not migrate record for ${record.staff_name}:`, err.message);
            }
          }

          console.log(`✅ Migrated ${migratedCount} out of ${backupData.rows.length} records`);
        }

        console.log('✅ Migration completed successfully!');
      } else {
        console.log('✅ Table already has new structure. No migration needed.');
      }
    } else {
      console.log('📝 Table does not exist. It will be created on first use.');
    }

    console.log('\n🎉 Migration script completed!');
    console.log('You can now use the attendance system with check-in/check-out times.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
migrateAttendanceTable()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
