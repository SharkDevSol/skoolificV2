// Script to create student_activities table
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function createStudentActivitiesTable() {
  try {
    console.log('Creating student_activities table...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '../database/create_student_activities_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    await pool.query(sql);

    console.log('✅ student_activities table created successfully!');
    console.log('\nTable structure:');
    console.log('- id (SERIAL PRIMARY KEY)');
    console.log('- class_name (VARCHAR)');
    console.log('- student_name (VARCHAR)');
    console.log('- term_number (INTEGER: 1 or 2)');
    console.log('- personal_hygiene (VARCHAR)');
    console.log('- learning_materials_care (VARCHAR)');
    console.log('- time_management (VARCHAR)');
    console.log('- work_independently (VARCHAR)');
    console.log('- obeys_rules (VARCHAR)');
    console.log('- overall_responsibility (VARCHAR)');
    console.log('- social_relation (VARCHAR)');
    console.log('- created_at (TIMESTAMP)');
    console.log('- updated_at (TIMESTAMP)');
    console.log('\nValid values for activity fields: XC (Excellent), G (Good), SI (Improved), NI (Needs Improvement)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating student_activities table:', error);
    process.exit(1);
  }
}

createStudentActivitiesTable();
