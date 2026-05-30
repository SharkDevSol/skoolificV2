const pool = require('../config/db');

async function fixAllowancesTable() {
  try {
    console.log('🔧 Checking hr_allowances table structure...');
    
    // Check if table exists and get column names
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hr_allowances'
      ORDER BY ordinal_position
    `);
    
    if (checkColumns.rows.length === 0) {
      console.log('❌ Table hr_allowances does not exist');
      console.log('✅ Creating hr_allowances table with correct structure...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS hr_allowances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_id VARCHAR(255) NOT NULL,
          staff_name VARCHAR(255) NOT NULL,
          allowance_type VARCHAR(255) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          ethiopian_month VARCHAR(50),
          ethiopian_year INTEGER,
          start_date DATE,
          end_date DATE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      console.log('✅ Table created successfully');
    } else {
      console.log('📋 Current columns:');
      checkColumns.rows.forEach(row => {
        console.log(`   - ${row.column_name}`);
      });
      
      // Check if allowance_name exists instead of allowance_type
      const hasAllowanceName = checkColumns.rows.some(row => row.column_name === 'allowance_name');
      const hasAllowanceType = checkColumns.rows.some(row => row.column_name === 'allowance_type');
      
      if (hasAllowanceName && !hasAllowanceType) {
        console.log('🔄 Renaming allowance_name to allowance_type...');
        await pool.query(`
          ALTER TABLE hr_allowances 
          RENAME COLUMN allowance_name TO allowance_type
        `);
        console.log('✅ Column renamed successfully');
      } else if (hasAllowanceType) {
        console.log('✅ Table structure is correct');
      } else {
        console.log('⚠️ Neither allowance_name nor allowance_type found');
        console.log('Adding allowance_type column...');
        await pool.query(`
          ALTER TABLE hr_allowances 
          ADD COLUMN allowance_type VARCHAR(255) NOT NULL DEFAULT 'General'
        `);
        console.log('✅ Column added successfully');
      }
    }
    
    // Verify final structure
    const finalCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'hr_allowances'
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ Final table structure:');
    finalCheck.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n✅ hr_allowances table is now ready!');
    
  } catch (error) {
    console.error('❌ Error fixing allowances table:', error);
  } finally {
    await pool.end();
  }
}

fixAllowancesTable();
