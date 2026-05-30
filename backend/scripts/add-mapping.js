require('dotenv').config();
const pool = require('../config/db');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 3) {
  console.log('❌ Usage: node scripts/add-mapping.js <machineUserId> <personType> <personId>');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/add-mapping.js 1 staff khalid');
  console.log('  node scripts/add-mapping.js 2 student student123');
  console.log('');
  process.exit(1);
}

const [machineUserId, personType, personId] = args;

// Validate inputs
if (isNaN(machineUserId)) {
  console.log('❌ Machine User ID must be a number');
  process.exit(1);
}

if (!['student', 'staff'].includes(personType.toLowerCase())) {
  console.log('❌ Person type must be "student" or "staff"');
  process.exit(1);
}

async function addMapping() {
  try {
    console.log('🔗 Adding User Machine Mapping');
    console.log('='.repeat(70));
    console.log('');
    console.log(`   Machine User ID: ${machineUserId}`);
    console.log(`   Person Type: ${personType}`);
    console.log(`   Person ID: ${personId}`);
    console.log('');

    // Create mapping
    const result = await pool.query(
      `INSERT INTO user_machine_mapping (person_id, person_type, machine_user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (machine_user_id) DO UPDATE
       SET person_id = $1, person_type = $2, updated_at = NOW()
       RETURNING *`,
      [personId, personType.toLowerCase(), parseInt(machineUserId)]
    );

    console.log('✅ Mapping created successfully!');
    console.log('');
    console.log(`   Machine User ${machineUserId} → ${personId} (${personType})`);
    console.log('');
    console.log('='.repeat(70));

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addMapping();
