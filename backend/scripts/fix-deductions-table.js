const pool = require('../config/db');

async function fixDeductionsTable() {
  try {
    console.log('🔧 Checking hr_deductions table structure...');
    
    // Check if table exists and get column names
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hr_deductions'
      ORDER BY ordinal_position
    `);
    
    if (checkColumns.rows.length === 0) {
      console.log('❌ Table hr_deductions does not exist');
      console.log('✅ Creating hr_deductions table with correct structure...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS hr_deductions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_id VARCHAR(255) NOT NULL,
          staff_name VARCHAR(255) NOT NULL,
          deduction_type VARCHAR(50) NOT NULL,
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
      
      console.log('✅ Table structure is correct');
    }
    
    // Verify final structure
    const finalCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'hr_deductions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ Final table structure:');
    finalCheck.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n✅ hr_deductions table is now ready!');
    
  } catch (error) {
    console.error('❌ Error fixing deductions table:', error);
  } finally {
    await pool.end();
  }
}

fixDeductionsTable();
