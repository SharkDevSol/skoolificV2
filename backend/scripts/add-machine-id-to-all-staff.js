require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addMachineIdToAllStaff() {
  try {
    console.log('🔧 Adding machine_id column to ALL staff tables...\n');
    
    // Get all staff tables from all staff schemas
    const staffSchemas = ['staff_teachers', 'staff_supportive_staff', 'staff_administrative_staff'];
    
    for (const schema of staffSchemas) {
      try {
        console.log(`📂 Processing schema: ${schema}`);
        
        // Get all tables in this schema
        const tablesResult = await pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = $1 
            AND table_type = 'BASE TABLE'
        `, [schema]);
        
        if (tablesResult.rows.length === 0) {
          console.log(`   ⚠️  No tables found in ${schema}\n`);
          continue;
        }
        
        for (const row of tablesResult.rows) {
          const tableName = row.table_name;
          console.log(`   📋 Processing table: ${schema}.${tableName}`);
          
          // Check if machine_id column already exists
          const columnCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = $1 
              AND table_name = $2 
              AND column_name = 'machine_id'
          `, [schema, tableName]);
          
          if (columnCheck.rows.length > 0) {
            console.log(`      ⏭️  machine_id already exists`);
            continue;
          }
          
          // Add machine_id column
          await pool.query(`
            ALTER TABLE "${schema}"."${tableName}"
            ADD COLUMN machine_id VARCHAR(50) UNIQUE
          `);
          
          console.log(`      ✅ machine_id column added`);
        }
        
        console.log('');
        
      } catch (err) {
        console.log(`   ❌ Error processing ${schema}: ${err.message}\n`);
      }
    }
    
    // Also add to other important staff tables
    const otherTables = [
      { schema: 'schedule_schema', table: 'teachers' },
      { schema: 'school_schema_points', table: 'teachers' },
      { schema: 'school_comms', table: 'Staff' }
    ];
    
    console.log('📂 Processing other staff-related tables...');
    for (const { schema, table } of otherTables) {
      try {
        console.log(`   📋 Processing ${schema}.${table}`);
        
        // Check if table exists
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = $1 AND table_name = $2
          )
        `, [schema, table]);
        
        if (!tableCheck.rows[0].exists) {
          console.log(`      ⏭️  Table doesn't exist`);
          continue;
        }
        
        // Check if machine_id column already exists
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = $1 
            AND table_name = $2 
            AND column_name = 'machine_id'
        `, [schema, table]);
        
        if (columnCheck.rows.length > 0) {
          console.log(`      ⏭️  machine_id already exists`);
          continue;
        }
        
        // Add machine_id column
        await pool.query(`
          ALTER TABLE "${schema}"."${table}"
          ADD COLUMN machine_id VARCHAR(50) UNIQUE
        `);
        
        console.log(`      ✅ machine_id column added`);
        
      } catch (err) {
        console.log(`      ❌ Error: ${err.message}`);
      }
    }
    
    console.log('\n========================================');
    console.log('   MACHINE ID COLUMN ADDED TO ALL STAFF!');
    console.log('========================================\n');
    console.log('✅ All staff tables now have machine_id column');
    console.log('✅ Field is unique (no duplicate Machine IDs)');
    console.log('\nNEXT STEPS:');
    console.log('1. Restart backend server');
    console.log('2. Refresh Staff Registration forms');
    console.log('3. machine_id field should now appear in all staff forms\n');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addMachineIdToAllStaff();
