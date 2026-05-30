// Migration: Add shift support for students
module.exports = {
  name: '005_add_student_shift_support',
  description: 'Add shift_id column to students table',
  
  async up(pool) {
    // Add shift_id column to students table if not exists
    await pool.query(`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS shift_id INTEGER
    `);

    console.log('✅ Migration 005: shift_id column added to students table');
  },

  async down(pool) {
    await pool.query(`
      ALTER TABLE students 
      DROP COLUMN IF EXISTS shift_id
    `);
    console.log('✅ Migration 005: shift_id column removed from students');
  }
};
