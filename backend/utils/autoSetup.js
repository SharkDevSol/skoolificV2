const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Auto-setup function that runs on server startup
 * Creates default accounts and configurations if they don't exist
 */
async function autoSetup() {
  try {
    console.log('\n🔧 Running auto-setup...');

    // 1. Setup default accounts
    await setupDefaultAccounts();

    // 2. Run Prisma migrations if needed
    await ensurePrismaMigrations();

    // 3. Setup student attendance tables
    await setupStudentAttendanceTables();

    // 4. Setup HR attendance time settings
    await setupHRAttendanceSettings();

    // 5. Setup schedule schema and configuration
    await setupScheduleSchema();

    // 6. Setup subjects schema and tables
    await setupSubjectsSchema();

    console.log('✅ Auto-setup completed successfully!\n');
  } catch (error) {
    console.error('⚠️ Auto-setup encountered an error:', error.message);
    console.error('   Server will continue, but some features may require manual setup');
  }
}

/**
 * Setup default accounts for the finance module
 */
async function setupDefaultAccounts() {
  try {
    // Check if accounts already exist
    const existingAccounts = await prisma.account.findMany({
      where: {
        code: {
          in: ['4000', '1000', '2000', '5000']
        }
      }
    });

    if (existingAccounts.length >= 4) {
      console.log('   ✓ Default accounts already exist');
      return;
    }

    console.log('   📝 Creating default accounts...');

    // Create default accounts if they don't exist
    const accountsToCreate = [
      {
        code: '1000',
        name: 'Cash and Bank',
        type: 'ASSET',
        isActive: true,
        isLeaf: true,
        createdBy: '00000000-0000-0000-0000-000000000000'
      },
      {
        code: '2000',
        name: 'Accounts Receivable',
        type: 'LIABILITY',
        isActive: true,
        isLeaf: true,
        createdBy: '00000000-0000-0000-0000-000000000000'
      },
      {
        code: '4000',
        name: 'Tuition Fee Income',
        type: 'INCOME',
        isActive: true,
        isLeaf: true,
        createdBy: '00000000-0000-0000-0000-000000000000'
      },
      {
        code: '5000',
        name: 'Operating Expenses',
        type: 'EXPENSE',
        isActive: true,
        isLeaf: true,
        createdBy: '00000000-0000-0000-0000-000000000000'
      }
    ];

    for (const accountData of accountsToCreate) {
      const exists = existingAccounts.find(acc => acc.code === accountData.code);
      if (!exists) {
        await prisma.account.create({ data: accountData });
        console.log(`      ✓ Created account: ${accountData.code} - ${accountData.name}`);
      }
    }

    console.log('   ✓ Default accounts setup complete');
  } catch (error) {
    // If Prisma tables don't exist yet, skip this step
    if (error.code === 'P2021') {
      console.log('   ⚠️ Finance tables not found - run migrations first');
    } else {
      throw error;
    }
  }
}

/**
 * Ensure Prisma migrations are applied
 */
async function ensurePrismaMigrations() {
  try {
    // Test if Prisma tables exist by trying a simple query
    await prisma.account.findFirst();
    console.log('   ✓ Prisma migrations are up to date');
  } catch (error) {
    if (error.code === 'P2021') {
      console.log('   ⚠️ Prisma tables not found - attempting to run migrations...');
      
      // Try to run migrations automatically
      const { execSync } = require('child_process');
      try {
        console.log('   📝 Running: npx prisma migrate deploy');
        execSync('npx prisma migrate deploy', { 
          cwd: __dirname + '/..',
          stdio: 'inherit'
        });
        console.log('   ✓ Migrations applied successfully');
      } catch (migrationError) {
        console.log('   ⚠️ Could not run migrations automatically');
        console.log('   📝 Please run manually: cd backend && npx prisma migrate deploy');
      }
    } else {
      // Other errors, just log and continue
      console.log('   ⚠️ Could not verify Prisma migrations');
    }
  }
}

/**
 * Cleanup function to disconnect Prisma
 */
async function cleanup() {
  await prisma.$disconnect();
}

/**
 * Setup student attendance tables
 */
async function setupStudentAttendanceTables() {
  const { Pool } = require('pg');
  const fs = require('fs');
  const path = require('path');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Check if tables exist
    const checkQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('academic_student_attendance_settings', 'academic_class_shift_assignment', 'academic_student_attendance')
    `;
    
    const result = await pool.query(checkQuery);
    const existingTables = result.rows.map(row => row.table_name);
    
    if (existingTables.length >= 3) {
      // Tables exist, check if columns exist
      const settingsColumnsCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'academic_student_attendance_settings'
          AND column_name IN ('school_days', 'auto_absent_enabled')
      `);
      
      const attendanceColumnsCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'academic_student_attendance'
          AND column_name IN ('ethiopian_year', 'ethiopian_month', 'week_number', 'student_name')
      `);
      
      let needsUpdate = false;
      
      // Check settings table columns
      if (settingsColumnsCheck.rows.length < 2) {
        console.log('   📝 Adding missing columns to student attendance settings...');
        const addColumnsPath = path.join(__dirname, '../database/add_school_days_columns.sql');
        if (fs.existsSync(addColumnsPath)) {
          const addColumnsSql = fs.readFileSync(addColumnsPath, 'utf8');
          await pool.query(addColumnsSql);
          console.log('      ✓ Added school_days and auto_absent_enabled columns');
          needsUpdate = true;
        }
      }
      
      // Check attendance table columns
      if (attendanceColumnsCheck.rows.length < 4) {
        console.log('   📝 Adding Ethiopian calendar columns to attendance table...');
        const addEthiopianPath = path.join(__dirname, '../database/add_ethiopian_calendar_columns.sql');
        if (fs.existsSync(addEthiopianPath)) {
          const addEthiopianSql = fs.readFileSync(addEthiopianPath, 'utf8');
          await pool.query(addEthiopianSql);
          console.log('      ✓ Added Ethiopian calendar columns');
          needsUpdate = true;
        }
      }
      
      // Fix constraint for auto-marker compatibility
      console.log('   📝 Fixing student attendance table constraint...');
      const fixConstraintPath = path.join(__dirname, '../database/fix_student_attendance_constraint.sql');
      if (fs.existsSync(fixConstraintPath)) {
        try {
          const fixConstraintSql = fs.readFileSync(fixConstraintPath, 'utf8');
          await pool.query(fixConstraintSql);
          console.log('      ✓ Fixed attendance table constraint');
          needsUpdate = true;
        } catch (err) {
          // Constraint might already be correct, ignore error
          if (!err.message.includes('already exists')) {
            console.log('      ⚠️ Could not fix constraint:', err.message);
          }
        }
      }
      
      if (!needsUpdate) {
        console.log('   ✓ Student attendance tables already exist');
      } else {
        console.log('   ✓ Student attendance tables updated');
      }
      
      await pool.end();
      return;
    }

    console.log('   📝 Creating student attendance tables...');
    
    // Read and execute the schema file
    const schemaPath = path.join(__dirname, '../database/student_attendance_settings_schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('      ✓ Created academic_student_attendance_settings table');
      console.log('      ✓ Created academic_class_shift_assignment table');
      console.log('      ✓ Created academic_student_attendance table');
      console.log('   ✓ Student attendance tables setup complete');
    } else {
      console.log('   ⚠️ Schema file not found, skipping student attendance setup');
    }
    
    await pool.end();
  } catch (error) {
    await pool.end();
    // If tables already exist or other non-critical error, just log and continue
    if (error.code === '42P07') { // duplicate table
      console.log('   ✓ Student attendance tables already exist');
    } else {
      console.log('   ⚠️ Could not setup student attendance tables:', error.message);
    }
  }
}

/**
 * Setup HR attendance time settings table
 */
async function setupHRAttendanceSettings() {
  const { Pool } = require('pg');
  const fs = require('fs');
  const path = require('path');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Check if table exists
    const checkQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'hr_attendance_time_settings'
    `;
    
    const result = await pool.query(checkQuery);
    
    if (result.rows.length > 0) {
      console.log('   ✓ HR attendance time settings table already exists');
      await pool.end();
      return;
    }

    console.log('   📝 Creating HR attendance time settings table...');
    
    // Read and execute the schema file
    const schemaPath = path.join(__dirname, '../database/hr_attendance_time_settings_schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('      ✓ Created hr_attendance_time_settings table');
      console.log('   ✓ HR attendance settings setup complete');
    } else {
      console.log('   ⚠️ Schema file not found, skipping HR attendance setup');
    }
    
    await pool.end();
  } catch (error) {
    await pool.end();
    if (error.code === '42P07') { // duplicate table
      console.log('   ✓ HR attendance time settings table already exists');
    } else {
      console.log('   ⚠️ Could not setup HR attendance settings:', error.message);
    }
  }
}

/**
 * Setup schedule schema and school_config table
 */
async function setupScheduleSchema() {
  const { Pool } = require('pg');
  const fs = require('fs');
  const path = require('path');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Check if schema and table exist
    const schemaCheck = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'schedule_schema'
    `);
    
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'schedule_schema' 
        AND table_name = 'school_config'
    `);
    
    if (schemaCheck.rows.length > 0 && tableCheck.rows.length > 0) {
      console.log('   ✓ Schedule schema and school_config table already exist');
      await pool.end();
      return;
    }

    console.log('   📝 Creating schedule schema and school_config table...');
    
    // Read and execute the schema file
    const schemaPath = path.join(__dirname, '../database/schedule_schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('      ✓ Created schedule_schema');
      console.log('      ✓ Created school_config table with default values');
      console.log('   ✓ Schedule schema setup complete');
    } else {
      console.log('   ⚠️ Schema file not found, skipping schedule schema setup');
    }
    
    await pool.end();
  } catch (error) {
    await pool.end();
    if (error.code === '42P07' || error.code === '42P06') { // duplicate table/schema
      console.log('   ✓ Schedule schema already exists');
    } else {
      console.log('   ⚠️ Could not setup schedule schema:', error.message);
    }
  }
}

/**
 * Setup subjects schema and tables
 */
async function setupSubjectsSchema() {
  const { Pool } = require('pg');
  const fs = require('fs');
  const path = require('path');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Check if schema and tables exist
    const schemaCheck = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'subjects_of_school_schema'
    `);
    
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'subjects_of_school_schema' 
        AND table_name IN ('subjects', 'subject_class_mappings', 'teachers_subjects', 'school_config')
    `);
    
    if (schemaCheck.rows.length > 0 && tableCheck.rows.length >= 4) {
      console.log('   ✓ Subjects schema and tables already exist');
      await pool.end();
      return;
    }

    console.log('   📝 Creating subjects schema and tables...');
    
    // Read and execute the schema file
    const schemaPath = path.join(__dirname, '../database/subjects_schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('      ✓ Created subjects_of_school_schema');
      console.log('      ✓ Created subjects table');
      console.log('      ✓ Created subject_class_mappings table');
      console.log('      ✓ Created teachers_subjects table');
      console.log('      ✓ Created school_config table');
      console.log('   ✓ Subjects schema setup complete');
    } else {
      console.log('   ⚠️ Schema file not found, skipping subjects schema setup');
    }
    
    await pool.end();
  } catch (error) {
    await pool.end();
    if (error.code === '42P07' || error.code === '42P06') { // duplicate table/schema
      console.log('   ✓ Subjects schema already exists');
    } else {
      console.log('   ⚠️ Could not setup subjects schema:', error.message);
    }
  }
}

module.exports = { autoSetup, cleanup };
