const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudents() {
  try {
    console.log('Checking students in database...\n');

    // Try to find students table
    const students = await prisma.$queryRaw`
      SELECT id, name, className 
      FROM Student 
      WHERE className = 'C'
      LIMIT 10
    `;

    console.log(`Students in Class C: ${students.length}\n`);

    if (students.length === 0) {
      console.log('❌ No students found in Class C');
      console.log('\nChecking all students...');
      
      const allStudents = await prisma.$queryRaw`
        SELECT id, name, className 
        FROM Student 
        LIMIT 10
      `;
      
      console.log(`\nTotal students in database: ${allStudents.length}`);
      if (allStudents.length > 0) {
        console.log('\nSample students:');
        allStudents.forEach((s, i) => {
          console.log(`${i + 1}. ${s.name} - Class: ${s.className || 'N/A'}`);
        });
      }
    } else {
      console.log('✅ Students found in Class C:\n');
      students.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name}`);
        console.log(`   ID: ${student.id}`);
        console.log('');
      });

      console.log(`\n📊 Invoice Generation Calculation:`);
      console.log(`   Students: ${students.length}`);
      console.log(`   Months: 10`);
      console.log(`   Total Invoices to Generate: ${students.length * 10}`);
      console.log(`   Monthly Fee: 1400 Birr`);
      console.log(`   Total Amount: ${students.length * 10 * 1400} Birr`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudents();
