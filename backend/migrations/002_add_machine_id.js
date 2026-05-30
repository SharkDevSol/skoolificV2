// Migration: Add machine_id column to staff table
module.exports = {
  name: '002_add_machine_id',
  description: 'Add machine_id column for attendance device integration',
  
  async up(pool) {
    // Add machine_id column if not exists
    await pool.query(`
      ALTER TABLE staff 
      ADD COLUMN IF NOT EXISTS machine_id VARCHAR(50)
    `);

    console.log('✅ Migration 002: machine_id column added to staff table');
  },

  async down(pool) {
    await pool.query(`
      ALTER TABLE staff 
      DROP COLUMN IF EXISTS machine_id
    `);
    console.log('✅ Migration 002: machine_id column removed');
  }
};
