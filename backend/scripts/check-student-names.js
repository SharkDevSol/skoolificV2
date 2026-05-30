const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudentNames() {
  try {
    console.log('🔍 Checking student names in database...\n');

    // Get all invoices
    const invoices = await prisma.invoice.findMany({
      select: {
        studentId: true
      },
      distinct: ['studentId']
    });

    console.log(`📊 Found ${invoices.length} unique student IDs in invoices\n`);

    // Get all students
    const students = await prisma.student.findMany({
      select: {
        id: true,
        studentName: true
      }
    });

    console.log(`👥 Found ${students.length} students in Student table\n`);

    // Check which invoice studentIds don't have matching Student records
    const studentIds = new Set(students.map(s => s.id));
    const missingStudents = invoices.filter(inv => !studentIds.has(inv.studentId));

    if (missingStudents.length > 0) {
      console.log(`⚠️  WARNING: ${missingStudents.length} student IDs in invoices don't have Student records:\n`);
      missingStudents.forEach(inv => {
        console.log(`   - ${inv.studentId}`);
      });
      console.log('\n💡 These students will show as "Unknown" in the UI');
      console.log('💡 You need to create Student records for these IDs\n');
    } else {
      console.log('✅ All invoice student IDs have matching Student records!\n');
    }

    // Show sample of students with names
    if (students.length > 0) {
      console.log('📋 Sample of students with names:');
      students.slice(0, 5).forEach(s => {
        console.log(`   ${s.id} → ${s.studentName}`);
      });
      if (students.length > 5) {
        console.log(`   ... and ${students.length - 5} more`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudentNames();
