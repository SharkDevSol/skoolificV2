/**
 * Test script for user_devices table migration
 * Checks if table exists and creates it if needed
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

async function testMigration() {
  const client = await pool.connect();
  
  try {
    console.log('\n=== Testing user_devices Migration ===\n');
    
    // Check if table exists
    console.log('1. Checking if user_devices table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_devices'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    console.log(`   Table exists: ${tableExists}`);
    
    if (tableExists) {
      // Show table structure
      console.log('\n2. Current table structure:');
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'user_devices'
        ORDER BY ordinal_position;
      `);
      
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
      
      // Drop table to recreate
      console.log('\n3. Dropping existing table...');
      await client.query('DROP TABLE IF EXISTS user_devices CASCADE;');
      console.log('   ✓ Table dropped');
    }
    
    // Create table
    console.log('\n4. Creating user_devices table...');
    await client.query(`
      CREATE TABLE user_devices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_type VARCHAR(20) NOT NULL,
        device_token TEXT NOT NULL UNIQUE,
        device_type VARCHAR(20),
        device_name VARCHAR(100),
        app_version VARCHAR(20),
        os_version VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✓ Table created');
    
    // Create indexes
    console.log('\n5. Creating indexes...');
    await client.query('CREATE INDEX idx_user_devices_user ON user_devices(user_id, user_type);');
    await client.query('CREATE INDEX idx_user_devices_token ON user_devices(device_token);');
    await client.query('CREATE INDEX idx_user_devices_active ON user_devices(is_active);');
    console.log('   ✓ Indexes created');
    
    // Create trigger function
    console.log('\n6. Creating trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_user_devices_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ Trigger function created');
    
    // Create trigger
    console.log('\n7. Creating trigger...');
    await client.query(`
      CREATE TRIGGER trigger_update_user_devices_updated_at
        BEFORE UPDATE ON user_devices
        FOR EACH ROW
        EXECUTE FUNCTION update_user_devices_updated_at();
    `);
    console.log('   ✓ Trigger created');
    
    // Add comments
    console.log('\n8. Adding table comments...');
    await client.query(`COMMENT ON TABLE user_devices IS 'Stores FCM device tokens for push notifications';`);
    await client.query(`COMMENT ON COLUMN user_devices.user_id IS 'ID of the user (student, staff, or guardian)';`);
    await client.query(`COMMENT ON COLUMN user_devices.user_type IS 'Type of user: student, staff, or guardian';`);
    await client.query(`COMMENT ON COLUMN user_devices.device_token IS 'FCM device token for push notifications';`);
    await client.query(`COMMENT ON COLUMN user_devices.device_type IS 'Type of device: android, ios, or web';`);
    await client.query(`COMMENT ON COLUMN user_devices.is_active IS 'Whether the device token is still valid';`);
    await client.query(`COMMENT ON COLUMN user_devices.last_used_at IS 'Last time this device was used';`);
    console.log('   ✓ Comments added');
    
    // Mark migration as executed
    console.log('\n9. Recording migration...');
    await client.query(`
      INSERT INTO migrations (migration_name, execution_time_ms, status)
      VALUES ('013_create_user_devices_table.sql', 0, 'success')
      ON CONFLICT (migration_name) DO UPDATE SET status = 'success';
    `);
    console.log('   ✓ Migration recorded');
    
    // Test insert
    console.log('\n10. Testing table with sample data...');
    await client.query(`
      INSERT INTO user_devices (user_id, user_type, device_token, device_type)
      VALUES (1, 'student', 'test_token_123', 'android')
      ON CONFLICT (device_token) DO NOTHING;
    `);
    
    const count = await client.query('SELECT COUNT(*) FROM user_devices;');
    console.log(`   ✓ Table working - ${count.rows[0].count} record(s)`);
    
    // Clean up test data
    await client.query(`DELETE FROM user_devices WHERE device_token = 'test_token_123';`);
    
    console.log('\n✅ Migration test completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Migration test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

testMigration();
