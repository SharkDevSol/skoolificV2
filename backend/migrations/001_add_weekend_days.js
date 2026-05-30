// Migration: Add weekend_days column to hr_attendance_time_settings
module.exports = {
  name: '001_add_weekend_days',
  description: 'Add weekend_days column for weekend configuration',
  
  async up(pool) {
    // Add weekend_days column if not exists
    await pool.query(`
      ALTER TABLE hr_attendance_time_settings 
      ADD COLUMN IF NOT EXISTS weekend_days INTEGER[] DEFAULT ARRAY[]::INTEGER[]
    `);

    // Set default weekends (Saturday and Sunday) if empty
    await pool.query(`
      UPDATE hr_attendance_time_settings 
      SET weekend_days = ARRAY[0, 6]
      WHERE weekend_days IS NULL OR weekend_days = ARRAY[]::INTEGER[]
    `);

    console.log('✅ Migration 001: weekend_days column added');
  },

  async down(pool) {
    await pool.query(`
      ALTER TABLE hr_attendance_time_settings 
      DROP COLUMN IF EXISTS weekend_days
    `);
    console.log('✅ Migration 001: weekend_days column removed');
  }
};
