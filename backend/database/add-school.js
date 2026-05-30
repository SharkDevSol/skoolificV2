/**
 * Add New School to Master Database
 * 
 * This script helps you add a new school and its branches to the master database.
 * 
 * Usage:
 *   node database/add-school.js
 */

require('dotenv').config();
const { Client } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function addSchool() {
  console.log('\n🏫 Add New School to Master Database\n');

  const client = new Client({
    host: process.env.MASTER_DB_HOST || process.env.DB_HOST || 'localhost',
    port: process.env.MASTER_DB_PORT || process.env.DB_PORT || 5432,
    database: process.env.MASTER_DB_NAME || 'skoolific_master',
    user: process.env.MASTER_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.MASTER_DB_PASSWORD || process.env.DB_PASSWORD
  });

  try {
    await client.connect();
    console.log('✅ Connected to master database\n');

    // Get school information
    console.log('📝 School Information:');
    const schoolName = await question('   School Name (e.g., "New School"): ');
    const schoolCode = await question('   School Code (e.g., "NEWSCHOOL"): ');
    const description = await question('   Description (optional): ');
    console.log('');

    // Insert school
    console.log('1. Adding school to database...');
    const schoolResult = await client.query(
      `INSERT INTO schools (school_name, school_code, description) 
       VALUES ($1, $2, $3) 
       RETURNING id`,
      [schoolName, schoolCode.toUpperCase(), description || null]
    );
    const schoolId = schoolResult.rows[0].id;
    console.log(`   ✓ School added (ID: ${schoolId})\n`);

    // Get number of branches
    const branchCount = parseInt(await question('How many branches does this school have? '));
    console.log('');

    // Add branches
    console.log('2. Adding branches...\n');
    for (let i = 1; i <= branchCount; i++) {
      console.log(`   Branch ${i}:`);
      const branchName = await question(`      Branch Name (e.g., "Branch ${i}"): `);
      const branchCode = await question(`      Branch Code (e.g., "B${i}"): `);
      const databaseName = await question(`      Database Name (e.g., "${schoolCode.toLowerCase()}_b${i}"): `);
      const apiPort = await question(`      API Port (e.g., "505${i}"): `);

      await client.query(
        `INSERT INTO branches (school_id, branch_name, branch_code, database_name, api_port) 
         VALUES ($1, $2, $3, $4, $5)`,
        [schoolId, branchName, branchCode.toUpperCase(), databaseName, parseInt(apiPort)]
      );
      console.log(`      ✓ Branch added\n`);
    }

    // Display summary
    console.log('3. Summary:\n');
    const summary = await client.query(`
      SELECT 
        s.school_name,
        s.school_code,
        b.branch_name,
        b.branch_code,
        b.database_name,
        b.api_port
      FROM schools s
      LEFT JOIN branches b ON s.id = b.school_id
      WHERE s.id = $1
      ORDER BY b.branch_name
    `, [schoolId]);

    console.log(`   📚 School: ${summary.rows[0].school_name} (${summary.rows[0].school_code})`);
    console.log(`   📍 Branches:`);
    for (const row of summary.rows) {
      console.log(`      - ${row.branch_name} (${row.branch_code})`);
      console.log(`        Database: ${row.database_name}`);
      console.log(`        Port: ${row.api_port}`);
    }
    console.log('');

    await client.end();

    console.log('✅ School added successfully!\n');
    console.log('📝 Next Steps:');
    console.log(`   1. Create databases: ${summary.rows.map(r => r.database_name).join(', ')}`);
    console.log(`   2. Upload backend code for ${schoolName}`);
    console.log(`   3. Configure .env with database name`);
    console.log(`   4. Run migrations on each database`);
    console.log(`   5. Telegram bot will automatically see the new school!\n`);

  } catch (error) {
    console.error('❌ Failed to add school:', error.message);
    if (error.code === '23505') {
      console.error('   School code or name already exists. Please use a different code/name.\n');
    }
  } finally {
    rl.close();
  }
}

addSchool();
