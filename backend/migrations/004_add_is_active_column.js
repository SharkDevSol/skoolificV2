// Migration: Add is_active column to admin_sub_accounts
module.exports = {
  name: '004_add_is_active_column',
  description: 'Add is_active column for sub-account management',
  
  async up(pool) {
    // Add is_active column if not exists
    await pool.query(`
      ALTER TABLE admin_sub_accounts 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
    `);

    // Set all existing accounts to active
    await pool.query(`
      UPDATE admin_sub_accounts 
      SET is_active = true 
      WHERE is_active IS NULL
    `);

    console.log('✅ Migration 004: is_active column added to admin_sub_accounts');
  },

  async down(pool) {
    await pool.query(`
      ALTER TABLE admin_sub_accounts 
      DROP COLUMN IF EXISTS is_active
    `);
    console.log('✅ Migration 004: is_active column removed');
  }
};
