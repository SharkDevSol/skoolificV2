const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findStudentTables() {
  try {
    console.log('🔍 Searching for student-related tables...\n');

    // Get all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    console.log('📊 All tables in database:');
    tables.forEach(t => console.log(`   - ${t.table_name}`));

    console.log('\n📋 Student-related tables:');
    const studentTables = tables.filter(t => 
      t.table_name.toLowerCase().includes('student')
    );
    studentTables.forEach(t => console.log(`   - ${t.table_name}`));

    // Check Student table
    console.log('\n👥 Checking Student table...');
    const students = await prisma.student.findMany({
      take: 5,
      select: {
        id: true,
        studentName: true,
        classId: true
      }
    });

    if (students.length > 0) {
      console.log(`   Found ${students.length} students (showing first 5):`);
      students.forEach(s => {
        console.log(`   ${s.id} → ${s.studentName}`);
      });
    } else {
      console.log('   ⚠️  Student table is empty');
    }

    // Check if there are other tables with student data
    console.log('\n🔍 Checking for other student data sources...');
    
    // Check if there's a students_register or similar table
    const allTables = tables.map(t => t.table_name);
    const possibleTables = allTables.filter(t => 
      t.includes('register') || 
      t.includes('enrollment') ||
      t.includes('admission')
    );

    if (possibleTables.length > 0) {
      console.log('   Found possible student data tables:');
      possibleTables.forEach(t => console.log(`   - ${t}`));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findStudentTables();
