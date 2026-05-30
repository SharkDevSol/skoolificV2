const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkClassCTable() {
  try {
    console.log('Checking Class C table in classes_schema...\n');

    // Check if table exists
    const tableExists = await pool.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'classes_schema' AND table_name = 'C'
    `);

    if (tableExists.rows.length === 0) {
      console.log('❌ Table classes_schema."C" does NOT exist');
      console.log('\nThis is the problem! The finance module expects a table called "C" in the classes_schema.');
      console.log('\nYou need to:');
      console.log('1. Create the class table in the database');
      console.log('2. Add students to Class C using the student registration system');
      console.log('3. Then generate invoices');
      await pool.end();
      return;
    }

    console.log('✅ Table classes_schema."C" exists\n');

    // Get students from the class table
    const result = await pool.query(`
      SELECT 
        school_id,
        class_id,
        student_name,
        age,
        gender,
        guardian_name,
        guardian_phone
      FROM classes_schema."C"
      WHERE school_id IS NOT NULL AND class_id IS NOT NULL AND student_name IS NOT NULL
      ORDER BY student_name ASC
    `);

    console.log(`Total students in Class C: ${result.rows.length}\n`);

    if (result.rows.length === 0) {
      console.log('❌ No students found in Class C table');
      console.log('\nThe table exists but has no students!');
      console.log('\nYou need to:');
      console.log('1. Go to Create Register → Student');
      console.log('2. Add students to Class C');
      console.log('3. Then come back and generate invoices');
    } else {
      console.log('✅ Students found in Class C:\n');
      result.rows.forEach((student, index) => {
        console.log(`${index + 1}. ${student.student_name}`);
        console.log(`   ID: ${student.school_id}-${student.class_id}`);
        console.log(`   Guardian: ${student.guardian_name || 'N/A'}`);
        console.log(`   Phone: ${student.guardian_phone || 'N/A'}`);
        console.log('');
      });

      console.log(`\n📊 Invoice Generation Calculation:`);
      console.log(`   Students: ${result.rows.length}`);
      console.log(`   Months: 10`);
      console.log(`   Total Invoices to Generate: ${result.rows.length * 10}`);
      console.log(`   Monthly Fee: 1400 Birr`);
      console.log(`   Total Amount: ${result.rows.length * 10 * 1400} Birr`);
      console.log('\n✅ Ready to generate invoices!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkClassCTable();
