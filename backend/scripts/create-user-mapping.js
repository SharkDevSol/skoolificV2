require('dotenv').config();
const pool = require('../config/db');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createMapping() {
  console.log('🔗 CREATE USER MACHINE MAPPING');
  console.log('='.repeat(70));
  console.log('');
  console.log('This will map a machine User ID to a database person_id');
  console.log('');

  try {
    // Get machine user ID
    const machineUserId = await question('Enter Machine User ID (e.g., 1): ');
    
    if (!machineUserId || isNaN(machineUserId)) {
      console.log('❌ Invalid machine user ID');
      rl.close();
      await pool.end();
      return;
    }

    // Get person type
    const personType = await question('Enter person type (student/staff): ');
    
    if (!['student', 'staff'].includes(personType.toLowerCase())) {
      console.log('❌ Invalid person type. Must be "student" or "staff"');
      rl.close();
      await pool.end();
      return;
    }

    // Get person ID
    const personId = await question('Enter database person_id (e.g., khalid, student123): ');
    
    if (!personId) {
      console.log('❌ Invalid person ID');
      rl.close();
      await pool.end();
      return;
    }

    console.log('');
    console.log(`📝 Creating mapping: Machine User ${machineUserId} → ${personId} (${personType})`);
    console.log('');

    // Confirm
    const confirm = await question('Create this mapping? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Cancelled');
      rl.close();
      await pool.end();
      return;
    }

    // Create mapping
    await pool.query(
      `INSERT INTO user_machine_mapping (person_id, person_type, machine_user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (machine_user_id) DO UPDATE
       SET person_id = $1, person_type = $2, updated_at = NOW()`,
      [personId, personType.toLowerCase(), parseInt(machineUserId)]
    );

    console.log('');
    console.log('✅ Mapping created successfully!');
    console.log('');
    console.log(`   Machine User ID ${machineUserId} → ${personId} (${personType})`);
    console.log('');

    // Ask if they want to create another
    const another = await question('Create another mapping? (yes/no): ');
    
    if (another.toLowerCase() === 'yes') {
      rl.close();
      await createMapping();
    } else {
      console.log('');
      console.log('✅ Done!');
      rl.close();
      await pool.end();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    await pool.end();
  }
}

// Show existing mappings first
async function showMappings() {
  console.log('📋 EXISTING MAPPINGS:');
  console.log('='.repeat(70));
  
  try {
    const result = await pool.query(`
      SELECT 
        machine_user_id,
        person_id,
        person_type,
        created_at
      FROM user_machine_mapping
      ORDER BY machine_user_id
    `);

    if (result.rows.length === 0) {
      console.log('   No mappings found');
    } else {
      console.log('');
      result.rows.forEach(row => {
        console.log(`   Machine ID ${row.machine_user_id} → ${row.person_id} (${row.person_type})`);
      });
    }
    
    console.log('');
    console.log('='.repeat(70));
    console.log('');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function main() {
  await showMappings();
  await createMapping();
}

main().catch(console.error);
