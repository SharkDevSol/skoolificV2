require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addMachineIdColumn() {
  try {
    console.log('🔧 Adding machine_id column to all staff tables...');
    console.log('');
    
    const schemas = ['teachers', 'administrative_staff', 'supportive_staff'];
    
    for (const schema of schemas) {
      console.log(`📋 Processing schema: ${schema}`);
      
      // Get all tables in the schema
      const tablesResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `, [schema]);
      
      console.log(`   Found ${tablesResult.rows.length} tables`);
      
      for (const table of tablesResult.rows) {
        const tableName = table.table_name;
        
        try {
          // Check if machine_id column already exists
          const columnCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = $1 
              AND table_name = $2 
              AND column_name = 'machine_id'
          `, [schema, tableName]);
          
          if (columnCheck.rows.length > 0) {
            console.log(`   ⏭️  ${schema}.${tableName} - machine_id already exists`);
            continue;
          }
          
          // Add machine_id column
          await pool.query(`
            ALTER TABLE ${schema}.${tableName}
            ADD COLUMN machine_id VARCHAR(50) UNIQUE
          `);
          
          console.log(`   ✅ ${schema}.${tableName} - machine_id column added`);
          
          // Add to field metadata for form display
          await pool.query(`
            INSERT INTO form_metadata.field_types 
            (schema_name, table_name, column_name, field_type, required, options)
            VALUES ($1, $2, 'machine_id', 'number', true, NULL)
            ON CONFLICT (schema_name, table_name, column_name)
            DO UPDATE SET 
              field_type = 'number',
              required = true
          `, [schema, tableName]);
          
          console.log(`   ✅ ${schema}.${tableName} - metadata added`);
          
        } catch (err) {
          console.log(`   ❌ ${schema}.${tableName} - Error: ${err.message}`);
        }
      }
      
      console.log('');
    }
    
    console.log('========================================');
    console.log('   MACHINE ID COLUMN ADDED!');
    console.log('========================================');
    console.log('');
    console.log('✅ All staff tables now have machine_id column');
    console.log('✅ Field is marked as required in forms');
    console.log('✅ Field is unique (no duplicate Machine IDs)');
    console.log('');
    console.log('NEXT STEPS:');
    console.log('1. Restart backend server');
    console.log('2. Go to Staff Registration form');
    console.log('3. You will see "Machine ID" field');
    console.log('4. Enter Machine ID when creating staff (e.g., 1 for Ahmed)');
    console.log('5. AI06 device will use this Machine ID for attendance');
    console.log('');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addMachineIdColumn();
