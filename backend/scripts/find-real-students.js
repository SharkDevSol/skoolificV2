const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findRealStudents() {
  try {
    console.log('🔍 Searching for real student data...\n');

    // Check all possible student-related tables
    const possibleTables = [
      'students_register',
      'student_registration',
      'student_profile',
      'student_info',
      'students',
      'enrollments',
      'admissions'
    ];

    for (const tableName of possibleTables) {
      try {
        const result = await prisma.$queryRawUnsafe(`
          SELECT * FROM "${tableName}" LIMIT 5
        `);
        
        if (result && result.length > 0) {
          console.log(`✅ Found table: ${tableName}`);
          console.log(`   Columns:`, Object.keys(result[0]));
          console.log(`   Sample data:`, result[0]);
          console.log('');
        }
      } catch (error) {
        // Table doesn't exist, skip
      }
    }

    // Check the main Student table structure
    console.log('📋 Current Student table structure:');
    const studentColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Student'
      ORDER BY ordinal_position
    `;
    
    console.log('   Columns in Student table:');
    studentColumns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    // Show current students
    console.log('\n👥 Current students in Student table:');
    const students = await prisma.student.findMany({
      select: {
        id: true,
        studentName: true
      }
    });
    
    students.forEach(s => {
      console.log(`   ${s.id} → ${s.studentName}`);
    });

    console.log('\n💡 To use real student names:');
    console.log('   1. Update the Student table with real names');
    console.log('   2. Or point to a different table with real student data');
    console.log('   3. Run: UPDATE "Student" SET "studentName" = \'Real Name\' WHERE id = \'student-id\'');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findRealStudents();
