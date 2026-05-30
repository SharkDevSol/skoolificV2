/**
 * Create admin_users table and insert default admin user
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'skoolific',
    password: String(process.env.DB_PASSWORD || '12345678'),
    port: process.env.DB_PORT || 5432,
  });

  try {
    console.log('\n🔧 Creating admin_users table...\n');

    // Create admin_users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(50) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ admin_users table created successfully!\n');

    // Check if admin user already exists
    const existingAdmin = await pool.query(
      'SELECT * FROM admin_users WHERE username = $1',
      ['admin']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('ℹ️  Admin user already exists. Skipping creation.\n');
      console.log('📋 Existing admin user:');
      console.log(`   Username: ${existingAdmin.rows[0].username}`);
      console.log(`   Name: ${existingAdmin.rows[0].name}`);
      console.log(`   Email: ${existingAdmin.rows[0].email || 'N/A'}`);
      console.log(`   Role: ${existingAdmin.rows[0].role}`);
      console.log(`   Active: ${existingAdmin.rows[0].is_active}\n`);
      return;
    }

    // Hash the default password
    const defaultPassword = 'admin123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Insert default admin user
    const result = await pool.query(`
      INSERT INTO admin_users (username, password_hash, name, email, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, name, email, role, created_at
    `, ['admin', passwordHash, 'System Administrator', 'admin@skoolific.com', 'admin']);

    console.log('✅ Default admin user created successfully!\n');
    console.log('📋 Admin User Details:');
    console.log(`   ID: ${result.rows[0].id}`);
    console.log(`   Username: ${result.rows[0].username}`);
    console.log(`   Password: ${defaultPassword}`);
    console.log(`   Name: ${result.rows[0].name}`);
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Role: ${result.rows[0].role}`);
    console.log(`   Created: ${result.rows[0].created_at}\n`);

    console.log('🔐 Login Credentials:');
    console.log(`   Branch Code: MAI`);
    console.log(`   Username: admin`);
    console.log(`   Password: admin123\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createAdminUser();
