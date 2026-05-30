require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function findStaffTables() {
  try {
    console.log('🔍 Searching for staff tables in database...');
    console.log('');
    
    // Find all tables that might be staff-related
    const result = await pool.query(`
      SELECT 
        table_schema, 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = t.table_schema 
         AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT IN ('pg_catalog', 'information_schema', 'form_metadata')
        AND (
          table_name ILIKE '%teacher%' OR
          table_name ILIKE '%staff%' OR
          table_name ILIKE '%administrative%' OR
          table_name ILIKE '%supportive%'
        )
      ORDER BY table_schema, table_name
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No staff tables found!');
      console.log('');
      console.log('Let me show you ALL tables in your database:');
      console.log('');
      
      const allTables = await pool.query(`
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name
        LIMIT 50
      `);
      
      console.log('📋 All tables:');
      allTables.rows.forEach(row => {
        console.log(`   ${row.table_schema}.${row.table_name}`);
      });
    } else {
      console.log('✅ Found staff-related tables:');
      console.log('');
      result.rows.forEach(row => {
        console.log(`📋 ${row.table_schema}.${row.table_name} (${row.column_count} columns)`);
      });
      console.log('');
      console.log(`Total: ${result.rows.length} tables`);
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findStaffTables();
