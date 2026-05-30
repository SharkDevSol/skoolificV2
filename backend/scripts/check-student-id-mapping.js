const { PrismaClient } = require('@prisma/client');
const pool = require('../config/db');
const prisma = new PrismaClient();

async function checkStudentIdMapping() {
  try {
    console.log('🔍 Checking student ID mapping...\n');

    // Get invoice student IDs
    const invoices = await prisma.invoice.findMany({
      select: {
        studentId: true
      },
      distinct: ['studentId']
    });

    console.log(`📊 Found ${invoices.length} unique student IDs in invoices:`);
    invoices.forEach(inv => console.log(`   - ${inv.studentId}`));

    // Get students from class tables
    console.log('\n📋 Checking classes_schema tables...\n');

    // Get all class tables
    const classesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'classes_schema'
    `);

    for (const row of classesResult.rows) {
      const className = row.table_name;
      
      try {
        const studentsResult = await pool.query(`
          SELECT school_id, student_name 
          FROM classes_schema."${className}"
          LIMIT 5
        `);

        if (studentsResult.rows.length > 0) {
          console.log(`✅ Class: ${className}`);
          console.log(`   Found ${studentsResult.rows.length} students (showing first 5):`);
          studentsResult.rows.forEach(s => {
            console.log(`   ${s.school_id} → ${s.student_name}`);
          });
          console.log('');
        }
      } catch (error) {
        // Skip tables that don't have the expected structure
      }
    }

    // Check if invoice studentIds match any school_ids
    console.log('🔗 Checking if invoice studentIds match school_ids...\n');
    
    for (const inv of invoices) {
      let found = false;
      
      for (const row of classesResult.rows) {
        const className = row.table_name;
        
        try {
          const result = await pool.query(`
            SELECT school_id, student_name 
            FROM classes_schema."${className}"
            WHERE school_id = $1
          `, [inv.studentId]);

          if (result.rows.length > 0) {
            console.log(`✅ Match found!`);
            console.log(`   Invoice studentId: ${inv.studentId}`);
            console.log(`   Class: ${className}`);
            console.log(`   Student name: ${result.rows[0].student_name}`);
            console.log('');
            found = true;
            break;
          }
        } catch (error) {
          // Skip
        }
      }

      if (!found) {
        console.log(`⚠️  No match found for invoice studentId: ${inv.studentId}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkStudentIdMapping();
