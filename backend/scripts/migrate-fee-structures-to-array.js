const pool = require('../config/db');

async function migrateFeeStructures() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Migrating simple_fee_structures table...\n');
    
    await client.query('BEGIN');
    
    // Check if class_names column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'simple_fee_structures' 
      AND column_name = 'class_names'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ Column class_names already exists. No migration needed.');
      await client.query('COMMIT');
      return;
    }
    
    console.log('📝 Step 1: Adding new class_names column (array)...');
    await client.query(`
      ALTER TABLE simple_fee_structures 
      ADD COLUMN class_names TEXT[]
    `);
    console.log('✅ Column added');
    
    console.log('\n📝 Step 2: Migrating data from class_name to class_names...');
    await client.query(`
      UPDATE simple_fee_structures 
      SET class_names = CASE 
        WHEN class_name IS NOT NULL AND class_name != '' 
        THEN ARRAY[class_name]
        ELSE ARRAY[]::TEXT[]
      END
    `);
    console.log('✅ Data migrated');
    
    console.log('\n📝 Step 3: Dropping old class_name column...');
    await client.query(`
      ALTER TABLE simple_fee_structures 
      DROP COLUMN class_name
    `);
    console.log('✅ Old column dropped');
    
    await client.query('COMMIT');
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nTable structure updated:');
    console.log('  - class_name (VARCHAR) → class_names (TEXT[])');
    console.log('  - Existing data preserved and converted to arrays');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateFeeStructures()
  .then(() => {
    console.log('\n🎉 Done! You can now restart the backend server.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error);
    process.exit(1);
  });
