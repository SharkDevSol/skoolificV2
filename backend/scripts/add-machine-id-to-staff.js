require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addMachineIdColumn() {
  try {
    console.log('🔧 Adding machine_id column to staff tables...');
    console.log('');
    
    // List of tables to update (based on your actual structure)
    const tables = [
      { schema: 'staff_teachers', table: 'teachers' },
      { schema: 'schedule_schema', table: 'teachers' },
      { schema: 'school_schema_points', table: 'teachers' },
      { schema: 'school_comms', table: 'Staff' }
    ];
    
    for (const { schema, table } of tables) {
      try {
        console.log(`📋 Processing ${schema}.${table}...`);
        
        // Check if machine_id column already exists
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = $1 
            AND table_name = $2 
            AND column_name = 'machine_id'
        `, [schema, table]);
        
        if (columnCheck.rows.length > 0) {
          console.log(`   ⏭️  machine_id already exists`);
          continue;
        }
        
        // Add machine_id column
        await pool.query(`
          ALTER TABLE ${schema}.${table}
          ADD COLUMN machine_id VARCHAR(50) UNIQUE
        `);
        
        console.log(`   ✅ machine_id column added`);
        
        // Add to field metadata for form display
        await pool.query(`
          INSERT INTO form_metadata.field_types 
          (schema_name, table_name, column_name, field_type, required, options)
          VALUES ($1, $2, 'machine_id', 'number', true, NULL)
          ON CONFLICT (schema_name, table_name, column_name)
          DO UPDATE SET 
            field_type = 'number',
            required = true
        `, [schema, table]);
        
        console.log(`   ✅ metadata added`);
        
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
      
      console.log('');
    }
    
    console.log('========================================');
    console.log('   MACHINE ID COLUMN ADDED!');
    console.log('========================================');
    console.log('');
    console.log('✅ Staff tables now have machine_id column');
    console.log('✅ Field is marked as required in forms');
    console.log('✅ Field is unique (no duplicate Machine IDs)');
    console.log('');
    console.log('NEXT STEPS:');
    console.log('1. Restart backend server (npm run dev)');
    console.log('2. Refresh Staff Registration form (Ctrl+F5)');
    console.log('3. You should see "Machine ID" field');
    console.log('4. Enter Machine ID when creating staff (e.g., 1 for Ahmed)');
    console.log('');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addMachineIdColumn();
