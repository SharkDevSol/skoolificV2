const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skoolific',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function getStaffId() {
  try {
    const result = await pool.query('SELECT id, staff_id, first_name, last_name FROM staff LIMIT 1');
    if (result.rows.length > 0) {
      console.log('Staff ID:', result.rows[0].id);
      console.log('Staff:', result.rows[0].first_name, result.rows[0].last_name);
    } else {
      console.log('No staff found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

getStaffId();
