/**
 * Configure Schools and Branches
 * Run this script to set up your schools and branches in the master database
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skoolific',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function configureSchools() {
  console.log('\n🏫 Configuring Schools and Branches...\n');

  try {
    // Clear existing data (optional - comment out if you want to keep existing)
    console.log('1. Clearing existing schools and branches...');
    await pool.query('DELETE FROM branches');
    await pool.query('DELETE FROM schools');
    console.log('   ✓ Cleared\n');

    // Insert schools
    console.log('2. Inserting schools...');
    
    const schools = [
      { name: 'Iqra School', code: 'IQRA', description: 'Iqra Islamic School' },
      { name: 'Al-Markaz School', code: 'ALMARKAZ', description: 'Al-Markaz Islamic School' },
      { name: 'Al-Khwarizmi School', code: 'ALKHWARIZMI', description: 'Al-Khwarizmi School' },
      { name: 'Test School', code: 'TEST', description: 'Test School for Development' }
    ];

    for (const school of schools) {
      await pool.query(
        'INSERT INTO schools (school_name, school_code, description) VALUES ($1, $2, $3)',
        [school.name, school.code, school.description]
      );
      console.log(`   ✓ ${school.name}`);
    }
    console.log('');

    // Insert branches
    console.log('3. Inserting branches...');
    
    const branches = [
      // Iqra branches
      { school: 'IQRA', name: 'Branch 1', code: 'B1', database: 'iqrab1', port: 5050 },
      { school: 'IQRA', name: 'Branch 2', code: 'B2', database: 'iqrab2', port: 5051 },
      { school: 'IQRA', name: 'Branch 3', code: 'B3', database: 'iqrab3', port: 5052 },
      
      // Al-Markaz branches
      { school: 'ALMARKAZ', name: 'Main Campus', code: 'MAIN', database: 'almarkaz_main', port: 5053 },
      { school: 'ALMARKAZ', name: 'Secondary Campus', code: 'SEC', database: 'almarkaz_secondary', port: 5054 },
      
      // Al-Khwarizmi branches
      { school: 'ALKHWARIZMI', name: 'Main Campus', code: 'MAIN', database: 'alkhwarizmi_main', port: 5055 },
      
      // Test school (using current database)
      { school: 'TEST', name: 'Test Branch', code: 'TEST', database: 'skoolific', port: 5052 }
    ];

    for (const branch of branches) {
      const schoolResult = await pool.query(
        'SELECT id FROM schools WHERE school_code = $1',
        [branch.school]
      );

      if (schoolResult.rows.length > 0) {
        await pool.query(
          `INSERT INTO branches (school_id, branch_name, branch_code, database_name, api_port) 
           VALUES ($1, $2, $3, $4, $5)`,
          [schoolResult.rows[0].id, branch.name, branch.code, branch.database, branch.port]
        );
        console.log(`   ✓ ${branch.school} - ${branch.name} (${branch.database})`);
      }
    }
    console.log('');

    // Display summary
    console.log('4. Configuration Summary:\n');
    
    const summary = await pool.query(`
      SELECT 
        s.school_name,
        s.school_code,
        COUNT(b.id) as branch_count
      FROM schools s
      LEFT JOIN branches b ON s.id = b.school_id
      GROUP BY s.id, s.school_name, s.school_code
      ORDER BY s.school_name
    `);

    console.log('   Schools and Branches:');
    for (const row of summary.rows) {
      console.log(`   📚 ${row.school_name} (${row.school_code}): ${row.branch_count} branch(es)`);
    }
    console.log('');

    // Display all branches
    const allBranches = await pool.query(`
      SELECT 
        s.school_name,
        b.branch_name,
        b.database_name,
        b.api_port
      FROM branches b
      JOIN schools s ON b.school_id = s.id
      ORDER BY s.school_name, b.branch_name
    `);

    console.log('   Branch Details:');
    for (const branch of allBranches.rows) {
      console.log(`   📍 ${branch.school_name} - ${branch.branch_name}`);
      console.log(`      Database: ${branch.database_name}`);
      console.log(`      Port: ${branch.api_port}`);
      console.log('');
    }

    console.log('✅ Schools and branches configured successfully!\n');
    console.log('📝 Note: Update the database names and ports to match your actual setup\n');

  } catch (error) {
    console.error('❌ Configuration failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

configureSchools();
