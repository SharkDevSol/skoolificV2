// Migration: Add shift-related columns
module.exports = {
  name: '003_add_shift_columns',
  description: 'Add shift_id and shift-related columns for staff',
  
  async up(pool) {
    // Add shift_id column to staff table if not exists
    await pool.query(`
      ALTER TABLE staff 
      ADD COLUMN IF NOT EXISTS shift_id INTEGER
    `);

    console.log('✅ Migration 003: shift columns added');
  },

  async down(pool) {
    await pool.query(`
      ALTER TABLE staff 
      DROP COLUMN IF EXISTS shift_id
    `);
    console.log('✅ Migration 003: shift columns removed');
  }
};
