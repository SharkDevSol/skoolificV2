const pool = require('../config/db');

async function migrateSalaryTable() {
  try {
    console.log('Migrating hr_complete_salaries table...\n');
    
    // Drop the old table
    console.log('1. Dropping old table...');
    await pool.query('DROP TABLE IF EXISTS hr_complete_salaries');
    console.log('   ✅ Old table dropped');
    
    // Create new table with account_name instead of account_id
    console.log('\n2. Creating new table...');
    await pool.query(`
      CREATE TABLE hr_complete_salaries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        staff_id VARCHAR(255) NOT NULL,
        staff_name VARCHAR(255) NOT NULL,
        staff_type VARCHAR(50) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        base_salary DECIMAL(15, 2) NOT NULL,
        tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
        net_salary DECIMAL(15, 2) NOT NULL,
        effective_from DATE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('   ✅ New table created');
    
    console.log('\n✅ Migration complete!');
    console.log('\nNew table structure:');
    console.log('  - id (UUID)');
    console.log('  - staff_id (VARCHAR)');
    console.log('  - staff_name (VARCHAR)');
    console.log('  - staff_type (VARCHAR)');
    console.log('  - account_name (VARCHAR) ← Changed from account_id UUID');
    console.log('  - base_salary (DECIMAL)');
    console.log('  - tax_amount (DECIMAL)');
    console.log('  - net_salary (DECIMAL)');
    console.log('  - effective_from (DATE)');
    console.log('  - is_active (BOOLEAN)');
    console.log('  - created_at (TIMESTAMPTZ)');
    console.log('  - updated_at (TIMESTAMPTZ)');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

migrateSalaryTable();
