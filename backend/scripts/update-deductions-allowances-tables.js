const pool = require('../config/db');

async function updateTables() {
  try {
    console.log('🔄 Updating hr_deductions and hr_allowances tables...\n');
    
    // Check if hr_deductions table exists
    const deductionsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'hr_deductions'
      );
    `);
    
    if (deductionsExists.rows[0].exists) {
      console.log('📋 Updating hr_deductions table...');
      
      // Add new columns if they don't exist
      await pool.query(`
        ALTER TABLE hr_deductions 
        ADD COLUMN IF NOT EXISTS ethiopian_month VARCHAR(50),
        ADD COLUMN IF NOT EXISTS ethiopian_year INTEGER,
        ADD COLUMN IF NOT EXISTS start_date DATE,
        ADD COLUMN IF NOT EXISTS end_date DATE;
      `);
      
      console.log('✅ hr_deductions table updated!');
    } else {
      console.log('⚠️  hr_deductions table does not exist yet');
    }
    
    // Check if hr_allowances table exists
    const allowancesExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'hr_allowances'
      );
    `);
    
    if (allowancesExists.rows[0].exists) {
      console.log('📋 Updating hr_allowances table...');
      
      // Add new columns if they don't exist
      await pool.query(`
        ALTER TABLE hr_allowances 
        ADD COLUMN IF NOT EXISTS ethiopian_month VARCHAR(50),
        ADD COLUMN IF NOT EXISTS ethiopian_year INTEGER,
        ADD COLUMN IF NOT EXISTS start_date DATE,
        ADD COLUMN IF NOT EXISTS end_date DATE;
      `);
      
      console.log('✅ hr_allowances table updated!');
    } else {
      console.log('⚠️  hr_allowances table does not exist yet');
    }
    
    console.log('\n✅ All tables updated successfully!');
    console.log('\nYou can now add deductions and allowances with Ethiopian month tracking.');
    
  } catch (error) {
    console.error('❌ Error updating tables:', error);
  } finally {
    process.exit(0);
  }
}

updateTables();
