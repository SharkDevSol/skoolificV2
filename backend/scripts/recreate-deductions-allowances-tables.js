const pool = require('../config/db');

async function recreateTables() {
  try {
    console.log('🔄 Recreating hr_deductions and hr_allowances tables...\n');
    
    // Backup existing data
    console.log('📦 Backing up existing data...');
    
    let deductionsBackup = [];
    let allowancesBackup = [];
    
    try {
      const deductionsResult = await pool.query('SELECT * FROM hr_deductions');
      deductionsBackup = deductionsResult.rows;
      console.log(`   Backed up ${deductionsBackup.length} deductions`);
    } catch (err) {
      console.log('   No existing deductions table');
    }
    
    try {
      const allowancesResult = await pool.query('SELECT * FROM hr_allowances');
      allowancesBackup = allowancesResult.rows;
      console.log(`   Backed up ${allowancesBackup.length} allowances`);
    } catch (err) {
      console.log('   No existing allowances table');
    }
    
    // Drop old tables
    console.log('\n🗑️  Dropping old tables...');
    await pool.query('DROP TABLE IF EXISTS hr_deductions CASCADE');
    await pool.query('DROP TABLE IF EXISTS hr_allowances CASCADE');
    console.log('   Tables dropped');
    
    // Create new tables with correct schema
    console.log('\n📋 Creating new tables with Ethiopian month support...');
    
    await pool.query(`
      CREATE TABLE hr_deductions (
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
    console.log('   ✅ hr_deductions table created');
    
    await pool.query(`
      CREATE TABLE hr_allowances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        staff_id VARCHAR(255) NOT NULL,
        staff_name VARCHAR(255) NOT NULL,
        allowance_name VARCHAR(255) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        ethiopian_month VARCHAR(50),
        ethiopian_year INTEGER,
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('   ✅ hr_allowances table created');
    
    // Restore old data (without Ethiopian month info)
    if (deductionsBackup.length > 0) {
      console.log('\n📥 Restoring deductions (without Ethiopian month data)...');
      for (const deduction of deductionsBackup) {
        await pool.query(
          `INSERT INTO hr_deductions (staff_id, staff_name, deduction_type, amount, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [deduction.staff_id, deduction.staff_name, deduction.deduction_type, deduction.amount, deduction.created_at]
        );
      }
      console.log(`   ✅ Restored ${deductionsBackup.length} deductions`);
    }
    
    if (allowancesBackup.length > 0) {
      console.log('\n📥 Restoring allowances (without Ethiopian month data)...');
      for (const allowance of allowancesBackup) {
        await pool.query(
          `INSERT INTO hr_allowances (staff_id, staff_name, allowance_name, amount, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [allowance.staff_id, allowance.staff_name, allowance.allowance_name, allowance.amount, allowance.created_at]
        );
      }
      console.log(`   ✅ Restored ${allowancesBackup.length} allowances`);
    }
    
    console.log('\n✅ Tables recreated successfully!');
    console.log('\n⚠️  Note: Old deductions/allowances were restored but without Ethiopian month data.');
    console.log('   New entries will have Ethiopian month tracking.');
    
  } catch (error) {
    console.error('❌ Error recreating tables:', error);
  } finally {
    process.exit(0);
  }
}

recreateTables();
